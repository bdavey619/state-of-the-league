// Games over .500 after each game. A line climbing steeply = a team on fire.
import { useEffect, useRef, useState } from 'react';

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

// Division chart: one line per team in its color, labeled at the end.
export function TrendChart({ teams }) {
  // Draw at the card's real width so text stays the same size on phones and desktops.
  const ref = useRef(null);
  const [width, setWidth] = useState(160);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(140, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const height = width > 220 ? 120 : 92;
  return (
    <div ref={ref} className="trend-wrap">
      <TrendSvg teams={teams} width={width} height={height} />
    </div>
  );
}

function TrendSvg({ teams, width, height }) {
  // Every line starts at 0 before the first game.
  const series = teams.map((t) => ({ abbr: t.abbr, color: t.color, values: [0, ...(t.trend || [])] }));
  const n = Math.max(2, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values).concat(0);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = Math.max(4, hi - lo);
  const pad = { l: 4, r: width > 220 ? 64 : 48, t: 8, b: 8 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const mid = (hi + lo) / 2;
  const y0 = mid - span / 2;
  const x = (i) => pad.l + (i / (n - 1)) * w;
  const y = (v) => pad.t + h - ((v - y0) / span) * h;

  // End labels, nudged apart so they don't overlap.
  const labels = series
    .filter((s) => s.values.length > 1)
    .map((s) => ({ ...s, last: s.values.at(-1), ly: y(s.values.at(-1)) }))
    .sort((a, b) => a.ly - b.ly);
  placeLabels(labels, 6, height - 5, 9.5);

  const desc = labels.map((l) => `${l.abbr} ${signed(l.last)}`).join(', ');
  return (
    <svg className="trend" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Games over .500: ${desc}`}>
      <line x1={pad.l} x2={pad.l + w} y1={y(0)} y2={y(0)} className="trend-zero" />
      {series.map((s) => s.values.length > 1 && (
        <polyline
          key={s.abbr}
          points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {labels.map((l) => (
        <text key={l.abbr} x={pad.l + w + 4} y={l.ly} className="trend-label" dominantBaseline="middle">
          <tspan fill={l.color}>●</tspan> {l.abbr} {signed(l.last)}
        </text>
      ))}
    </svg>
  );
}

// Single team sparkline for the details row.
export function Sparkline({ values: raw = [], color, width = 120, height = 26 }) {
  const values = [0, ...raw];
  if (values.length < 2) return null;
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = Math.max(2, hi - lo);
  const x = (i) => 2 + (i / (values.length - 1)) * (width - 4);
  const y = (v) => 3 + (height - 6) - ((v - lo) / span) * (height - 6);
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <line x1="2" x2={width - 2} y1={y(0)} y2={y(0)} className="trend-zero" />
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1))} r="2.4" fill={color} />
    </svg>
  );
}

// Keep end labels in order, at least `gap` apart and inside [top, bottom].
function placeLabels(labels, top, bottom, gap) {
  if (!labels.length) return;
  labels.forEach((l, i) => { l.ly = Math.max(l.ly, top, i ? labels[i - 1].ly + gap : top); });
  for (let i = labels.length - 1; i >= 0; i--) {
    const limit = i === labels.length - 1 ? bottom : labels[i + 1].ly - gap;
    l(labels[i], limit);
  }
  if (labels[0].ly < top) {
    const step = labels.length > 1 ? (bottom - top) / (labels.length - 1) : 0;
    labels.forEach((x, i) => { x.ly = top + i * Math.min(step, gap); });
  }
  function l(item, limit) { item.ly = Math.min(item.ly, limit); }
}
