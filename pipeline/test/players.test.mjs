import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseBox } from '../lib/boxscore.mjs';
import { aggregatePlayers, dominanceRanking, gameScore, qualified, teamCandidates } from '../lib/players.mjs';
import { scoreGame, mustWatch } from '../lib/watch.mjs';
import { NBA, NFL } from '../lib/leagues.mjs';

const summary = JSON.parse(await readFile(new URL('../fixtures/espn-nba-summary.json', import.meta.url), 'utf8'));

test('parseBox reads keyed and label-only stat blocks and skips DNPs', () => {
  const box = parseBox(summary, NBA.norm);
  assert.deepEqual(Object.keys(box).sort(), ['DEN', 'OKC']);
  assert.equal(box.DEN.length, 2);
  const jokic = box.DEN[0];
  assert.deepEqual(jokic.slice(0, 8), ['3112335', 'Nikola Jokic', 'C', 36, 31, 14, 4, 11]);
  assert.deepEqual(jokic.slice(12), [12, 20, 2, 5, 5, 6]);
  const sga = box.OKC[0];
  assert.equal(sga[4], 32); // points from the label-ordered block
  assert.equal(sga[5], 5); // rebounds
  assert.deepEqual(sga.slice(12), [11, 21, 1, 4, 9, 10]);
});

test('Game Score matches the Hollinger formula', () => {
  const [jokic] = parseBox(summary, NBA.norm).DEN;
  // 31 + 0.4*12 - 0.7*20 - 0.4*(6-5) + 0.7*4 + 0.3*10 + 2 + 0.7*11 + 0.7*1 - 0.4*2 - 3
  assert.equal(Math.round(gameScore(jokic) * 10) / 10, 33.8);
});

test('aggregation, qualification and ranking', () => {
  const g1 = parseBox(summary, NBA.norm);
  const cache = {};
  for (let i = 0; i < 4; i++) cache[`g${i}`] = { date: `2026-11-0${i + 1}T02:00Z`, teams: g1 };
  const players = aggregatePlayers(cache, { DEN: 4, OKC: 4 });
  const jokic = players.find((p) => p.name === 'Nikola Jokic');
  assert.equal(jokic.gp, 4);
  assert.equal(jokic.ppg, 31);
  assert.equal(jokic.rpg, 14);
  assert.ok(jokic.ts > 60 && jokic.ts < 70);
  assert.equal(jokic.latest.opp, 'OKC');
  const ranked = dominanceRanking(players, 3);
  assert.equal(ranked[0].name, 'Nikola Jokic');
  // A player in only 1 of 10 team games doesn't qualify.
  assert.equal(qualified(aggregatePlayers(cache, { DEN: 10, OKC: 4 })).filter((p) => p.team === 'DEN').length, 0);
  assert.equal(teamCandidates(players, 'DEN')[0].name, 'Nikola Jokic');
});

const team = (o) => ({ name: 'X', conf: 'West', div: 'Northwest', w: 5, l: 3, t: 0, gp: 8, pdpg: 2, rank: 10, place: 2, seed: 5, heat: 'Steady', streak: 'W1', ...o });

test('watch score rewards close, high-stakes games between good teams', () => {
  const teams = {
    DEN: team({ abbr: 'DEN', name: 'Nuggets', rank: 3, place: 1, seed: 2, pdpg: 7, w: 7, l: 2, heat: 'Hot', streak: 'W5' }),
    OKC: team({ abbr: 'OKC', name: 'Thunder', rank: 4, place: 2, seed: 3, pdpg: 8, w: 6, l: 2, heat: 'Warm' }),
    SAC: team({ abbr: 'SAC', name: 'Kings', conf: 'West', div: 'Pacific', rank: 29, place: 5, seed: 15, pdpg: -12, w: 1, l: 7, heat: 'Cold', streak: 'L4' }),
  };
  const g = (away, home) => ({ id: `${away}-${home}`, date: '2026-11-08T03:00:00Z', completed: false, network: 'ESPN', away: { abbr: away }, home: { abbr: home } });
  const stars = [{ name: 'Nikola Jokic', team: 'DEN', rank: 1 }, { name: 'Shai Gilgeous-Alexander', team: 'OKC', rank: 2 }];
  const big = scoreGame(g('DEN', 'OKC'), teams, NBA, stars);
  const dud = scoreGame(g('SAC', 'OKC'), teams, NBA, stars);
  assert.ok(big.score >= 80, `big game scored ${big.score}`);
  assert.equal(big.tier, 'must');
  assert.ok(dud.score < 65, `mismatch scored ${dud.score}`);
  assert.ok(big.reasons.includes('West Northwest lead on the line'));
  assert.ok(big.reasons.some((r) => r === 'Jokic vs Gilgeous-Alexander' || r === 'Top-8 vs top-8' || r === 'Should be close' || r === 'Projected coin flip'));
  const list = mustWatch([g('SAC', 'OKC'), g('DEN', 'OKC'), { ...g('DEN', 'SAC'), completed: true }], teams, NBA, stars, new Date('2026-11-07T20:00:00Z'));
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'DEN-OKC');
});

test('NFL watch score works without player stars', () => {
  const teams = {
    PIT: team({ abbr: 'PIT', name: 'Steelers', conf: 'AFC', div: 'North', rank: 6, place: 1, pdpg: 4, w: 6, l: 2 }),
    CIN: team({ abbr: 'CIN', name: 'Bengals', conf: 'AFC', div: 'North', rank: 9, place: 2, pdpg: 5, w: 5, l: 2 }),
  };
  const s = scoreGame({ id: 'x', date: '2026-11-09T18:00:00Z', away: { abbr: 'CIN' }, home: { abbr: 'PIT' } }, teams, NFL, []);
  assert.ok(s.score >= 70, `scored ${s.score}`);
  assert.ok(s.reasons.includes('AFC North lead on the line'));
});
