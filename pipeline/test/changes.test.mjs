import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diff, prune } from '../lib/changes.mjs';
import { recapKey, validateRecap, fallbackRecap } from '../lib/recap.mjs';
import { NBA, NFL } from '../lib/leagues.mjs';

const s = (o) => ({ w: 0, l: 0, t: 0, rank: 10, heat: 'Steady', place: 2, division: 'AFC North', streak: '', pct: 0, seed: null, ...o });

test('diff records leader changes, ended unbeaten runs, heat shifts, big rank moves, streak milestones', () => {
  const prev = {
    PIT: s({ w: 4, l: 2, place: 2, pct: 0.667, rank: 16, heat: 'Warm', streak: 'W2' }),
    CLE: s({ w: 5, l: 1, place: 1, pct: 0.833, rank: 15, heat: 'Warm', streak: 'W2' }),
    MIN: s({ w: 6, l: 0, place: 1, division: 'NFC North', pct: 1, rank: 3, streak: 'W6' }),
    LV: s({ w: 3, l: 3, place: 1, division: 'AFC West', pct: 0.5, heat: 'Cool', streak: 'L2' }),
  };
  const cur = {
    PIT: s({ w: 5, l: 2, place: 1, pct: 0.714, rank: 9, heat: 'Hot', streak: 'W3' }),
    CLE: s({ w: 5, l: 2, place: 2, pct: 0.714, rank: 15, heat: 'Warm', streak: 'L1' }),
    MIN: s({ w: 6, l: 1, place: 1, division: 'NFC North', pct: 0.857, rank: 4, streak: 'L1' }),
    LV: s({ w: 3, l: 4, place: 1, division: 'AFC West', pct: 0.43, heat: 'Cold', streak: 'L3' }),
  };
  const ev = diff(prev, cur, NFL.teams, NFL, '2026-11-02T14:00:00Z');
  const kinds = ev.map((e) => `${e.abbr}:${e.kind}`).sort();
  // PIT is tied with CLE (not strictly ahead), so no leader change yet.
  assert.deepEqual(kinds, ['LV:heat', 'LV:streak', 'MIN:unbeaten-ended', 'PIT:heat', 'PIT:rank', 'PIT:streak']);
  assert.ok(ev.every((e) => !/\d+-\d+/.test(e.text)), 'no scores in change lines');
  assert.equal(diff(null, cur, NFL.teams, NFL, 'x').length, 0);
});

test('a strictly better new leader is recorded', () => {
  const prev = { PIT: s({ place: 2, pct: 0.6 }), CLE: s({ place: 1, pct: 0.7 }) };
  const cur = { PIT: s({ place: 1, pct: 0.75 }), CLE: s({ place: 2, pct: 0.6 }) };
  const ev = diff(prev, cur, NFL.teams, NFL, 'x');
  assert.equal(ev[0].kind, 'lead');
  assert.match(ev[0].text, /Steelers took over first place in the AFC North/);
});

test('prune keeps three weeks', () => {
  const now = new Date('2026-11-30T00:00:00Z');
  const kept = prune([{ at: '2026-11-01T00:00:00Z' }, { at: '2026-11-20T00:00:00Z' }], now);
  assert.equal(kept.length, 1);
});

test('recap validation blocks game scores and invented numbers but allows records', () => {
  const facts = 'Steelers (5-2). Changes: Steelers have won 3 straight. 27 19';
  const ok = { bullets: [{ text: 'The Steelers are 5-2 and have won 3 straight.' }, { text: 'Two.' }, { text: 'Three.' }] };
  assert.deepEqual(validateRecap(ok, facts, NFL), []);
  const score = { bullets: [{ text: 'The Packers won 27-19.' }, { text: 'Two.' }, { text: 'Three.' }] };
  assert.match(validateRecap(score, facts, NFL).join(), /game score/);
  const invented = { bullets: [{ text: 'Won by 40.' }, { text: 'Two.' }, { text: 'Three.' }] };
  assert.match(validateRecap(invented, facts, NFL).join(), /numbers not in facts/);
  assert.equal(fallbackRecap([{ text: 'a', abbr: 'X', weight: 1, at: '1' }, { text: 'b', abbr: 'Y', weight: 5, at: '1' }])[0].text, 'b');
});

test('recap keys: NFL by completed week, NBA by Monday', () => {
  const games = [
    { week: 7, completed: true }, { week: 7, completed: true },
    { week: 8, completed: true }, { week: 8, completed: false },
  ];
  assert.equal(recapKey(NFL, games).key, 'wk-7');
  const k = recapKey(NBA, [], new Date('2026-11-05T20:00:00Z'));
  assert.equal(k.key, 'wk-2026-11-02');
  assert.equal(k.label, 'Week of Nov 2');
});

test('rank moves are skipped when the power source changed', () => {
  const prev = { PIT: s({ rank: 16 }) };
  const cur = { PIT: s({ rank: 4 }) };
  assert.equal(diff(prev, cur, NFL.teams, NFL, 'x').length, 1);
  assert.equal(diff(prev, cur, NFL.teams, NFL, 'x', { skipRank: true }).length, 0);
});
