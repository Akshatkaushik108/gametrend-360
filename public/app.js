import { GAMES, SERIES, DEMO_END, summarize, dateLabel } from './data.js';

const icons = {
  logo: '<path d="M4 19V10h4v9zm6 0V4h4v15zm6 0V8h4v11z"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  games: '<path d="M7 7h10c2 0 3 2 3.5 4l1 6c.5 3-2 4-4 1l-2-2h-7l-2 2c-2 3-4.5 2-4-1l1-6C4 9 5 7 7 7Z"/><path d="M6 11v4m-2-2h4m8-2h.01M18 14h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10m-6 0h6v6"/>',
  watchlist: '<path d="M6 4h12v17l-6-4-6 4z"/>',
  reports: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M9 12h6m-6 4h6"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h.01m4 0h.01m4 0h.01"/>',
  twitch: '<path d="M5 3 3 7v13h5v3l4-3h5l5-5V3H5Zm3 3h11v8l-3 3h-4l-3 3v-3H6V6h2Z"/><path d="M11 7v5m5-5v5"/>',
  steam: '<circle cx="16" cy="7" r="5"/><circle cx="16" cy="7" r="2"/><circle cx="7" cy="17" r="3"/><path d="m3 16-3-2m9 1 4-5m-3 8 8-6M7 20l-7-4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 4c3 0 4 2 4 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  compare: '<path d="M6 3v18m12-18v18M3 8h6m6 8h6M4 4h4m8 16h4"/>',
  refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  moon: '<path d="M20 14A9 9 0 0 1 10 3 9 9 0 1 0 20 14Z"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.trend}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const compact = value => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const percent = value => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const cover = game => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
const delta = value => `<span class="delta ${value < 0 ? 'negative' : ''}">${value >= 0 ? '↗' : '↘'} ${percent(value)}</span>`;
function storedList() { try { const ids = JSON.parse(localStorage.getItem('gametrend-watchlist') || '[]'); return Array.isArray(ids) ? ids.filter(id => GAMES.some(g => g.id === id)) : []; } catch { return []; } }
const state = { view: 'overview', days: 7, platform: 'twitch', genre: 'all', query: '', page: 1, sort: 'viewerHours', direction: -1, saved: storedList(), compare: [], chartGames: ['cs2', 'dota2', 'marvel'], live: null, loading: false, status: null };
const app = document.getElementById('app');
const modal = document.getElementById('modal');
const navigation = [['overview', 'Overview', 'overview'], ['games', 'Game explorer', 'games'], ['opportunities', 'Creator opportunities', 'trend'], ['watchlist', 'Watchlist', 'watchlist'], ['reports', 'Power BI reports', 'reports']];
const views = { overview: ['The gaming world, in perspective.', 'Follow the audience. Spot the momentum. Find your next opportunity.'], games: ['Find your next obsession.', 'Explore the games behind the numbers. Compare, filter, and dive deeper.'], opportunities: ['Big potential. Less noise.', 'Discover audience demand beyond the most crowded categories.'], watchlist: ['Your games. A closer look.', 'A personal shortlist, saved in this browser and ready when you are.'], reports: ['A deeper layer of insight.', 'Bring your collected data into Power BI and tell the complete story.'], connections: ['From platforms to perspective.', 'Fetch real observations, check your connections, and build your history.'], methodology: ['Good insights start with context.', 'Know what every number means, where it comes from, and what it leaves out.'] };

function allStats() { return GAMES.map(game => summarize(game, state.days)); }
function filteredStats() {
  return allStats().filter(game => (state.genre === 'all' || game.genre === state.genre) && (state.view !== 'watchlist' || state.saved.includes(game.id)) && (!state.query || game.name.toLowerCase().includes(state.query.toLowerCase())))
    .sort((a, b) => state.direction * (state.sort === 'name' ? a.name.localeCompare(b.name) : a[state.sort] - b[state.sort]));
}

function shell() {
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#overview" aria-label="GameTrend 360 home"><span class="brand-symbol">${icon('logo')}</span><span>gametrend<span class="brand-number">360</span></span></a><div class="workspace-label"><span class="workspace-avatar">G</span><span>Gaming intelligence<small>Personal workspace</small></span><span class="workspace-dot"></span></div><p class="nav-caption">WORKSPACE</p><nav aria-label="Main navigation">${navigation.map(([id, label, glyph]) => `<a class="nav-item" href="#${id}" data-nav="${id}">${icon(glyph)}<span>${label}</span>${id === 'watchlist' ? '<span class="nav-count" id="saved-count">0</span>' : ''}</a>`).join('')}</nav><p class="nav-caption second-caption">RESOURCES</p><nav aria-label="Resources"><a class="nav-item" href="#connections" data-nav="connections">${icon('data')}<span>Data connections</span><span class="tiny-dot"></span></a><a class="nav-item" href="#methodology" data-nav="methodology">${icon('help')}<span>How it works</span></a></nav><div class="sidebar-bottom"><div class="insight-note"><span class="note-icon">${icon('spark')}</span><strong>A little context goes a long way.</strong><p>Great games aren’t always the biggest games. Look beyond the leaderboard.</p><a href="#opportunities">Explore opportunities ${icon('arrow')}</a></div><div class="user-block"><span class="user-avatar">AK</span><span><strong>Akshat’s workspace</strong><small>Independent project</small></span><span class="status-dot"></span></div></div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumb">Workspace ${icon('chevron')} <strong id="breadcrumb-current">Overview</strong></div><div class="topbar-actions"><label class="global-search">${icon('search')}<input id="global-search" type="search" placeholder="Find a game…" aria-label="Find a game"><kbd>/</kbd></label><button class="source-pill" data-action="connections"><span class="amber-dot"></span> Demo workspace ${icon('down')}</button><button class="avatar-button" data-action="about" aria-label="About this workspace">AK</button></div></header><main id="main" tabindex="-1"></main><footer class="site-footer"><span><span class="mini-brand">gametrend 360</span> Built for the curious.</span><span>Independent analytics · Not affiliated with Twitch or Valve <a href="#methodology">About the data ${icon('external')}</a></span></footer></div>`;
  document.getElementById('global-search').addEventListener('input', event => {
    state.query = event.target.value; state.page = 1;
    if (state.view !== 'games') { state.view = 'games'; history.replaceState(null, '', '#games'); }
    renderMain();
  });
}

function header() {
  const [title, subtitle] = views[state.view];
  return `<section class="page-heading"><div><div class="eyebrow">YOUR GAMING INTELLIGENCE HUB</div><h1>${title}</h1><p>${subtitle}</p></div>${['connections', 'methodology', 'reports'].includes(state.view) ? '' : `<div class="heading-actions"><label class="select-button">${icon('calendar')}<select id="period-select" aria-label="Analysis period"><option value="7" ${state.days === 7 ? 'selected' : ''}>Last 7 days</option><option value="14" ${state.days === 14 ? 'selected' : ''}>Last 14 days</option><option value="30" ${state.days === 30 ? 'selected' : ''}>Last 30 days</option></select></label><button class="button button-dark" data-action="export">${icon('download')} Export data</button></div>`}</section>`;
}

function demoNotice() {
  return `<div class="demo-notice"><span>${icon('data')} <strong>Sample-data preview</strong><span class="notice-detail">Explore a simulated ${state.days}-day window ending ${dateLabel(DEMO_END, { year: 'numeric' })}. These are not actual platform statistics.</span></span><a href="#connections">Connect live data ${icon('arrow')}</a></div>`;
}

function sparkline(values, color, fill = false) {
  const min = Math.min(...values) * .9;
  const max = Math.max(...values) * 1.03;
  const points = values.map((value, index) => `${index / (values.length - 1) * 110},${38 - (value - min) / (max - min || 1) * 32}`);
  return `<svg class="sparkline" viewBox="0 0 112 44" aria-hidden="true">${fill ? `<path d="M${points.join(' L')} L110,44 L0,44Z" fill="${color}" opacity=".09"/>` : ''}<path d="M${points.join(' L')}" stroke="${color}" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>`;
}

function metricCards() {
  const stats = allStats();
  const sum = key => stats.reduce((value, game) => value + game[key], 0);
  const daily = key => Array.from({ length: state.days }, (_, index) => stats.reduce((value, game) => value + game.series[index][key], 0));
  const viewerPrevious = stats.reduce((value, game) => value + game.viewerHours / (1 + game.growth), 0);
  const playerPrevious = stats.reduce((value, game) => value + game.avgPlayers / (1 + game.playerGrowth), 0);
  const cards = [
    ['Estimated viewer-hours', compact(sum('viewerHours')), sum('viewerHours') / viewerPrevious - 1, 'Total Twitch attention', 'clock', daily('viewerHours'), '#249a87', 'twitch'],
    ['Avg. concurrent players', compact(sum('avgPlayers')), sum('avgPlayers') / playerPrevious - 1, 'Across tracked Steam games', 'users', daily('players'), '#8491e0', 'steam'],
    ['Avg. live channels', compact(sum('avgChannels')), null, 'Twitch broadcasting supply', 'twitch', daily('channels'), '#d2a44f', 'twitch'],
    ['Games in the picture', `${GAMES.length}`, null, 'A curated cross-platform sample', 'games', null, '#249a87', 'all']
  ];
  return `<section class="metric-grid" aria-label="Key metrics">${cards.map(([label, value, change, caption, glyph, line, color, source]) => `<article class="metric-card"><div class="metric-label">${label}<span class="metric-icon ${source}">${icon(glyph)}</span></div><div class="metric-value">${value}${line ? sparkline(line, color, true) : '<div class="stacked-dots"><span>C</span><span>D</span><span>M</span><span>+9</span></div>'}</div><div class="metric-foot">${change !== null ? delta(change) : `<span class="neutral-tag">${source === 'all' ? '12 tracked' : 'Sample metric'}</span>`}<span>${change !== null ? 'vs. previous period' : caption}</span></div></article>`).join('')}</section>`;
}

function lineChart(games, key, large = false) {
  if (!games.length) return '<div class="empty-chart">Select a game to see its trend.</div>';
  const width = 760, height = large ? 270 : 225, left = 50, right = 16, top = 15, bottom = 32;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const maximum = Math.max(...games.flatMap(game => game.series.map(row => row[key])));
  const magnitude = 10 ** Math.floor(Math.log10(maximum || 1));
  const cap = Math.ceil(maximum / magnitude) * magnitude;
  const y = value => top + chartHeight - value / (cap || 1) * chartHeight;
  const x = index => left + index / (games[0].series.length - 1) * chartWidth;
  const labels = games[0].series;
  const positions = [...new Set([0, Math.floor((labels.length - 1) * .2), Math.floor((labels.length - 1) * .4), Math.floor((labels.length - 1) * .6), Math.floor((labels.length - 1) * .8), labels.length - 1])];
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${key === 'players' ? 'Steam player' : 'Twitch viewer'} trends for ${escapeHtml(games.map(game => game.name).join(', '))}; simulated daily averages"><defs>${games.map(game => `<linearGradient id="area-${game.id}-${large}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${game.color}" stop-opacity=".12"/><stop offset="100%" stop-color="${game.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>${Array.from({ length: 5 }, (_, index) => { const value = cap * index / 4; return `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="#e9eeed" stroke-dasharray="3 4"/><text x="${left - 12}" y="${y(value) + 4}" text-anchor="end">${compact(value)}</text>`; }).join('')}${positions.map(index => `<text x="${x(index)}" y="${height - 7}" text-anchor="${index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}">${dateLabel(labels[index].date)}</text>`).join('')}${games.map(game => {
    const points = game.series.map((row, index) => `${x(index)},${y(row[key])}`);
    return `<path d="M${points.join(' L')} L${x(labels.length - 1)},${y(0)} L${left},${y(0)}Z" fill="url(#area-${game.id}-${large})"/><path d="M${points.join(' L')}" fill="none" stroke="${game.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${game.series.map((row, index) => `<circle class="chart-point" cx="${x(index)}" cy="${y(row[key])}" r="5" fill="${game.color}" tabindex="0"><title>${escapeHtml(game.name)} · ${dateLabel(row.date)} · ${number(row[key])} ${key} (sample)</title></circle>`).join('')}`;
  }).join('')}</svg>`;
}

function audiencePanel() {
  const games = state.chartGames.map(id => summarize(GAMES.find(game => game.id === id), state.days));
  return `<article class="panel audience-panel"><div class="panel-heading"><div><h2>Audience pulse <span class="subtle-label">SAMPLE</span></h2><p>How attention moves across your top games</p></div><div class="segmented" aria-label="Chart platform"><button data-platform="twitch" class="${state.platform === 'twitch' ? 'selected' : ''}" aria-pressed="${state.platform === 'twitch'}">${icon('twitch')} Twitch</button><button data-platform="steam" class="${state.platform === 'steam' ? 'selected' : ''}" aria-pressed="${state.platform === 'steam'}">${icon('steam')} Steam</button></div></div><div class="chart-metric-label">${state.platform === 'twitch' ? 'Average concurrent viewers' : 'Average concurrent players'}</div>${lineChart(games, state.platform === 'twitch' ? 'viewers' : 'players')}<div class="chart-legend">${games.map(game => `<button data-detail="${game.id}"><span style="background:${game.color}"></span>${escapeHtml(game.short)}</button>`).join('')}<button class="chart-edit" data-action="chart-games">Edit games ${icon('down')}</button></div></article>`;
}

function spotlightPanel() {
  const game = allStats().sort((a, b) => b.opportunity - a.opportunity)[0];
  return `<article class="spotlight"><div class="spotlight-heading"><span>${icon('spark')} THE OPPORTUNITY SPOTLIGHT</span><span class="sample-tag">Sample</span></div><img class="spotlight-cover" src="${cover(game)}" alt="${escapeHtml(game.name)} artwork" loading="lazy"><div class="spotlight-content"><span class="opportunity-tag">${icon('trend')} Under the radar</span><h2>${escapeHtml(game.name)}</h2><p>An audience worth exploring.<br>A category with room to grow.</p><div class="spotlight-metrics"><div><strong>${game.viewersPerChannel.toFixed(0)}<small> viewers / channel</small></strong><span>Observed audience-to-supply ratio</span></div>${delta(game.growth)}</div><button class="spotlight-link" data-detail="${game.id}">Explore this opportunity ${icon('arrow')}</button></div></article>`;
}

function tablePanel(full = false) {
  const rows = filteredStats();
  const pageSize = full ? 8 : 5;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * pageSize;
  const sortButton = (label, key) => `<button class="table-sort ${state.sort === key ? 'active' : ''}" data-sort="${key}">${label}<span>${state.sort === key ? (state.direction === -1 ? '↓' : '↑') : '↕'}</span></button>`;
  return `<section class="panel rankings-panel"><div class="panel-heading"><div><h2>${state.view === 'watchlist' ? 'Your saved games' : 'The games making moves'}</h2><p>${state.query ? `Results for “${escapeHtml(state.query)}”` : 'A closer look at audience, activity, and momentum'}</p></div><div class="table-controls">${state.compare.length ? `<button class="button button-soft" data-action="compare">${icon('compare')} Compare (${state.compare.length})</button>` : ''}<label class="genre-select"><select id="genre-select" aria-label="Filter by genre"><option value="all">All genres</option>${[...new Set(GAMES.map(game => game.genre))].sort().map(genre => `<option ${state.genre === genre ? 'selected' : ''}>${genre}</option>`).join('')}</select>${icon('down')}</label></div></div><div class="table-scroll"><table class="game-table"><thead><tr><th class="check-cell"><span class="sr-only">Compare game</span></th><th class="rank-cell">#</th><th>${sortButton('Game', 'name')}</th><th>${sortButton('Viewer-hours', 'viewerHours')}</th><th>${sortButton('Avg. players', 'avgPlayers')}</th><th>${sortButton('Growth', 'growth')}</th><th>Trend</th><th><span class="sr-only">Save game</span></th></tr></thead><tbody>${rows.slice(start, start + pageSize).map((game, index) => `<tr><td><input type="checkbox" aria-label="Compare ${escapeHtml(game.name)}" data-compare="${game.id}" ${state.compare.includes(game.id) ? 'checked' : ''}></td><td class="rank-cell">${String(start + index + 1).padStart(2, '0')}</td><td><button class="game-identity" data-detail="${game.id}"><img src="${cover(game)}" alt="" loading="lazy"><span><strong>${escapeHtml(game.name)}</strong><small>${game.genre}</small></span></button></td><td class="number-cell">${compact(game.viewerHours)}<small>Twitch · estimated</small></td><td class="number-cell">${compact(game.avgPlayers)}<small>Steam</small></td><td>${delta(game.growth)}</td><td>${sparkline(game.series.map(row => row.viewers), game.growth >= 0 ? '#389c83' : '#cf7982')}</td><td><button class="save-button ${state.saved.includes(game.id) ? 'saved' : ''}" data-save="${game.id}" aria-label="${state.saved.includes(game.id) ? 'Unsave' : 'Save'} ${escapeHtml(game.name)}" aria-pressed="${state.saved.includes(game.id)}">${icon('watchlist')}</button></td></tr>`).join('')}</tbody></table></div>${!rows.length ? `<div class="empty-state">${icon(state.view === 'watchlist' ? 'watchlist' : 'search')}<h3>${state.view === 'watchlist' ? 'Your next favorite belongs here.' : 'No games found.'}</h3><p>${state.view === 'watchlist' ? 'Use the bookmark beside a game to start your personal watchlist.' : 'Try another name or clear the genre filter.'}</p><button class="button button-dark" data-action="reset-filters">Explore all games ${icon('arrow')}</button></div>` : ''}<div class="table-footer"><span>Showing ${rows.length ? start + 1 : 0}–${Math.min(start + pageSize, rows.length)} of ${rows.length} games <span class="footer-sample">· Sample data</span></span><div class="pagination"><button data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>${Array.from({ length: pages }, (_, index) => `<button data-page="${index + 1}" class="${state.page === index + 1 ? 'current' : ''}" aria-label="Page ${index + 1}" ${state.page === index + 1 ? 'aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div></section>`;
}

function trendingStrip() {
  const rising = allStats().sort((a, b) => b.growth - a.growth).slice(0, 3);
  return `<section class="rising-section"><div class="section-heading"><div><h2>On our radar</h2><p>Three games with momentum in this sample</p></div><a href="#games">Explore all games ${icon('arrow')}</a></div><div class="rising-grid">${rising.map(game => `<button class="rising-card" data-detail="${game.id}"><img src="${cover(game)}" alt="" loading="lazy"><span class="rising-info"><span class="rising-genre">${game.genre}</span><strong>${escapeHtml(game.name)}</strong><span>${compact(game.avgViewers)} avg. viewers <span class="dot-separator">·</span> ${percent(game.growth)} growth</span></span><span class="rising-arrow">${icon('arrow')}</span></button>`).join('')}</div></section>`;
}

function opportunities() {
  const games = allStats().sort((a, b) => b.opportunity - a.opportunity);
  return `<div class="opportunity-intro"><div>${icon('spark')}<h2>Look for demand. Check the competition.</h2><p>This exploratory ranking weights viewers per channel by audience dispersion. It is a starting point for research, not a prediction of how many viewers you will get.</p></div><a href="#methodology">Read the methodology ${icon('arrow')}</a></div><div class="opportunity-grid">${games.slice(0, 6).map((game, index) => `<article class="opportunity-card"><div class="opportunity-image"><img src="${cover(game)}" alt="${escapeHtml(game.name)} artwork" loading="lazy"><span class="rank-badge">0${index + 1}</span><button class="save-button ${state.saved.includes(game.id) ? 'saved' : ''}" data-save="${game.id}" aria-label="Save ${escapeHtml(game.name)}">${icon('watchlist')}</button></div><div class="opportunity-body"><span class="rising-genre">${game.genre}</span><h2>${escapeHtml(game.name)}</h2><div class="opportunity-stats"><div><strong>${game.viewersPerChannel.toFixed(1)}</strong><span>viewers / channel</span></div><div><strong>${Math.round(game.concentration * 100)}%</strong><span>top-5 audience share</span></div><div><strong>${percent(game.growth)}</strong><span>viewer-hours growth</span></div></div><button class="button button-soft full-width" data-detail="${game.id}">Investigate opportunity ${icon('arrow')}</button></div></article>`).join('')}</div>`;
}

function connections() {
  const status = state.status;
  const live = state.live;
  return `<div class="connection-grid"><article class="panel connection-card"><span class="connection-icon steam">${icon('steam')}</span><span class="connection-badge">No API key needed</span><h2>Steam</h2><p>Current concurrent players for all ${GAMES.length} tracked games, fetched through the official Steam Web API.</p><div class="connection-status"><span class="status-dot"></span>${live ? `${live.steam.filter(row => row.status === 'connected').length} of ${GAMES.length} games retrieved` : 'Ready to fetch'}</div></article><article class="panel connection-card"><span class="connection-icon twitch">${icon('twitch')}</span><span class="connection-badge ${status?.twitch !== 'configured' ? 'needs-setup' : ''}">${status?.twitch === 'configured' ? 'Credentials configured' : 'Setup required'}</span><h2>Twitch</h2><p>Live viewers and active channels for mapped categories. Add your client ID and secret to the local .env file.</p><div class="connection-status"><span class="${status?.twitch === 'configured' ? 'status-dot' : 'amber-dot'}"></span>${status?.twitch === 'configured' ? 'Ready to fetch' : 'Awaiting Twitch credentials'}</div></article></div><section class="panel live-panel"><div class="panel-heading"><div><h2>Live observations <span class="live-tag">REAL DATA</span></h2><p>Current snapshots stay separate from the simulated dashboard history.</p></div><button class="button button-dark" data-action="fetch-live" ${state.loading ? 'disabled' : ''}>${icon('refresh', state.loading ? 'spin' : '')}${state.loading ? 'Fetching platforms…' : 'Fetch live snapshot'}</button></div>${live ? `<div class="live-meta">Collected ${new Date(live.completedAt).toLocaleString()} · ${live.cached ? 'Cached observation' : 'Saved locally'} · UTC timestamps in exports</div><div class="table-scroll"><table class="game-table live-table"><thead><tr><th>Game</th><th>Steam players</th><th>Twitch viewers</th><th>Twitch channels</th><th>Observation status</th></tr></thead><tbody>${GAMES.map(game => { const row = live.steam.find(row => row.gameId === game.id); const tw = live.twitch.games[game.id]; return `<tr><td><strong>${escapeHtml(game.name)}</strong></td><td>${row?.players == null ? 'Unavailable' : number(row.players)}</td><td>${tw ? number(tw.viewers) : '—'}</td><td>${tw ? number(tw.channels) : '—'}</td><td><span class="${row?.status === 'connected' ? 'success-label' : 'error-label'}">Steam ${row?.status === 'connected' ? 'connected' : 'unavailable'}</span><small>Twitch: ${!game.twitchId ? 'mapping pending' : escapeHtml(live.twitch.status)}</small></td></tr>`; }).join('')}</tbody></table></div><p class="live-footnote">${escapeHtml(live.twitch.message)} Steam counts exclude offline players and other platforms. Missing values are not zero.</p>` : `<div class="empty-state live-empty">${icon('data')}<h3>Your history starts with one observation.</h3><p>Fetch a snapshot to see actual platform activity. The server saves each new run locally; repeated requests use a 10-minute cache.</p></div>`}</section><div class="setup-grid"><article class="panel setup-card"><span class="step-number">01</span><h3>Connect Twitch</h3><p>Create an app in the Twitch Developer Console, copy <code>.env.example</code> to <code>.env</code>, and add your client ID and secret. Restart the server.</p><a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer">Twitch Developer Console ${icon('external')}</a><small>Credentials stay on the server. Never paste secrets into website code.</small></article><article class="panel setup-card"><span class="step-number">02</span><h3>Start a collection routine</h3><p>Schedule <code>node server.mjs --collect</code> every 15 minutes using your scheduler. This first version collects on demand; it does not run a background schedule by itself.</p><small>Snapshots append to <code>data/snapshots.jsonl</code>, excluded from Git.</small></article><article class="panel setup-card"><span class="step-number">03</span><h3>Take your data into Power BI</h3><p>Download actual collected observations as CSV. Keep errors and partial Twitch runs visible when building your analytical model.</p><a href="/api/snapshots.csv" download>Download live observations ${icon('download')}</a><small>An export with no observations contains column headers only.</small></article></div>`;
}

function reports() {
  const embedUrl = state.status?.powerBiEmbedUrl;
  return `<section class="report-hero"><div class="powerbi-mark"><span></span><span></span><span></span></div><div><span class="eyebrow">THE NEXT CHAPTER</span><h2>Meet your Power BI workspace.</h2><p>Your website is ready for an embedded report. Collect observations, build your model in Power BI Desktop, and bring your report back here.</p></div><span class="neutral-tag">${embedUrl ? 'Report configured' : 'Ready to connect'}</span></section>${embedUrl ? `<section class="panel embed-panel"><iframe title="GameTrend 360 Power BI report" src="${escapeHtml(embedUrl)}" allowfullscreen></iframe></section>` : `<section class="panel report-placeholder"><div class="placeholder-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><h2>A place for the bigger picture.</h2><p>No Power BI report has been connected yet. This is a setup preview, not a published report.</p><a class="button button-dark" href="/api/snapshots.csv" download>${icon('download')} Download real observations</a></section>`}<div class="setup-grid"><article class="panel setup-card"><span class="step-number">01</span><h3>Build the model</h3><p>Import the live CSV into Power BI Desktop. Set UTC timestamps, keep blank observations as null, and create a game dimension.</p></article><article class="panel setup-card"><span class="step-number">02</span><h3>Publish with intention</h3><p>Use Publish to web only for a model that can be fully public. A private report needs authenticated embedding and appropriate licensing.</p></article><article class="panel setup-card"><span class="step-number">03</span><h3>Add the embed URL</h3><p>Set <code>POWER_BI_EMBED_URL</code> in <code>.env</code> to the generated public <code>https://app.powerbi.com/view?…</code> URL. Restart the server.</p></article></div><a class="documentation-link" href="https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web" target="_blank" rel="noopener noreferrer">Read Microsoft’s embedding requirements ${icon('external')}</a>`;
}

function methodology() {
  const items = [
    ['Simulated history, real functionality', 'All overview, explorer, watchlist, comparison, and opportunity metrics use a deterministic synthetic fixture ending September 16, 2026. They demonstrate interactions and analytical concepts; they are not claims about these games. The live connections page shows only API observations.'],
    ['Estimated viewer-hours', 'In real analysis, integrate viewer counts over adjacent, complete collection intervals: average adjacent viewers × elapsed hours. Reject long gaps and partial runs. The demo fixture represents daily average viewers and multiplies them by 24 hours.'],
    ['Average concurrent players', 'A measure of Steam activity at a moment, averaged over the period. Do not add snapshots and call them unique players, purchases, or copies sold. Real data needs time-weighted averages and coverage checks.'],
    ['Growth over comparable periods', 'Viewer-hours growth compares the selected 7, 14, or 30 days with the immediately preceding window of the same length. The fixture provides 60 days. Steam chart lines show players, while table growth always refers to Twitch viewer-hours.'],
    ['Creator opportunities', 'The exploratory ordering is viewers per live channel × (1 − top-five channel audience share). Concentration values are illustrative fixture assumptions. This is not an official platform score or a prediction of a new creator’s audience.'],
    ['Incomplete data stays incomplete', 'Failed Steam observations remain null. Twitch pagination is deduplicated by stream ID and capped at 50 pages; a cap is explicitly marked partial. Games without a verified Twitch mapping show mapping pending. Collection windows are not simultaneous snapshots.'],
    ['Scope and sampling', 'The tracked list is a curated 12-game sample, not the entire gaming market. Steam excludes offline players and other launchers. Language does not determine audience geography. Sales, revenue, individual watch time, and unique viewers are not measured.'],
    ['Source attribution and storage', 'Artwork is loaded from Steam’s CDN and belongs to its respective owners. Local live snapshots are excluded from version control. Twitch secrets stay server-side. This independent project is not affiliated with Twitch, Valve, or Microsoft. Review source terms before redistribution.']
  ];
  return `<div class="methodology-grid">${items.map(([title, description], index) => `<article class="panel methodology-card"><span class="step-number">${String(index + 1).padStart(2, '0')}</span><h2>${title}</h2><p>${description}</p></article>`).join('')}</div><div class="source-links"><strong>Go straight to the source</strong><a href="https://dev.twitch.tv/docs/api/reference/#get-streams" target="_blank" rel="noopener noreferrer">Twitch API ${icon('external')}</a><a href="https://partner.steamgames.com/doc/webapi/ISteamUserStats#GetNumberOfCurrentPlayers" target="_blank" rel="noopener noreferrer">Steam Web API ${icon('external')}</a><a href="https://learn.microsoft.com/en-us/power-bi/" target="_blank" rel="noopener noreferrer">Power BI ${icon('external')}</a></div>`;
}

function renderMain() {
  document.querySelectorAll('[data-nav]').forEach(element => { const active = element.dataset.nav === state.view; element.classList.toggle('active', active); if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); });
  document.getElementById('saved-count').textContent = state.saved.length;
  document.getElementById('breadcrumb-current').textContent = navigation.find(([id]) => id === state.view)?.[1] || (state.view === 'connections' ? 'Data connections' : 'How it works');
  const analytical = !['connections', 'methodology', 'reports'].includes(state.view);
  let content = '';
  if (state.view === 'overview') content = `${metricCards()}<div class="analysis-grid">${audiencePanel()}${spotlightPanel()}</div>${tablePanel()}${trendingStrip()}`;
  if (state.view === 'games' || state.view === 'watchlist') content = `${state.view === 'games' ? `<div class="explorer-summary"><span>${icon('games')} ${GAMES.length} curated games</span><span>${icon('twitch')} Twitch attention</span><span>${icon('steam')} Steam activity</span><span>${icon('compare')} Select up to 3 games to compare</span></div>` : ''}${tablePanel(true)}`;
  if (state.view === 'opportunities') content = opportunities();
  if (state.view === 'connections') content = connections();
  if (state.view === 'reports') content = reports();
  if (state.view === 'methodology') content = methodology();
  document.getElementById('main').innerHTML = header() + (analytical ? demoNotice() : '') + content;
  document.getElementById('period-select')?.addEventListener('change', event => { state.days = Number(event.target.value); renderMain(); });
  document.getElementById('genre-select')?.addEventListener('change', event => { state.genre = event.target.value; state.page = 1; renderMain(); });
}

function showModal(title, body, wide = false) {
  modal.className = wide ? 'wide-modal' : '';
  modal.innerHTML = `<div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>${body}`;
  if (!modal.open) modal.showModal();
}

function detail(id) {
  const game = summarize(GAMES.find(game => game.id === id), state.days);
  showModal(escapeHtml(game.name), `<div class="detail-hero"><img src="${cover(game)}" alt="${escapeHtml(game.name)} artwork"><div><span class="rising-genre">${game.genre}</span><h3>${escapeHtml(game.tag)}</h3><span class="neutral-tag">Simulated ${state.days}-day analysis</span><button class="button button-soft" data-save="${game.id}">${icon('watchlist')} ${state.saved.includes(id) ? 'Remove from watchlist' : 'Add to watchlist'}</button></div></div><div class="detail-metrics"><div><small>Estimated viewer-hours</small><strong>${compact(game.viewerHours)}</strong></div><div><small>Avg. Steam players</small><strong>${compact(game.avgPlayers)}</strong></div><div><small>Viewer-hours growth</small><strong>${percent(game.growth)}</strong></div><div><small>Viewers per channel</small><strong>${game.viewersPerChannel.toFixed(1)}</strong></div></div><div class="detail-chart"><h3>Twitch audience over time</h3>${lineChart([game], 'viewers', true)}</div><div class="detail-note">${icon('help')} ${Math.round(game.concentration * 100)}% of this sample audience belongs to the top five channels. A high ratio does not guarantee discoverability for new creators.</div><div class="modal-footer"><span>Sample data · Not a platform performance claim</span><a href="https://store.steampowered.com/app/${game.appId}/" target="_blank" rel="noopener noreferrer">View on Steam ${icon('external')}</a></div>`, true);
}

function compare() {
  if (state.compare.length < 2) return toast('Select at least 2 games to compare.');
  const games = state.compare.map(id => summarize(GAMES.find(game => game.id === id), state.days));
  showModal('A side-by-side perspective', `<p class="modal-description">Simulated ${state.days}-day Twitch audience and Steam activity.</p>${lineChart(games, 'viewers', true)}<div class="comparison-grid" style="--columns:${games.length}">${games.map(game => `<article><img src="${cover(game)}" alt=""><h3 style="color:${game.color}">${escapeHtml(game.short)}</h3><dl><dt>Estimated viewer-hours</dt><dd>${compact(game.viewerHours)}</dd><dt>Avg. Steam players</dt><dd>${compact(game.avgPlayers)}</dd><dt>Viewers / channel</dt><dd>${game.viewersPerChannel.toFixed(1)}</dd><dt>Viewer-hours growth</dt><dd>${percent(game.growth)}</dd></dl></article>`).join('')}</div>`, true);
}

function toast(message) {
  const element = document.getElementById('toast'); element.textContent = message; element.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('visible'), 4200);
}

