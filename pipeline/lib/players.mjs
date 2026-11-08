// Player season averages from cached box scores, and a "dominance" ranking by Game Score
// (John Hollinger's single-number box score rating, averaged per game).

import { COLS } from './boxscore.mjs';

const I = Object.fromEntries(COLS.map((c, i) => [c, i]));
const r1 = (n) => Math.round(n * 10) / 10;

export function gameScore(row) {
  const g = (k) => row[I[k]];
  return g('pts') + 0.4 * g('fgm') - 0.7 * g('fga') - 0.4 * (g('fta') - g('ftm'))
    + 0.7 * g('oreb') + 0.3 * (g('reb') - g('oreb')) + g('stl') + 0.7 * g('ast') + 0.7 * g('blk')
    - 0.4 * g('pf') - g('tov');
}

// boxCache: { gameId: { date, teams: { abbr: rows } } }; teamGames: abbr → games played.
export function aggregatePlayers(boxCache, teamGames) {
  const by = {};
  const entries = Object.entries(boxCache).sort((a, b) => String(a[1].date).localeCompare(String(b[1].date)));
  for (const [, game] of entries) {
    const abbrs = Object.keys(game.teams);
    for (const abbr of abbrs) {
      const opp = abbrs.find((a) => a !== abbr);
      for (const row of game.teams[abbr]) {
        const id = row[I.id];
        const p = (by[id] ||= { id, name: row[I.name], pos: row[I.pos], team: abbr, games: [] });
        p.team = abbr; // latest team, in case of a trade
        p.name = row[I.name] || p.name;
        p.games.push({ date: game.date, opp, row, gs: gameScore(row) });
      }
    }
  }
  return Object.values(by).map((p) => {
    const n = p.games.length;
    const sum = (k) => p.games.reduce((s, g) => s + g.row[I[k]], 0);
    const pts = sum('pts');
    const tsa = 2 * (sum('fga') + 0.44 * sum('fta'));
    const last5 = p.games.slice(-5);
    const gs = p.games.reduce((s, g) => s + g.gs, 0) / n;
    const gs5 = last5.reduce((s, g) => s + g.gs, 0) / last5.length;
    const latest = p.games.at(-1);
    return {
      id: p.id, name: p.name, pos: p.pos, team: p.team, gp: n,
      teamGp: teamGames[p.team] || n,
      mpg: r1(sum('min') / n), ppg: r1(pts / n), rpg: r1(sum('reb') / n), apg: r1(sum('ast') / n),
      spg: r1(sum('stl') / n), bpg: r1(sum('blk') / n),
      ts: tsa ? Math.round((pts / tsa) * 1000) / 10 : 0,
      gs: r1(gs), gs5: r1(gs5),
      latest: latest ? { pts: latest.row[I.pts], reb: latest.row[I.reb], ast: latest.row[I.ast], opp: latest.opp, date: latest.date } : null,
    };
  });
}

// Qualified = played in at least 60% of the team's games (and 3+ games).
export function qualified(players) {
  return players.filter((p) => p.gp >= 3 && p.gp >= 0.6 * p.teamGp);
}

export function dominanceRanking(players, n = 15) {
  return qualified(players)
    .sort((a, b) => b.gs - a.gs || b.ppg - a.ppg)
    .slice(0, n)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name, pos: p.pos, team: p.team, gp: p.gp,
      ppg: p.ppg, rpg: p.rpg, apg: p.apg, ts: p.ts, gs: p.gs,
      // Heating up / cooling off: last five games vs the season, by Game Score.
      trend: p.gp >= 6 ? (p.gs5 - p.gs >= 4 ? 'up' : p.gs - p.gs5 >= 4 ? 'down' : 'flat') : 'flat',
    }));
}

// Player-to-watch candidates for a team's storyline: best by Game Score, with real averages.
export function teamCandidates(players, abbr, n = 4) {
  return players
    .filter((p) => p.team === abbr && p.gp >= 2)
    .sort((a, b) => b.gs - a.gs)
    .slice(0, n);
}
