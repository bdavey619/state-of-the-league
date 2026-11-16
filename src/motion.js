import { useEffect, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts from 0 up to `target` once, easing out. Shows the final value straight away for reduced motion.
export function useCountUp(target, { duration = 900, delay = 0, decimals = 0 } = {}) {
  const [value, setValue] = useState(() => (reduced() ? target : 0));
  useEffect(() => {
    if (target == null) return undefined;
    if (reduced()) { setValue(target); return undefined; }
    let raf;
    let start;
    const tick = (t) => {
      if (start == null) start = t + delay;
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value == null ? value : Number(value.toFixed(decimals));
}

// True while the phone/computer is in dark mode; follows the system setting live.
export function useDark() {
  const q = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
  const [dark, setDark] = useState(() => Boolean(q?.matches));
  useEffect(() => {
    if (!q) return undefined;
    const on = (e) => setDark(e.matches);
    q.addEventListener?.('change', on);
    return () => q.removeEventListener?.('change', on);
  }, [q]);
  return dark;
}

// Very dark team colors (navy, black) vanish on a dark background: lift them toward white.
export function readable(hex, dark) {
  if (!dark || !/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum >= 0.28) return hex;
  const mix = Math.min(0.6, (0.28 - lum) * 2.4 + 0.15);
  const out = rgb.map((c) => Math.round(c + (255 - c) * mix));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
