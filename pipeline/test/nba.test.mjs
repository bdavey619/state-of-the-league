import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEvent } from '../lib/espn.mjs';
import { arrange, buildTeams, leagueNotes } from '../lib/model.mjs';
import { NBA } from '../lib/leagues.mjs';
import { computePower } from '../lib/power.mjs';
import { factPacket, validate, fallback } from '../lib/storylines.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/espn-nba-event.json', import.meta.url), 'utf8'));

const g = (i, away, as, home, hs, completed = true) => ({
  id: String(i), week: null, seasonType: 2, date: `2026-10-${String(20 + i).padStart(2, '0')}T23:30Z`, completed, network: '',
  home: { abbr: home, espnId: home, score: completed ? hs : null, leaders: [{ kind: 'points', name: `${home} star`, pos: 'G', value: 30, line: '30' }] },
  away: { abbr: away, espnId: away, score: completed ? as : null, leaders: [{ kind: 'points', name: `${away} star`, pos: 'F', value: 25, line: '25' }] },
});

test('NBA event: normalizes UTA→UTAH, keeps season type, reads points leaders', () => {
  const e = parseEvent(fixture, null, NBA.norm);
  assert.equal(e.away.abbr, 'UTAH');
  assert.equal(e.home.abbr, 'GS');
  assert.equal(e.seasonType, 2);
  assert.equal(e.home.leaders.find((l) => l.kind === 'points').value, 34);
});

test('NBA model: last-10 form, seeds, six divisions, dedupes repeated games', () => {
  const games = [
    g(1, 'OKC', 120, 'SA', 101), g(2, 'OKC', 115, 'DEN', 99), g(3, 'POR', 90, 'OKC', 130),
    g(4, 'SA', 100, 'HOU', 112), g(5, 'SA', 98, 'DAL', 120),
    g(6, 'OKC', 0, 'LAL', 0, false),
  ];
  const teams = buildTeams([...games, games[0]], NBA);
  const okc = teams.OKC;
  assert.deepEqual([okc.w, okc.l], [3, 0]);
  assert.equal(okc.lastNRecord, '3-0');
  assert.equal(okc.heat, 'Hot');
  assert.equal(teams.SA.heat, 'Cold');
  assert.equal(okc.next.opp, 'LAL');
  const conf = arrange(teams, NBA);
  assert.equal(conf.length, 2);
  assert.deepEqual(conf[1].divisions.map((d) => d.name), ['West Northwest', 'West Pacific', 'West Southwest']);
  assert.equal(conf[1].divisions[0].teams.length, 5);
  assert.equal(okc.seed, 1);
  const ranks = computePower(teams, NBA.power);
  assert.equal(Object.keys(ranks).length, 30);
  const notes = leagueNotes(teams, NBA);
  assert.ok(notes.OKC.some((n) => n.includes('Best point differential per game')));
});

test('NBA fact packet and validation', () => {
  const teams = buildTeams([parseEvent(fixture, null, NBA.norm)], NBA);
  arrange(teams, NBA);
  const gs = teams.GS;
  gs.rank = 4;
  const packet = factPacket(gs, { notes: [], league: NBA });
  assert.match(packet, /1st in the West/);
  assert.match(packet, /Last 1 games: 1-0/);
  assert.match(packet, /Stephen Curry/);
  const ok = { abbr: 'GS', story: 'Beat Utah 118-109 to open 1-0.', player: { name: 'Stephen Curry', pos: 'G', line: '34 points vs UTAH' } };
  assert.deepEqual(validate(ok, gs, packet), []);
  assert.match(validate({ ...ok, story: 'Won by 40.' }, gs, packet).join(), /numbers not in facts/);
  assert.match(fallback(gs, [], NBA).player.line, /Led the team in points/);
});
