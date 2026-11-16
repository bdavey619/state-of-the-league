import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOdds, isGameEvent, pickMoneyline } from '../lib/polymarket.mjs';

const game = {
  id: '1',
  kickoff: '2026-11-16T01:20:00Z',
  away: { abbr: 'PIT', name: 'Steelers' },
  home: { abbr: 'CIN', name: 'Bengals' },
};
const event = {
  slug: 'nfl-pit-cin-2026-11-15',
  title: 'Steelers vs. Bengals',
  startTime: '2026-11-16T01:20:00Z',
  volume: 1234567.8,
  markets: [
    { slug: 'spread', question: 'Spread: Bengals (-2.5)', outcomes: '["Bengals","Steelers"]', outcomePrices: '["0.5","0.5"]', volumeNum: 900000 },
    { slug: 'ou', question: 'Steelers vs. Bengals: O/U 44.5', outcomes: '["Over","Under"]', outcomePrices: '["0.48","0.52"]', volumeNum: 5000 },
    { slug: 'ml', question: 'Steelers vs. Bengals', outcomes: '["Bengals","Steelers"]', outcomePrices: '["0.585","0.425"]', volumeNum: 300000 },
  ],
};

test('picks the moneyline and maps prices to away/home, normalized', () => {
  const o = pickMoneyline(event, game);
  assert.equal(o.marketSlug, 'ml');
  assert.equal(o.home, 0.579);
  assert.equal(o.away, 0.421);
  assert.equal(o.volume, 1234568);
});

test('event must name both teams and be near kickoff', () => {
  assert.ok(isGameEvent(event, game));
  assert.ok(!isGameEvent({ ...event, title: 'Steelers vs. Ravens' }, game));
  assert.ok(!isGameEvent({ ...event, startTime: '2026-12-20T01:20:00Z' }, game));
});

test('addOdds finds the event by slug and never throws on network errors', async () => {
  const watch = [structuredClone(game), { ...structuredClone(game), id: '2', away: { abbr: 'NE', name: 'Patriots' }, home: { abbr: 'DET', name: 'Lions' } }];
  const fetchImpl = async (url) => {
    if (url.includes('slug=nfl-pit-cin-2026-11-15')) return { ok: true, json: async () => [event] };
    if (url.includes('public-search')) throw new Error('offline');
    return { ok: true, json: async () => [] };
  };
  const log = await addOdds(watch, { key: 'nfl' }, { fetchImpl, now: new Date('2026-11-15T20:00:00Z') });
  assert.equal(watch[0].polymarket.url, 'https://polymarket.com/event/nfl-pit-cin-2026-11-15');
  assert.equal(watch[0].polymarket.away, 0.421);
  assert.equal(watch[1].polymarket, undefined);
  assert.match(log[0], /42-58 via slug/);
  assert.match(log[1], /no market/);
});
