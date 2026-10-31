// Hot/cold: the last three calendar weeks, newest weighted most.
// Each game = win (+1) / loss (-1) / tie (0) plus margin capped at three scores (±21 → ±1).

const WEIGHTS = [0.6, 0.8, 1.0]; // oldest → newest

export function heatScore(last3) {
  let s = 0;
  last3.forEach((g, i) => {
    if (!g || g.result === 'BYE') return;
    const r = g.result === 'W' ? 1 : g.result === 'L' ? -1 : 0;
    const m = g.for == null ? 0 : Math.max(-21, Math.min(21, g.for - g.against)) / 21;
    s += (r + m) * WEIGHTS[i];
  });
  return Math.round(s * 100) / 100;
}

export function heatLabel(score) {
  if (score >= 2.5) return 'Hot';
  if (score >= 0.9) return 'Warm';
  if (score <= -2.5) return 'Cold';
  if (score <= -0.9) return 'Cool';
  return 'Steady';
}
