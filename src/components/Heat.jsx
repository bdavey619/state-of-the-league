import { HEAT } from '../format.js';

export default function Heat({ label }) {
  const h = HEAT[label] || HEAT.Steady;
  return (
    <span className={`heat ${h.tone}`} title={label}>
      <span aria-hidden="true">{h.glyph}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
