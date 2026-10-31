// Power rank. Uses a manual override file when it matches the current week (e.g. a pasted
// consensus ranking); otherwise computes one from point differential, record and recent form.

function z(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  return values.map((v) => (v - mean) / sd);
}

export function computePower(teams, w = { pd: 0.45, pct: 0.35, heat: 0.2 }) {
  const list = Object.values(teams);
  const pdpg = z(list.map((t) => (t.gp ? t.pd / t.gp : 0)));
  const pct = z(list.map((t) => t.pct));
  const heat = z(list.map((t) => t.heatScore));
  const scored = list.map((t, i) => ({ abbr: t.abbr, score: w.pd * pdpg[i] + w.pct * pct[i] + w.heat * heat[i] }));
  scored.sort((a, b) => b.score - a.score || a.abbr.localeCompare(b.abbr));
  return Object.fromEntries(scored.map((s, i) => [s.abbr, i + 1]));
}

// Override matches when its "week" equals the current NFL week, or (NBA) when its
// "validThrough" date (YYYY-MM-DD) is today or later.
export function applyPower(teams, override, currentWeek, league = null, today = new Date().toISOString().slice(0, 10)) {
  const fresh = override?.validThrough ? override.validThrough >= today : Number(override?.week) === Number(currentWeek);
  const useOverride = override?.ranks && fresh
    && Object.keys(teams).every((a) => Number.isInteger(override.ranks[a]));
  const ranks = useOverride ? override.ranks : computePower(teams, league?.power);
  for (const t of Object.values(teams)) t.rank = ranks[t.abbr];
  return useOverride
    ? override.source || 'manual ranking'
    : league?.powerNote || 'computed from point differential (45%), record (35%) and recent form (20%)';
}
