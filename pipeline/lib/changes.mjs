// What changed since the last refresh — shifts in a team's standing, never game results.
// Each refresh stores a compact snapshot; the next refresh diffs against it and records
// only meaningful events. The site shows the ones newer than your last visit.

const HEAT_LEVEL = { Cold: -2, Cool: -1, Steady: 0, Warm: 1, Hot: 2 };
const KEEP_DAYS = 21;

export function snapshot(conferences) {
  const snap = {};
  for (const c of conferences) {
    for (const d of c.divisions) {
      d.teams.forEach((t, i) => {
        snap[t.abbr] = {
          w: t.w, l: t.l, t: t.t, rank: t.rank, heat: t.heat, place: i + 1,
          division: d.name, streak: t.streak || '', pct: t.pct, seed: t.seed ?? null,
        };
      });
    }
  }
  return snap;
}

const nick = (teams, a) => `The ${teams[a]?.name || a}`;

// Streak milestones worth a line, per league.
const MILESTONES = { nfl: [3, 5, 7, 10], nba: [5, 7, 10, 13, 15] };
const RANK_MOVE = { nfl: 4, nba: 5 };

export function diff(prev, cur, teams, league, at, { skipRank = false } = {}) {
  if (!prev) return [];
  const events = [];
  const add = (abbr, kind, weight, text) => events.push({ at, abbr, kind, weight, text });

  // Division leaders: a new team on top that is strictly ahead of the old leader.
  const divisions = [...new Set(Object.values(cur).map((s) => s.division))];
  for (const d of divisions) {
    const leaderNow = Object.entries(cur).find(([, s]) => s.division === d && s.place === 1)?.[0];
    const leaderBefore = Object.entries(prev).find(([, s]) => s.division === d && s.place === 1)?.[0];
    if (leaderNow && leaderBefore && leaderNow !== leaderBefore && cur[leaderNow].pct > cur[leaderBefore].pct) {
      add(leaderNow, 'lead', 5, `${nick(teams, leaderNow)} took over first place in the ${d}.`);
    }
  }

  for (const [a, s] of Object.entries(cur)) {
    const p = prev[a];
    if (!p) continue;
    const gpNow = s.w + s.l + s.t;
    const gpBefore = p.w + p.l + p.t;

    if (p.l === 0 && p.t === 0 && gpBefore > 0 && (s.l > 0 || s.t > 0)) {
      add(a, 'unbeaten-ended', 6, `${nick(teams, a)} are no longer unbeaten.`);
    }
    if (p.w === 0 && gpBefore > 0 && s.w > 0) {
      add(a, 'first-win', 5, `${nick(teams, a)} finally got their first win.`);
    }

    const dh = (HEAT_LEVEL[s.heat] ?? 0) - (HEAT_LEVEL[p.heat] ?? 0);
    if (s.heat !== p.heat && (Math.abs(dh) >= 2 || s.heat === 'Hot' || s.heat === 'Cold')) {
      const text = s.heat === 'Hot' ? `${nick(teams, a)} are now running hot.`
        : s.heat === 'Cold' ? `${nick(teams, a)} have gone cold.`
          : dh > 0 ? `${nick(teams, a)} have warmed up after a rough stretch.`
            : `${nick(teams, a)} have cooled off.`;
      add(a, 'heat', 3, text);
    }

    const move = (p.rank ?? 0) - (s.rank ?? 0);
    if (!skipRank && p.rank && s.rank && Math.abs(move) >= (RANK_MOVE[league.key] || 4)) {
      add(a, 'rank', 2 + Math.min(2, Math.floor(Math.abs(move) / 4)),
        move > 0 ? `${nick(teams, a)} climbed to No. ${s.rank} in the power rankings.`
          : `${nick(teams, a)} slid to No. ${s.rank} in the power rankings.`);
    }

    if (gpNow > gpBefore && s.streak !== p.streak) {
      const m = /^([WL])(\d+)$/.exec(s.streak);
      const n = m ? Number(m[2]) : 0;
      if (m && (MILESTONES[league.key] || MILESTONES.nfl).includes(n)) {
        add(a, 'streak', m[1] === 'W' ? 2 : 3,
          m[1] === 'W' ? `${nick(teams, a)} have won ${n} straight.` : `${nick(teams, a)} have lost ${n} straight.`);
      }
    }
  }
  return events;
}

export function prune(events, now = new Date()) {
  const cutoff = now.getTime() - KEEP_DAYS * 86400000;
  return events.filter((e) => new Date(e.at).getTime() >= cutoff);
}
