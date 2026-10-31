// Pure transforms: normalized games → per-team season model. No network, easy to test.

import { NFL, divisionsOf } from './leagues.mjs';
import { heatFromGames, heatLabel, heatLabelGames, heatScore } from './heat.mjs';

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
const gameTag = (g) => (g.week ? `Wk ${g.week}` : dayFmt.format(new Date(g.date)));

function blankTeam(abbr, league) {
  return {
    abbr, ...league.teams[abbr], espnId: null,
    w: 0, l: 0, t: 0, pf: 0, pa: 0,
    games: [], // completed, chronological
    next: null,
    leaders: {}, // name → { name, pos, kinds:Set, total, games, lastLine }
  };
}

export function seasonState(games) {
  const completed = games.filter((g) => g.completed);
  const pending = games.filter((g) => !g.completed);
  const lastWeek = Math.max(0, ...completed.map((g) => g.week || 0));
  const currentWeek = pending.length ? Math.min(...pending.map((g) => g.week || 99)) : lastWeek;
  const lastDate = completed.map((g) => g.date).sort().at(-1) || null;
  return { lastWeek, currentWeek: Math.max(currentWeek, 1), lastCompletedDate: lastDate, gamesPlayed: completed.length };
}

export function buildTeams(games, league = NFL) {
  const teams = Object.fromEntries(Object.keys(league.teams).map((a) => [a, blankTeam(a, league)]));
  const sorted = [...games].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const seen = new Set();

  for (const g of sorted) {
    if (g.id && seen.has(g.id)) continue;
    if (g.id) seen.add(g.id);
    for (const [me, them, home] of [[g.home, g.away, true], [g.away, g.home, false]]) {
      const team = teams[me.abbr];
      if (!team) continue;
      team.espnId = team.espnId || me.espnId;
      if (!g.completed) {
        if (!team.next) team.next = { opp: them.abbr, home, kickoff: g.date, network: g.network || '', gameId: g.id };
        continue;
      }
      const result = me.score > them.score ? 'W' : me.score < them.score ? 'L' : 'T';
      team[result === 'W' ? 'w' : result === 'L' ? 'l' : 't'] += 1;
      team.pf += me.score;
      team.pa += them.score;
      team.games.push({ id: g.id, week: g.week, date: g.date, opp: them.abbr, home, result, for: me.score, against: them.score });
      for (const l of me.leaders) {
        const p = (team.leaders[l.name] ||= { name: l.name, pos: l.pos, kinds: new Set(), total: 0, games: 0, lastLine: '', lastDate: '' });
        p.kinds.add(l.kind);
        p.total += l.value || 0;
        p.games += 1;
        if (String(g.date) >= p.lastDate) {
          p.lastLine = `${l.line} ${l.kind === 'points' || l.kind === 'rebounds' || l.kind === 'assists' ? l.kind + ' ' : ''}vs ${them.abbr} (${gameTag(g)})`;
          p.lastDate = String(g.date);
        }
      }
    }
  }

  for (const team of Object.values(teams)) {
    const gp = team.w + team.l + team.t;
    team.gp = gp;
    team.pct = gp ? (team.w + 0.5 * team.t) / gp : 0;
    team.pd = team.pf - team.pa;
    team.pdpg = gp ? Math.round((team.pd / gp) * 10) / 10 : 0;
    if (league.form === 'games') {
      team.lastN = team.games.slice(-(league.formN || 10)).map((g) => ({ ...g, tag: gameTag(g) }));
      const w = team.lastN.filter((g) => g.result === 'W').length;
      team.lastNRecord = `${w}-${team.lastN.length - w}`;
      team.heatScore = heatFromGames(team.lastN);
      team.heat = heatLabelGames(team.heatScore);
    } else {
      // Last three calendar weeks ending with this team's latest completed game; gaps are byes.
      const end = team.games.at(-1)?.week || 0;
      team.last3 = [end - 2, end - 1, end].map((wk) => {
        const g = team.games.find((x) => x.week === wk);
        return g ? { week: wk, result: g.result, for: g.for, against: g.against, opp: g.opp, home: g.home } : { week: wk, result: 'BYE' };
      }).filter((g) => g.week > 0);
      team.heatScore = heatScore(team.last3.length === 3 ? team.last3 : [null, ...team.last3].slice(-3));
      team.heat = heatLabel(team.heatScore);
    }
    team.streak = streak(team.games);
    team.expectedWins = pythag(team.pf, team.pa, gp, league.key === 'nba' ? 14 : 2.37);
    team.leaderList = Object.values(team.leaders)
      .map((p) => ({ ...p, kinds: [...p.kinds], perGame: p.games ? Math.round((p.total / p.games) * 10) / 10 : 0 }))
      .sort((a, b) => b.games - a.games || b.total - a.total)
      .slice(0, 5);
  }
  return teams;
}

