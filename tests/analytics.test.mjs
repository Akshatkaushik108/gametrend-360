import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, SERIES, DEMO_END, summarize } from '../public/data.js';
import { snapshotsToCsv, createServer } from '../server.mjs';

test('fixture has two complete 30-day windows per game with unique dates', () => {
  assert.equal(new Set(GAMES.map(game => game.id)).size, GAMES.length);
  assert.equal(new Set(GAMES.map(game => game.appId)).size, GAMES.length);
  for (const game of GAMES) {
    const rows = SERIES.filter(row => row.gameId === game.id);
    assert.equal(rows.length, 60);
    assert.equal(new Set(rows.map(row => row.date)).size, 60);
    assert.equal(rows.at(-1).date, DEMO_END);
    assert.ok(rows.every(row => row.players >= 0 && row.channels > 0 && row.viewers >= 0));
  }
});

test('metrics use period totals and do not sum concurrent players as unique players', () => {
  for (const days of [7, 14, 30]) {
    const game = GAMES[0];
    const result = summarize(game, days);
    const current = SERIES.filter(row => row.gameId === game.id).slice(-days);
    assert.equal(result.avgPlayers, current.reduce((sum, row) => sum + row.players, 0) / days);
    assert.equal(result.avgViewers, result.viewerHours / (days * 24));
    assert.equal(result.viewersPerChannel, result.viewerHours / result.channelHours);
    assert.ok(Number.isFinite(result.growth));
    assert.ok(Number.isFinite(result.playerGrowth));
  }
});

test('CSV preserves missing live counts, valid zeroes, and source provenance', () => {
  const csv = snapshotsToCsv([{ startedAt: '2026-09-17T12:00:00Z', completedAt: '2026-09-17T12:01:00Z', steam: [
    { gameId: 'cs2', players: null, status: 'error', observedAt: '2026-09-17T12:00:01Z' },
    { gameId: 'dota2', players: 0, status: 'connected', observedAt: '2026-09-17T12:00:02Z' }
  ], twitch: { status: 'not_configured', games: {} } }]);
  const [header, missing, zero] = csv.split('\r\n');
  assert.equal(header.split(',').length, 11);
  assert.equal(missing.split(',')[0], 'live');
  assert.equal(missing.split(',')[6], '');
  assert.equal(zero.split(',')[6], '0');
  assert.equal(missing.split(',')[8], '');
  assert.equal(missing.split(',')[10], 'not_configured');
  assert.equal(snapshotsToCsv([]).split('\r\n').length, 1);
});

test('CSV preserves partial Twitch status and does not invent mappings', () => {
  const csv = snapshotsToCsv([{ startedAt: 'start', completedAt: 'end', steam: [
    { gameId: 'cs2', players: 123, status: 'connected', observedAt: 'time' },
    { gameId: 'marvel', players: 456, status: 'connected', observedAt: 'time' }
  ], twitch: { status: 'partial', games: { cs2: { viewers: 200, channels: 5 } } } }]);
  const rows = csv.split('\r\n').slice(1).map(row => row.split(','));
  assert.deepEqual(rows[0].slice(8), ['200', '5', 'partial']);
  assert.deepEqual(rows[1].slice(8), ['', '', 'unmapped']);
});

test('HTTP serves the app without exposing private files or credentials', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /GameTrend 360/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.deepEqual(Object.keys(status).sort(), ['cacheMinutes', 'cachedAt', 'powerBiEmbedUrl', 'steam', 'twitch'].sort());
    for (const file of ['/.env', '/server.mjs', '/data/snapshots.jsonl', '/.git/config', '/%2e%2e%5c.env']) {
      const response = await fetch(base + file);
      assert.ok([403, 404].includes(response.status), file);
    }
    assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
    assert.equal((await fetch(`${base}/api/live`, { method: 'POST' })).status, 405);
    const head = await fetch(base, { method: 'HEAD' });
    assert.equal(await head.text(), '');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
