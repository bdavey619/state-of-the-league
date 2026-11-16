// Polymarket moneyline odds for the top must-watch games (public Gamma API, no key needed).
// Finds the game's event, picks its moneyline market and stores each side's implied probability.
// Every failure is soft: a game without a market simply has no `polymarket` field.

const GAMMA = 'https://gamma-api.polymarket.com';

// Polymarket slugs mostly use the usual abbreviations; a few differ from ESPN's.
const ALT = {
  nfl: { WSH: ['was'], LAR: ['la', 'lar'], JAX: ['jac', 'jax'] },
  nba: { NY: ['nyk', 'ny'], GS: ['gsw', 'gs'], SA: ['sas', 'sa'], NO: ['nop', 'no'], UTAH: ['uta', 'utah'], WSH: ['was', 'wsh'], PHX: ['phx', 'pho'], BKN: ['bkn', 'brk'] },
};
const slugAbbrs = (abbr, key) => [...new Set([...(ALT[key]?.[abbr] || []), abbr.toLowerCase()])];

const etDate = (iso, shiftDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })
    .format(new Date(new Date(iso).getTime() + shiftDays * 86400000));

const parse = (v) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return null; }
};
const norm = (s) => String(s || '').toLowerCase();

// Which side an outcome label belongs to ("Steelers", "Pittsburgh Steelers", "PIT").
function sideOf(label, game) {
  const l = norm(label);
  for (const side of ['away', 'home']) {
    const t = game[side];
    if (l === norm(t.abbr) || l.includes(norm(t.name))) return side;
  }
  return null;
}

// The moneyline: two outcomes, one per team, and not a spread/total/half/prop market.
export function pickMoneyline(event, game) {
  const markets = (event?.markets || []).filter((m) => !m.closed);
  const lines = markets
    .map((m) => {
      const outcomes = parse(m.outcomes);
      const prices = parse(m.outcomePrices);
      if (!outcomes || !prices || outcomes.length !== 2) return null;
      if (/spread|o\/u|over|under|total|1st|half|quarter|points|rebounds|assists/i.test(m.question || '')) return null;
      const sides = outcomes.map((o) => sideOf(o, game));
      if (!sides.includes('away') || !sides.includes('home')) return null;
      const p = Object.fromEntries(sides.map((s, i) => [s, Number(prices[i])]));
      if (!(p.away >= 0 && p.home >= 0) || p.away + p.home === 0) return null;
      return { m, p, sides, volume: Number(m.volumeNum ?? m.volume ?? 0) };
    })
    .filter(Boolean)
    .sort((a, b) => b.volume - a.volume);
  const best = lines[0];
  if (!best) return null;
  const total = best.p.away + best.p.home;
  return {
    marketSlug: best.m.slug,
    sides: best.sides,
    away: Math.round((best.p.away / total) * 1000) / 1000,
    home: Math.round((best.p.home / total) * 1000) / 1000,
    volume: Math.round(Number(event.volume ?? best.volume) || 0),
  };
}

// An event is this game if its title names both teams and it starts within a day and a half.
export function isGameEvent(event, game) {
  const title = norm(event?.title);
  if (!title.includes(norm(game.away.name)) || !title.includes(norm(game.home.name))) return false;
  const start = event.startTime || event.gameStartTime || event.endDate || event.startDate;
  if (!start) return true;
  return Math.abs(new Date(start) - new Date(game.kickoff)) < 36 * 3600000;
}

async function getJSON(url, fetchImpl) {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

export async function findOdds(game, league, { fetchImpl = fetch } = {}) {
  const key = league.key;
  const tried = [];
  // 1. Exact slug guesses: nfl-pit-cin-2026-11-15 (game date in US Eastern, ±1 day).
  for (const shift of [0, -1, 1]) {
    for (const a of slugAbbrs(game.away.abbr, key)) {
      for (const h of slugAbbrs(game.home.abbr, key)) {
        const slug = `${key}-${a}-${h}-${etDate(game.kickoff, shift)}`;
        tried.push(slug);
        const events = await getJSON(`${GAMMA}/events?slug=${slug}`, fetchImpl).catch(() => []);
        const ev = (Array.isArray(events) ? events : []).find((e) => isGameEvent(e, game)) || null;
        const odds = ev && pickMoneyline(ev, game);
        if (odds) return { ...odds, slug: ev.slug, via: 'slug' };
      }
    }
  }
  // 2. Search by team names.
  const q = encodeURIComponent(`${game.away.name} ${game.home.name}`);
  const found = await getJSON(`${GAMMA}/public-search?q=${q}&events_status=active&limit_per_type=10`, fetchImpl).catch(() => null);
  for (const ev of found?.events || []) {
    if (!isGameEvent(ev, game)) continue;
    const full = ev.markets?.length ? ev : (await getJSON(`${GAMMA}/events?slug=${ev.slug}`, fetchImpl).catch(() => []))[0];
    const odds = full && pickMoneyline(full, game);
    if (odds) return { ...odds, slug: full.slug, via: 'search' };
  }
  // 3. Open events under the league tag.
  const listed = await getJSON(`${GAMMA}/events?tag_slug=${key}&closed=false&limit=300`, fetchImpl).catch(() => []);
  for (const ev of Array.isArray(listed) ? listed : []) {
    if (!isGameEvent(ev, game)) continue;
    const odds = pickMoneyline(ev, game);
    if (odds) return { ...odds, slug: ev.slug, via: 'tag' };
  }
  return { miss: true, tried: tried.length };
}

// Adds `polymarket` to the first few must-watch games (the site features the best one still on).
export async function addOdds(watch, league, { count = 3, fetchImpl = fetch, now = new Date() } = {}) {
  const log = [];
  for (const g of watch.slice(0, count)) {
    try {
      const r = await findOdds(g, league, { fetchImpl });
      if (r.miss) { log.push(`${g.away.abbr}@${g.home.abbr}: no market`); continue; }
      g.polymarket = {
        url: `https://polymarket.com/event/${r.slug}`,
        slug: r.slug,
        marketSlug: r.marketSlug,
        sides: r.sides,
        away: r.away,
        home: r.home,
        volume: r.volume,
        at: now.toISOString(),
      };
      log.push(`${g.away.abbr}@${g.home.abbr}: ${Math.round(r.away * 100)}-${Math.round(r.home * 100)} via ${r.via}`);
    } catch (e) {
      log.push(`${g.away.abbr}@${g.home.abbr}: ${e.message}`);
    }
  }
  return log;
}
