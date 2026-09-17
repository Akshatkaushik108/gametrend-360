import http from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from './public/data.js';

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  for (const line of (await readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const hasTwitch = Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
let twitchToken;
let cached;
let inFlight;
const cacheMs = 10 * 60 * 1000;

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Platform returned HTTP ${response.status}`);
  return response.json();
}

async function getTwitchToken() {
  if (twitchToken && twitchToken.expires > Date.now()) return twitchToken.value;
  const data = await requestJson('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' })
  });
  if (!data.access_token) throw new Error('Twitch did not return an access token');
  twitchToken = { value: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return twitchToken.value;
}

async function collectTwitch() {
  if (!hasTwitch) return { status: 'not_configured', message: 'Add Twitch credentials to .env to enable live viewers.', games: {} };
  try {
    const token = await getTwitchToken();
    const headers = { Authorization: `Bearer ${token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID };
    const mapped = GAMES.filter(game => game.twitchId);
    let cursor = '';
    let pages = 0;
    const seen = new Set();
    const games = Object.fromEntries(mapped.map(game => [game.id, { viewers: 0, channels: 0 }]));
    const ids = new Map(mapped.map(game => [game.twitchId, game.id]));
    do {
      const params = new URLSearchParams({ first: '100' });
      for (const game of mapped) params.append('game_id', game.twitchId);
      if (cursor) params.set('after', cursor);
      const data = await requestJson(`https://api.twitch.tv/helix/streams?${params}`, { headers });
      if (!Array.isArray(data.data)) throw new Error('Unexpected Twitch response');
      for (const stream of data.data) {
        if (seen.has(stream.id) || !ids.has(stream.game_id)) continue;
        seen.add(stream.id);
        const game = games[ids.get(stream.game_id)];
        game.viewers += stream.viewer_count;
        game.channels++;
      }
      cursor = data.pagination?.cursor || '';
      pages++;
    } while (cursor && pages < 50);
    return { status: cursor ? 'partial' : 'connected', games, pages,
      message: cursor ? 'Collection capped at 50 pages; totals are partial.' : 'Observed live streams. Pagination can miss streams as rankings change.' };
  } catch (error) {
    twitchToken = null;
    return { status: 'error', games: {}, message: error.message };
  }
}

export async function collectLive() {
  if (cached && Date.now() - Date.parse(cached.completedAt) < cacheMs) return { ...cached, cached: true };
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const startedAt = new Date().toISOString();
    // Three concurrent Steam requests, rather than bursting the whole catalog.
    const steam = [];
    const twitchPromise = collectTwitch();
    for (let index = 0; index < GAMES.length; index += 3) {
      const batch = await Promise.all(GAMES.slice(index, index + 3).map(async game => {
        try {
          const data = await requestJson(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${game.appId}`);
          if (data.response?.result !== 1 || !Number.isFinite(data.response.player_count) || data.response.player_count < 0) throw new Error('Player count unavailable');
          return { gameId: game.id, players: data.response.player_count, observedAt: new Date().toISOString(), status: 'connected' };
        } catch (error) {
          return { gameId: game.id, players: null, observedAt: new Date().toISOString(), status: 'error', message: error.message };
        }
      }));
      steam.push(...batch);
    }
    const twitch = await twitchPromise;
    const result = { source: 'live', startedAt, completedAt: new Date().toISOString(), steam, twitch, cached: false };
    await mkdir(path.join(root, 'data'), { recursive: true });
    await appendFile(path.join(root, 'data', 'snapshots.jsonl'), `${JSON.stringify(result)}\n`);
    cached = result;
    return result;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}

export function snapshotsToCsv(snapshots) {
  const header = 'source,run_started_at,run_completed_at,observed_at,game_id,steam_app_id,steam_players,steam_status,twitch_viewers,twitch_channels,twitch_status';
  const rows = snapshots.flatMap(run => run.steam.map(row => {
    const game = GAMES.find(game => game.id === row.gameId);
    const twitch = run.twitch.games[row.gameId];
    return ['live', run.startedAt, run.completedAt, row.observedAt, row.gameId, game?.appId ?? '', row.players ?? '', row.status,
      twitch?.viewers ?? '', twitch?.channels ?? '', !game?.twitchId ? 'unmapped' : run.twitch.status].join(',');
  }));
  return [header, ...rows].join('\r\n');
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://shared.akamai.steamstatic.com data:; connect-src 'self'; frame-src https://app.powerbi.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Method not allowed' });
      if (url.pathname === '/api/status') {
        const raw = process.env.POWER_BI_EMBED_URL || '';
        let embedUrl = '';
        try { const parsed = new URL(raw); if (parsed.origin === 'https://app.powerbi.com' && parsed.pathname === '/view') embedUrl = parsed.href; } catch {}
        return json(200, { steam: 'available', twitch: hasTwitch ? 'configured' : 'not_configured', powerBiEmbedUrl: embedUrl, cachedAt: cached?.completedAt || null, cacheMinutes: 10 });
      }
      if (url.pathname === '/api/live') return json(200, await collectLive());
      if (url.pathname === '/api/snapshots.csv') {
        let snapshots = [];
        try { snapshots = (await readFile(path.join(root, 'data', 'snapshots.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="gametrend-live-snapshots.csv"', 'Cache-Control': 'no-store' });
        return res.end(snapshotsToCsv(snapshots));
      }
      if (url.pathname.startsWith('/api/')) return json(404, { error: 'Unknown API endpoint' });
      const publicRoot = path.join(root, 'public');
      const file = path.resolve(publicRoot, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (!file.startsWith(publicRoot + path.sep)) return json(403, { error: 'Forbidden' });
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      json(error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Not found' : 'Unable to complete request. Check server connectivity and writable data directory.' });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--collect')) {
    const result = await collectLive();
    console.log(JSON.stringify({ completedAt: result.completedAt, steamSuccesses: result.steam.filter(row => row.status === 'connected').length, twitch: result.twitch.status }));
    if (!result.steam.some(row => row.status === 'connected') && result.twitch.status !== 'connected') process.exitCode = 1;
  } else {
    const server = createServer();
    server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log(`GameTrend 360 running at http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3000}`));
  }
}
