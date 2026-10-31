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

// NBA-style: the last N games (no byes). Weights rise linearly from 0.5 (oldest) to 1.0 (latest);
// each game is win/loss (±1) plus margin capped at 15 (→ ±1). Average lands between -2 and +2.
export function heatFromGames(games, cap = 15) {
  if (!games.length) return 0;
  const n = games.length;
  let s = 0;
  let wsum = 0;
  games.forEach((g, i) => {
    const w = n === 1 ? 1 : 0.5 + (0.5 * i) / (n - 1);
    const r = g.result === 'W' ? 1 : g.result === 'L' ? -1 : 0;
    const m = Math.max(-cap, Math.min(cap, g.for - g.against)) / cap;
    s += w * (r + m);
    wsum += w;
  });
  return Math.round((s / wsum) * 100) / 100;
}

export function heatLabelGames(score) {
  if (score >= 1.0) return 'Hot';
  if (score >= 0.35) return 'Warm';
  if (score <= -1.0) return 'Cold';
  if (score <= -0.35) return 'Cool';
  return 'Steady';
}