function streak(games) {
  if (!games.length) return '';
  const last = games.at(-1).result;
  let n = 0;
  for (let i = games.length - 1; i >= 0 && games[i].result === last; i--) n++;
  return `${last}${n}`;
}

function pythag(pf, pa, gp, e) {
  if (!gp || (!pf && !pa)) return 0;
  return Math.round((gp * pf ** e / (pf ** e + pa ** e)) * 10) / 10;
}

// Division order (and conference seeds) with a simple tiebreak: win pct, then point
// differential. Official tiebreakers are more involved; good enough for a glanceable page.
const order = (a, b) => b.pct - a.pct || b.pd - a.pd || a.abbr.localeCompare(b.abbr);

export function arrange(teams, league = NFL) {
  return league.conferences.map((c) => {
    const confTeams = Object.values(teams).filter((t) => t.conf === c.abbr).sort(order);
    confTeams.forEach((t, i) => { t.seed = i + 1; });
    return {
      ...c,
      divisions: divisionsOf(league, c.abbr).map((d) => {
        const list = confTeams.filter((t) => t.div === d).sort(order);
        list.forEach((t, i) => { t.place = i + 1; });
        return { name: `${c.abbr} ${d}`, teams: list };
      }),
    };
  });
}

// League-wide context a single team's numbers can't show on their own.
export function leagueNotes(teams, league = NFL) {
  const all = Object.values(teams).filter((t) => t.gp > 0);
  const notes = {};
  const add = (abbr, s) => (notes[abbr] ||= []).push(s);
  const L = league.name;
  if (league.key === 'nba') {
    const byPd = [...all].sort((a, b) => b.pdpg - a.pdpg);
    if (byPd[0]) add(byPd[0].abbr, `Best point differential per game in the ${L} (${signed(byPd[0].pdpg)}).`);
    if (byPd.at(-1)) add(byPd.at(-1).abbr, `Worst point differential per game in the ${L} (${signed(byPd.at(-1).pdpg)}).`);
    const streaks = all.filter((t) => /^[WL]\d+$/.test(t.streak) && Number(t.streak.slice(1)) >= 4);
    streaks.forEach((t) => add(t.abbr, `Current ${t.streak[0] === 'W' ? 'winning' : 'losing'} streak: ${t.streak.slice(1)} games.`));
  } else {
    const by = (k, dir) => [...all].sort((a, b) => dir * (a[k] - b[k]));
    const fewestPA = by('pa', 1)[0];
    const mostPA = by('pa', -1)[0];
    const mostPF = by('pf', -1)[0];
    const fewestPF = by('pf', 1)[0];
    if (fewestPA) add(fewestPA.abbr, `Fewest points allowed in the ${L} (${fewestPA.pa}).`);
    if (mostPA) add(mostPA.abbr, `Most points allowed in the ${L} (${mostPA.pa}).`);
    if (mostPF) add(mostPF.abbr, `Most points scored in the ${L} (${mostPF.pf}).`);
    if (fewestPF) add(fewestPF.abbr, `Fewest points scored in the ${L} (${fewestPF.pf}).`);
  }
  const unbeaten = all.filter((t) => t.l === 0 && t.t === 0);
  const winless = all.filter((t) => t.w === 0);
  unbeaten.forEach((t) => add(t.abbr, unbeaten.length === 1 ? `The only unbeaten team in the ${L}.` : 'One of the unbeaten teams.'));
  winless.forEach((t) => add(t.abbr, winless.length === 1 ? `The only winless team in the ${L}.` : 'One of the winless teams.'));
  for (const t of all) {
    const gap = t.w + 0.5 * t.t - t.expectedWins;
    const threshold = league.key === 'nba' ? 1.5 : 1;
    if (gap >= threshold) add(t.abbr, `Record is better than the scoring suggests: point differential ${signed(t.pd)}.`);
    if (gap <= -threshold) add(t.abbr, `Better than the record: point differential ${signed(t.pd)} despite ${t.w}-${t.l}${t.t ? '-' + t.t : ''}.`);
  }
  return notes;
}

export const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
