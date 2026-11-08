// NBA box scores from ESPN's game summary endpoint. Each completed game is fetched once and
// cached in the repo (pipeline/cache/nba-box.json) in a compact row format.

import { fetchJSON } from './espn.mjs';

const ROOT = 'https://site.api.espn.com/apis/site/v2/sports';

// Compact row: [athleteId, name, pos, min, pts, reb, oreb, ast, stl, blk, tov, pf, fgm, fga, tpm, tpa, ftm, fta]
export const COLS = ['id', 'name', 'pos', 'min', 'pts', 'reb', 'oreb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta'];

// ESPN keys and labels for the same stat, in case either changes.
const FIELDS = {
  min: ['minutes', 'MIN'],
  pts: ['points', 'PTS'],
  reb: ['rebounds', 'totalRebounds', 'REB'],
  oreb: ['offensiveRebounds', 'OREB'],
  ast: ['assists', 'AST'],
  stl: ['steals', 'STL'],
  blk: ['blocks', 'BLK'],
  tov: ['turnovers', 'TO'],
  pf: ['fouls', 'personalFouls', 'PF'],
  fg: ['fieldGoalsMade-fieldGoalsAttempted', 'FG'],
  tp: ['threePointFieldGoalsMade-threePointFieldGoalsAttempted', '3PT'],
  ft: ['freeThrowsMade-freeThrowsAttempted', 'FT'],
};

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/^\+/, ''));
  return Number.isFinite(n) ? n : 0;
};
const pair = (v) => {
  const [a, b] = String(v ?? '').split('-');
  return [num(a), num(b)];
};

// Pure: ESPN summary JSON → { [teamAbbr]: rows[] }. Players who did not play are skipped.
export function parseBox(summary, norm = (a) => a) {
  const out = {};
  for (const team of summary?.boxscore?.players || []) {
    const abbr = norm(team.team?.abbreviation);
    const block = (team.statistics || [])[0];
    if (!abbr || !block) continue;
    const headers = (block.keys?.length ? block.keys : block.names || block.labels || []).map(String);
    const alt = (block.labels || block.names || []).map(String);
    const idx = {};
    for (const [field, names] of Object.entries(FIELDS)) {
      let i = headers.findIndex((h) => names.includes(h));
      if (i < 0) i = alt.findIndex((h) => names.includes(h));
      idx[field] = i;
    }
    const rows = [];
    for (const a of block.athletes || []) {
      if (a.didNotPlay || !a.stats?.length) continue;
      const s = a.stats;
      const get = (f) => (idx[f] >= 0 ? s[idx[f]] : undefined);
      const min = num(get('min'));
      if (!min) continue;
      const [fgm, fga] = pair(get('fg'));
      const [tpm, tpa] = pair(get('tp'));
      const [ftm, fta] = pair(get('ft'));
      rows.push([
        String(a.athlete?.id ?? a.athlete?.displayName ?? ''),
        a.athlete?.displayName || a.athlete?.shortName || '',
        a.athlete?.position?.abbreviation || '',
        min, num(get('pts')), num(get('reb')), num(get('oreb')), num(get('ast')),
        num(get('stl')), num(get('blk')), num(get('tov')), num(get('pf')),
        fgm, fga, tpm, tpa, ftm, fta,
      ]);
    }
    if (rows.length) out[abbr] = rows;
  }
  return out;
}

// Fetch box scores for completed games not yet in the cache.
export async function updateBoxCache(cache, games, league, { log = console.log, limit = 400 } = {}) {
  const todo = games.filter((g) => g.completed && g.id && !cache[g.id]).slice(0, limit);
  let ok = 0;
  let failed = 0;
  for (const g of todo) {
    try {
      const json = await fetchJSON(`${ROOT}/${league.sportPath}/summary?event=${g.id}`, { tries: 2 });
      const teams = parseBox(json, league.norm);
      if (Object.keys(teams).length === 2) {
        cache[g.id] = { date: g.date, teams };
        ok++;
      } else failed++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  if (todo.length) log(`box scores: ${ok} new, ${failed} failed, ${Object.keys(cache).length} cached`);
  return { ok, failed };
}
