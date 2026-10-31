import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEvent } from '../lib/espn.mjs';
import { buildTeams, seasonState, arrange, leagueNotes } from '../lib/model.mjs';
import { heatLabel, heatScore } from '../lib/heat.mjs';
import { computePower } from '../lib/power.mjs';
import { factPacket, validate, fallback } from '../lib/storylines.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/espn-event.json', import.meta.url), 'utf8'));

const g = (week, date, away, as, home, hs, completed = true) => ({
  id: `${week}-${away}-${home}`, week, date, completed, network: 'CBS',
  home: { abbr: home, espnId: home, score: completed ? hs : null, leaders: [] },
  away: { abbr: away, espnId: away, score: completed ? as : null, leaders: [] },
});

test('parseEvent reads an ESPN scoreboard event, including competition-level leaders', () => {
  const e = parseEvent(fixture);
  assert.equal(e.week, 7);
  assert.equal(e.completed, true);
  assert.equal(e.network, 'NBC');
  assert.equal(e.home.abbr, 'SEA');
  assert.equal(e.home.score, 20);
  assert.equal(e.away.score, 3);
  assert.equal(e.home.leaders[0].name, 'Jaxon Smith-Njigba');
  assert.equal(e.home.leaders[0].yards, 150);
  assert.equal(e.away.leaders[0].name, 'Patrick Mahomes');
  assert.equal(e.away.leaders[0].kind, 'passing');
});

test('parseEvent normalizes WAS to WSH', () => {
  const ev = structuredClone(fixture);
  ev.competitions[0].competitors[1].team.abbreviation = 'WAS';
  assert.equal(parseEvent(ev).away.abbr, 'WSH');
});

test('buildTeams: records, byes in last three, streak, next game', () => {
  const games = [
    g(5, '2026-10-11T17:00Z', 'IND', 22, 'PIT', 34),
    g(6, '2026-10-18T17:00Z', 'PIT', 26, 'TB', 19),
    g(7, '2026-10-25T13:30Z', 'PIT', 16, 'NO', 10),
    g(8, '2026-11-01T18:00Z', 'CLE', 0, 'PIT', 0, false),
    g(5, '2026-10-11T17:00Z', 'CIN', 31, 'MIA', 24),
    g(7, '2026-10-25T17:00Z', 'CIN', 35, 'BAL', 13),
  ];
  const teams = buildTeams(games);
  const pit = teams.PIT;
  assert.deepEqual([pit.w, pit.l, pit.pf, pit.pa], [3, 0, 76, 51]);
  assert.equal(pit.streak, 'W3');
  assert.equal(pit.heat, 'Hot');
  assert.deepEqual(pit.next, { opp: 'CLE', home: true, kickoff: '2026-11-01T18:00Z', network: 'CBS', gameId: '8-CLE-PIT' });
  assert.deepEqual(teams.CIN.last3.map((x) => x.result), ['W', 'BYE', 'W']);
  const st = seasonState(games);
  assert.equal(st.lastWeek, 7);
  assert.equal(st.currentWeek, 8);
});

test('heat thresholds', () => {
  const L = (f, a) => ({ result: f > a ? 'W' : f < a ? 'L' : 'T', for: f, against: a });
  assert.equal(heatLabel(heatScore([L(17, 19), L(14, 25), L(21, 38)])), 'Cold');
  assert.equal(heatLabel(heatScore([L(29, 32), L(14, 17), L(20, 3)])), 'Steady');
});

test('division order and league notes', () => {
  const games = [g(1, '2026-09-13T17:00Z', 'BUF', 30, 'MIA', 10), g(1, '2026-09-13T17:00Z', 'NE', 20, 'NYJ', 17)];
  const teams = buildTeams(games);
  const conf = arrange(teams);
  assert.deepEqual(conf[0].divisions[0].teams.map((t) => t.abbr).slice(0, 2), ['BUF', 'NE']);
  const notes = leagueNotes(teams);
  assert.ok(notes.MIA.some((n) => n.includes('Fewest points scored')));
  const ranks = computePower(teams);
  assert.equal(Object.keys(ranks).length, 32);
  assert.equal(ranks.BUF, 1);
});

test('storyline validation rejects invented numbers and players', () => {
  const teams = buildTeams([{ ...parseEvent(fixture) }]);
  arrange(teams);
  const sea = teams.SEA;
  sea.rank = 5;
  const packet = factPacket(sea, { notes: [] });
  const good = { abbr: 'SEA', story: 'Held Kansas City to 3 points in a 20-3 win.', player: { name: 'Jaxon Smith-Njigba', pos: 'WR', line: '150 yds and a TD vs KC' } };
  assert.deepEqual(validate(good, sea, packet), []);
  const madeUp = { ...good, story: 'Won by 31 with 4 sacks.' };
  assert.match(validate(madeUp, sea, packet).join(), /numbers not in facts/);
  const wrongPlayer = { ...good, player: { name: 'Sam Darnold', pos: 'QB', line: 'Starter' } };
  assert.match(validate(wrongPlayer, sea, packet).join(), /player not in candidates/);
  const fb = fallback(sea, []);
  assert.equal(fb.player.name, 'Jaxon Smith-Njigba');
  assert.ok(fb.story.length > 10);
});
