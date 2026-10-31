// ESPN's public (unauthenticated, undocumented) site API. Shapes can drift, so parsing is defensive
// and every field is optional. Only the scoreboard and team news endpoints are used.

import { normAbbr } from './teams.mjs';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export async function fetchJSON(url, { tries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'state-of-the-league/0.1' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function fetchWeek(season, week) {
  const url = `${BASE}/scoreboard?dates=${season}&seasontype=2&week=${week}&limit=100`;
  const json = await fetchJSON(url);
  return (json.events || []).map((e) => parseEvent(e, week)).filter(Boolean);
}

export async function fetchTeamNews(espnTeamId, limit = 6) {
  if (!espnTeamId) return [];
  try {
    const json = await fetchJSON(`${BASE}/news?team=${espnTeamId}&limit=${limit}`, { tries: 2 });
    return (json.articles || []).map((a) => ({
      headline: a.headline || '',
      description: a.description || '',
      published: a.published || null,
    }));
  } catch {
    return [];
  }
}

const LEADER_CATS = {
  passingYards: 'passing', passingLeader: 'passing',
  rushingYards: 'rushing', rushingLeader: 'rushing',
  receivingYards: 'receiving', receivingLeader: 'receiving',
};

function parseLeaders(list, teamIdFilter) {
  const out = [];
  for (const cat of list || []) {
    const kind = LEADER_CATS[cat.name];
    if (!kind) continue;
    for (const l of cat.leaders || []) {
      if (teamIdFilter && l.team?.id && String(l.team.id) !== String(teamIdFilter)) continue;
      const yards = Number.isFinite(l.value) ? l.value : parseInt(String(l.displayValue).match(/(-?\d+)\s*YDS/i)?.[1] ?? '', 10);
      out.push({
        kind,
        name: l.athlete?.displayName || l.athlete?.fullName || '',
        pos: l.athlete?.position?.abbreviation || '',
        yards: Number.isFinite(yards) ? yards : null,
        line: l.displayValue || '',
      });
    }
  }
  return out.filter((l) => l.name);
}

// Pure: one ESPN event → our normalized game record.
export function parseEvent(e, weekHint) {
  const comp = e?.competitions?.[0];
  if (!comp) return null;
  const sides = {};
  for (const c of comp.competitors || []) {
    const side = c.homeAway === 'home' ? 'home' : 'away';
    sides[side] = {
      abbr: normAbbr(c.team?.abbreviation),
      espnId: c.team?.id ? String(c.team.id) : null,
      score: c.score != null && c.score !== '' ? Number(c.score) : null,
      leaders: parseLeaders(c.leaders),
    };
  }
  if (!sides.home || !sides.away) return null;
  // Some feeds put leaders on the competition with a team reference instead.
  if (comp.leaders?.length) {
    for (const side of ['home', 'away']) {
      if (!sides[side].leaders.length) sides[side].leaders = parseLeaders(comp.leaders, sides[side].espnId);
    }
  }
  const status = comp.status?.type || e.status?.type || {};
  const broadcast = (comp.broadcasts || []).flatMap((b) => b.names || [])[0]
    || comp.geoBroadcasts?.[0]?.media?.shortName || '';
  return {
    id: String(e.id ?? comp.id ?? ''),
    week: e.week?.number ?? weekHint ?? null,
    date: comp.date || e.date,
    completed: Boolean(status.completed),
    network: broadcast,
    home: sides.home,
    away: sides.away,
  };
}
