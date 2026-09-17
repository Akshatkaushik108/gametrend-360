// Deliberately synthetic fixture data. Never presented as platform observations.
export const GAMES = [
  { id: 'cs2', name: 'Counter-Strike 2', short: 'Counter-Strike 2', appId: 730, twitchId: '32399', genre: 'FPS', color: '#249a87', viewers: 142000, players: 1120000, channels: 3240, momentum: .17, concentration: .52, tag: 'Community favorite' },
  { id: 'dota2', name: 'Dota 2', short: 'Dota 2', appId: 570, twitchId: '29595', genre: 'MOBA', color: '#8491e0', viewers: 87000, players: 528000, channels: 1820, momentum: .08, concentration: .66, tag: 'Established audience' },
  { id: 'pubg', name: 'PUBG: BATTLEGROUNDS', short: 'PUBG', appId: 578080, twitchId: '493057', genre: 'Battle Royale', color: '#dfad54', viewers: 54000, players: 462000, channels: 1610, momentum: -.06, concentration: .47, tag: 'High player activity' },
  { id: 'apex', name: 'Apex Legends', short: 'Apex Legends', appId: 1172470, twitchId: '511224', genre: 'Battle Royale', color: '#db8292', viewers: 61000, players: 162000, channels: 2190, momentum: .11, concentration: .45, tag: 'Growing steadily' },
  { id: 'marvel', name: 'Marvel Rivals', short: 'Marvel Rivals', appId: 2767030, twitchId: null, genre: 'Hero Shooter', color: '#bc9a57', viewers: 78000, players: 186000, channels: 2110, momentum: .34, concentration: .39, tag: 'Breakout potential' },
  { id: 'rust', name: 'Rust', short: 'Rust', appId: 252490, twitchId: '263490', genre: 'Survival', color: '#bf7955', viewers: 44000, players: 102000, channels: 820, momentum: .21, concentration: .61, tag: 'Creator pick' },
  { id: 'deadlock', name: 'Deadlock', short: 'Deadlock', appId: 1422450, twitchId: null, genre: 'Hero Shooter', color: '#729681', viewers: 23000, players: 38000, channels: 360, momentum: .42, concentration: .28, tag: 'Under the radar' },
  { id: 'elden', name: 'ELDEN RING', short: 'Elden Ring', appId: 1245620, twitchId: '512953', genre: 'RPG', color: '#a39968', viewers: 19500, players: 57000, channels: 640, momentum: .13, concentration: .32, tag: 'Long-tail interest' },
  { id: 'baldurs', name: "Baldur’s Gate 3", short: "Baldur’s Gate 3", appId: 1086940, twitchId: null, genre: 'RPG', color: '#826d9a', viewers: 14800, players: 72000, channels: 420, momentum: -.04, concentration: .26, tag: 'Loyal community' },
  { id: 'stardew', name: 'Stardew Valley', short: 'Stardew Valley', appId: 413150, twitchId: '490744', genre: 'Simulation', color: '#89aa65', viewers: 12100, players: 64000, channels: 470, momentum: .19, concentration: .21, tag: 'Cozy & consistent' },
  { id: 'helldivers', name: 'HELLDIVERS 2', short: 'Helldivers 2', appId: 553850, twitchId: null, genre: 'Action', color: '#819898', viewers: 16700, players: 89000, channels: 590, momentum: .26, concentration: .34, tag: 'On the rise' },
  { id: 'terraria', name: 'Terraria', short: 'Terraria', appId: 105600, twitchId: '31376', genre: 'Survival', color: '#6698b0', viewers: 8600, players: 43000, channels: 310, momentum: .06, concentration: .23, tag: 'Steady discovery' }
];

export const DEMO_END = '2026-09-16';
export const SERIES = GAMES.flatMap((game, index) => Array.from({ length: 60 }, (_, day) => {
  const date = new Date('2026-07-19T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + day);
  const growth = Math.pow(1 + game.momentum, (day - 59) / 7);
  const wave = 1 + .08 * Math.sin(day * .91 + index) + .035 * Math.cos(day * 1.7 + index);
  const viewers = Math.round(game.viewers * growth * wave);
  const players = Math.round(game.players * Math.pow(growth, .42) * (1 + .075 * Math.sin(day * .9 + index + .4)));
  const channels = Math.round(game.channels * Math.pow(growth, .35) * (1 + .06 * Math.sin(day * .8 + index)));
  return { gameId: game.id, date: date.toISOString().slice(0, 10), viewers, players, channels, viewerHours: viewers * 24, channelHours: channels * 24, observedHours: 24, coverage: 1 };
}));

export function summarize(game, days = 7) {
  const rows = SERIES.filter(row => row.gameId === game.id);
  const current = rows.slice(-days);
  const previous = rows.slice(-days * 2, -days);
  const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
  const viewerHours = sum(current, 'viewerHours');
  const channelHours = sum(current, 'channelHours');
  const previousHours = sum(previous, 'viewerHours');
  return { ...game, series: current, viewerHours, channelHours,
    avgViewers: viewerHours / (24 * days),
    avgPlayers: sum(current, 'players') / days,
    avgChannels: channelHours / (24 * days),
    viewersPerChannel: viewerHours / channelHours,
    growth: (viewerHours - previousHours) / previousHours,
    playerGrowth: (sum(current, 'players') - sum(previous, 'players')) / sum(previous, 'players'),
    opportunity: (viewerHours / channelHours) * (1 - game.concentration)
  };
}

export function dateLabel(date, options = {}) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC', ...options });
}
