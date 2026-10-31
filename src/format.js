// Display helpers shared by the components.

export const HEAT = {
  Hot: { glyph: '▲▲', tone: 'up' },
  Warm: { glyph: '▲', tone: 'up' },
  Steady: { glyph: '–', tone: 'flat' },
  Cool: { glyph: '▼', tone: 'down' },
  Cold: { glyph: '▼▼', tone: 'down' },
};

export function record(t) {
  return t.t > 0 ? `${t.w}-${t.l}-${t.t}` : `${t.w}-${t.l}`;
}

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function shortTime(d) {
  // "10:00 AM" -> "10:00a"
  return TIME.format(d).replace(/\s?(AM|PM)$/, (_, p) => p[0].toLowerCase());
}

// Kickoff label in the viewer's own time zone: "Sun 10:00a" within a week, else "Nov 8, 10:00a".
export function kickoffLabel(iso, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = (d - now) / 86400000;
  if (days > -1 && days < 6) return `${DAY.format(d)} ${shortTime(d)}`;
  return `${DATE.format(d)}, ${shortTime(d)}`;
}

export function nextLabel(next) {
  if (!next) return { opp: '—', when: '' };
  return { opp: `${next.home ? 'vs' : 'at'} ${next.opp}`, when: kickoffLabel(next.kickoff) };
}

export function updatedLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${DAY.format(d)}, ${DATE.format(d)} · ${shortTime(d)}`;
}

export const divisionId = (name) => `div-${name.toLowerCase().replace(/\s+/g, '-')}`;
