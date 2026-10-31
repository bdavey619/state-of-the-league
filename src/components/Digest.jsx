import { useEffect, useMemo, useState } from 'react';

// A one-line banner: what changed since your last visit, or this week's recap.
// Tap to expand. Shifts in the standings only, never game-by-game results.
export default function Digest({ league, data }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(null);

  // Read your last visit once per data load, then mark this refresh as seen.
  const lastSeen = useMemo(() => store.get(`${league}:lastSeen`), [league, data.updatedAt]);
  useEffect(() => {
    store.set(`${league}:lastSeen`, data.updatedAt);
  }, [league, data.updatedAt]);

  const colors = useMemo(() => {
    const m = {};
    data.conferences.forEach((c) => c.divisions.forEach((d) => d.teams.forEach((t) => { m[t.abbr] = t.color; })));
    return m;
  }, [data]);

  const changes = data.changes || [];
  const since = useMemo(() => {
    if (!lastSeen) return [];
    return changes
      .filter((e) => e.at > lastSeen)
      .sort((a, b) => b.weight - a.weight || b.at.localeCompare(a.at));
  }, [changes, lastSeen]);

  const recap = data.recap?.bullets?.length
    ? data.recap.bullets.map((b) => ({ text: b.text, teams: b.teams || [] }))
    : changes.filter((e) => Date.now() - new Date(e.at) < 7 * 86400000).slice(0, 3).map((e) => ({ text: e.text, teams: [e.abbr] }));
  const recapLabel = data.recap?.label || 'This week';

  const sinceItems = since.map((e) => ({ text: e.text, teams: [e.abbr] }));
  const active = tab || (sinceItems.length ? 'since' : 'recap');
  const items = active === 'since' ? sinceItems : recap;
  if (!sinceItems.length && !recap.length) return null;

  const bothTabs = sinceItems.length > 0 && recap.length > 0;
  const label = open && bothTabs ? 'What changed' : active === 'since' ? 'Since you last looked' : recapLabel;
  const extra = items.length - 1;

  return (
    <section className={`digest${open ? ' open' : ''}`} aria-label="What changed">
      <button type="button" className="digest-bar" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="mono digest-label">{label}</span>
        {!open && (
          <span className="digest-peek">
            <Swatches teams={items[0]?.teams} colors={colors} />
            <span className="digest-first">{items[0]?.text}</span>
            {extra > 0 && <span className="mono digest-count">+{extra}</span>}
          </span>
        )}
        <svg className="m-chev digest-chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="digest-body">
          {bothTabs && (
            <div className="segmented digest-tabs" role="group" aria-label="Digest view">
              <button type="button" aria-pressed={active === 'since'} onClick={() => setTab('since')}>
                Since you last looked
              </button>
              <button type="button" aria-pressed={active === 'recap'} onClick={() => setTab('recap')}>
                {recapLabel}
              </button>
            </div>
          )}
          <ul className="digest-list">
            {items.slice(0, 6).map((it, i) => (
              <li key={i}>
                <Swatches teams={it.teams} colors={colors} />
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Swatches({ teams = [], colors }) {
  const list = teams.filter((a) => colors[a]).slice(0, 3);
  if (!list.length) return <span className="digest-dot" aria-hidden="true" />;
  return (
    <span className="digest-swatches" aria-hidden="true">
      {list.map((a) => <span key={a} className="swatch" style={{ background: colors[a] }} />)}
    </span>
  );
}

const store = {
  get(key) {
    try { return localStorage.getItem(`sotl:${key}`); } catch { return null; }
  },
  set(key, v) {
    try { localStorage.setItem(`sotl:${key}`, v); } catch { /* private mode */ }
  },
};
