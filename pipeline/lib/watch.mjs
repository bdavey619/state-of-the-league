// Must-watch games: a 0–100 Watch Score for upcoming games.
//
//   Quality     35%  how good both teams are (power rank)
//   Closeness   25%  how close it should be (point differential per game + home edge)
//   Stakes      20%  division lead, seeding, unbeaten runs or long streaks on the line
//   Form        10%  both teams playing well right now
//   Stars       10%  top-ranked players on the floor (NBA; folded into quality for the NFL)
//
// 80+ = Must watch, 65–79 = Worth a look. Every pick carries plain-language reasons.

const HEAT = { Hot: 1, Warm: 0.65, Steady: 0.4, Cool: 0.15, Cold: 0 };
const CFG = {
  nba: { homeEdge: 2.5, marginCap: 14, w: { quality: 0.35, close: 0.25, stakes: 0.2, form: 0.1, stars: 0.1 }, window: 48 },
  nfl: { homeEdge: 1.5, marginCap: 14, w: { quality: 0.45, close: 0.25, stakes: 0.2, form: 0.1, stars: 0 }, window: 24 * 7 },
};

const lastName = (n) => String(n).split(' ').filter((x) => !/^(Jr\.?|Sr\.?|II|III|IV)$/.test(x)).at(-1) || n;

export function scoreGame(g, teams, league, stars = []) {
  const cfg = CFG[league.key];
  const A = teams[g.away.abbr];
  const H = teams[g.home.abbr];
  if (!A || !H) return null;
  const N = league.teamCount;
  const q = (t) => (N - t.rank) / (N - 1);
  const quality = (q(A) + q(H)) / 2 * 0.8 + Math.min(q(A), q(H)) * 0.2; // reward two good teams over one great one

  const margin = Math.abs((H.pdpg - A.pdpg) / 2 + cfg.homeEdge);
  const close = Math.max(0, 1 - margin / cfg.marginCap);

  const tags = [];
  let stakes = 0;
  const sameDiv = A.conf === H.conf && A.div === H.div;
  const sameConf = A.conf === H.conf;
  const gb = Math.abs((A.w - A.l) - (H.w - H.l)) / 2;
  if (sameDiv && Math.min(A.place, H.place) === 1 && gb <= 1.5) {
    stakes = 1; tags.push({ k: 'stakes', t: `${A.conf} ${A.div} lead on the line` });
  } else if (league.key === 'nba' && sameConf && A.seed <= 6 && H.seed <= 6 && Math.abs(A.seed - H.seed) <= 3) {
    stakes = 0.7; tags.push({ k: 'stakes', t: `${A.conf} seeding battle` });
  } else if (sameDiv) {
    stakes = 0.35;
  }
  for (const t of [A, H]) {
    if (t.gp >= 3 && t.l === 0 && t.t === 0) { stakes = Math.max(stakes, 0.85); tags.push({ k: 'stakes', t: `${t.name} unbeaten run on the line` }); }
    const m = /^W(\d+)$/.exec(t.streak || '');
    const big = league.key === 'nba' ? 5 : 3;
    if (m && Number(m[1]) >= big) { stakes = Math.max(stakes, 0.55); tags.push({ k: 'stakes', t: `${t.name} have won ${m[1]} straight` }); }
  }

  const form = (HEAT[A.heat] + HEAT[H.heat]) / 2;

  let starsScore = 0;
  const onFloor = stars.filter((s) => s.team === A.abbr || s.team === H.abbr);
  for (const s of onFloor) starsScore += s.rank <= 10 ? 0.5 : 0.25;
  starsScore = Math.min(1, starsScore);

  const w = cfg.w;
  const score = Math.round(100 * (w.quality * quality + w.close * close + w.stakes * stakes + w.form * form + w.stars * starsScore));

  if (A.rank <= 8 && H.rank <= 8) tags.push({ k: 'quality', t: `Top-8 vs top-8` });
  else if (Math.max(A.rank, H.rank) <= Math.round(N / 2) && quality > 0.65) tags.push({ k: 'quality', t: 'Two winning teams' });
  if (margin <= 2) tags.push({ k: 'close', t: 'Projected coin flip' });
  else if (margin <= 4.5) tags.push({ k: 'close', t: 'Should be close' });
  if (form >= 0.8) tags.push({ k: 'form', t: 'Both teams hot' });
  const best = (abbr) => onFloor.filter((s) => s.team === abbr).sort((a, b) => a.rank - b.rank)[0];
  const sa = best(A.abbr);
  const sh = best(H.abbr);
  if (sa && sh) tags.push({ k: 'stars', t: `${lastName(sa.name)} vs ${lastName(sh.name)}` });
  else if (sa || sh) tags.push({ k: 'stars', t: `${(sa || sh).name}` });

  // Lead with the strongest reasons; at most three.
  const weightOf = { stakes: w.stakes * stakes, close: w.close * close, quality: w.quality * quality, form: w.form * form, stars: w.stars * starsScore };
  const reasons = tags.sort((a, b) => weightOf[b.k] - weightOf[a.k]).map((x) => x.t).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 3);

  return {
    id: g.id,
    kickoff: g.date,
    network: g.network || '',
    away: { abbr: A.abbr, name: A.name, color: A.color, rec: rec(A) },
    home: { abbr: H.abbr, name: H.name, color: H.color, rec: rec(H) },
    score,
    tier: score >= 80 ? 'must' : score >= 65 ? 'worth' : 'other',
    reasons,
  };
}

const rec = (t) => (t.t ? `${t.w}-${t.l}-${t.t}` : `${t.w}-${t.l}`);

// Upcoming games in the league's window, best first. The site hides games that have started.
export function mustWatch(games, teams, league, stars = [], now = new Date()) {
  const cfg = CFG[league.key];
  const horizon = now.getTime() + cfg.window * 3600000;
  const upcoming = games.filter((g) => !g.completed && new Date(g.date).getTime() >= now.getTime() - 3 * 3600000 && new Date(g.date).getTime() <= horizon);
  return upcoming
    .map((g) => scoreGame(g, teams, league, stars))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.kickoff).localeCompare(String(b.kickoff)));
}