function exportDemo() {
  const rows = filteredStats();
  const csv = ['source,period_days,period_end,game,steam_app_id,estimated_viewer_hours,average_steam_players,average_live_channels,viewer_hours_growth_pct', ...rows.map(game => ['SIMULATED_DEMO', state.days, DEMO_END, `"${game.name.replaceAll('"', '""')}"`, game.appId, Math.round(game.viewerHours), Math.round(game.avgPlayers), Math.round(game.avgChannels), (game.growth * 100).toFixed(2)].join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `gametrend-DEMO-${state.days}days.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${rows.length} games. CSV is labeled SIMULATED_DEMO.`);
}

async function fetchLive() {
  if (state.loading) return;
  state.loading = true; renderMain();
  try {
    const response = await fetch('/api/live');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to fetch live data');
    state.live = data;
    const count = data.steam.filter(row => row.status === 'connected').length;
    toast(count ? `Fetched Steam observations for ${count} games.` : 'Platforms could not be reached. Missing values are shown explicitly.');
  } catch (error) { toast(error.message); }
  finally { state.loading = false; if (state.view === 'connections') renderMain(); }
}

document.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.dataset.detail) return detail(target.dataset.detail);
  if (target.dataset.save) {
    const id = target.dataset.save;
    const saved = state.saved.includes(id);
    state.saved = saved ? state.saved.filter(value => value !== id) : [...state.saved, id];
    try { localStorage.setItem('gametrend-watchlist', JSON.stringify(state.saved)); } catch { toast('Browser storage is unavailable. This watchlist will last for this session.'); }
    renderMain();
    if (modal.open) detail(id);
    toast(saved ? 'Removed from your watchlist.' : 'Added to your watchlist.');
    return;
  }
  if (target.dataset.platform) { state.platform = target.dataset.platform; renderMain(); return; }
  if (target.dataset.sort) { state.direction = state.sort === target.dataset.sort ? -state.direction : target.dataset.sort === 'name' ? 1 : -1; state.sort = target.dataset.sort; state.page = 1; renderMain(); return; }
  if (target.dataset.page) { state.page = Number(target.dataset.page); renderMain(); return; }
  switch (target.dataset.action) {
    case 'connections': location.hash = 'connections'; break;
    case 'export': exportDemo(); break;
    case 'compare': compare(); break;
    case 'close-modal': modal.close(); break;
    case 'fetch-live': fetchLive(); break;
    case 'reset-filters': state.genre = 'all'; state.query = ''; document.getElementById('global-search').value = ''; location.hash = 'games'; if (state.view === 'games') renderMain(); break;
    case 'about': showModal('Made for a curious gaming world.', '<div class="about-body"><div class="brand-symbol">' + icon('logo') + '</div><h3>GameTrend 360</h3><p>A personal data analytics project by Akshat. Built to connect Twitch audience demand with Steam player activity, with an honest distinction between observed data and sample analysis.</p><p>Version 0.1 · HTML, CSS, JavaScript & Node.js</p><a href="#methodology" data-action="close-modal">Explore the methodology →</a></div>'); break;
    case 'chart-games': showModal('Choose your perspective', `<p class="modal-description">Select up to three games for the audience pulse chart.</p><div class="chart-picker">${GAMES.map(game => `<label><input type="checkbox" data-chart-game="${game.id}" ${state.chartGames.includes(game.id) ? 'checked' : ''}><span style="background:${game.color}"></span>${escapeHtml(game.name)}</label>`).join('')}</div><button class="button button-dark full-width" data-action="close-modal">Done ${icon('check')}</button>`); break;
  }
});
document.addEventListener('change', event => {
  const id = event.target.dataset.compare;
  if (id) {
    if (event.target.checked && state.compare.length === 3) { event.target.checked = false; toast('Compare up to 3 games at a time.'); return; }
    state.compare = event.target.checked ? [...state.compare, id] : state.compare.filter(value => value !== id); renderMain();
  }
  const chartId = event.target.dataset.chartGame;
  if (chartId) {
    if (event.target.checked && state.chartGames.length === 3) { event.target.checked = false; toast('Uncheck a game before adding another.'); return; }
    if (!event.target.checked && state.chartGames.length === 1) { event.target.checked = true; toast('Keep at least one game in the chart.'); return; }
    state.chartGames = event.target.checked ? [...state.chartGames, chartId] : state.chartGames.filter(value => value !== chartId); renderMain();
  }
});
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !modal.open) { event.preventDefault(); document.getElementById('global-search').focus(); } });
modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
function navigate() { const view = location.hash.slice(1); if (view === 'main') { document.getElementById('main').focus(); return; } state.view = views[view] ? view : 'overview'; state.page = 1; state.query = ''; state.genre = 'all'; document.getElementById('global-search').value = ''; if (modal.open) modal.close(); renderMain(); window.scrollTo({ top: 0 }); }
window.addEventListener('hashchange', navigate);
shell(); navigate();
fetch('/api/status').then(response => { if (!response.ok) throw new Error('Status unavailable'); return response.json(); }).then(status => { state.status = status; if (['connections', 'reports'].includes(state.view)) renderMain(); }).catch(() => { toast('Live backend is unavailable. Sample analysis remains available.'); });
