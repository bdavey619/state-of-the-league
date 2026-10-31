import { useMemo, useState } from 'react';
import { HEAT, record } from '../format.js';
import Heat from './Heat.jsx';

export default function Glance({ conferences }) {
  const [view, setView] = useState('standings');

  const divisions = useMemo(() => conferences.flatMap((c) => c.divisions), [conferences]);
  const power = useMemo(() => {
    const all = divisions.flatMap((d) => d.teams.map((t) => ({ ...t, division: d.name })));
    all.sort((a, b) => a.rank - b.rank);
    return [all.slice(0, 16), all.slice(16)];
  }, [divisions]);

  return (
    <section className="glance" aria-labelledby="h-glance">
      <div className="glance-head">
        <h2 id="h-glance">At a glance</h2>
        <div className="segmented" role="group" aria-label="Sort teams">
          <button type="button" aria-pressed={view === 'standings'} onClick={() => setView('standings')}>
            Standings
          </button>
          <button type="button" aria-pressed={view === 'power'} onClick={() => setView('power')}>
            Power rankings
          </button>
        </div>
      </div>

      {view === 'standings' ? (
        <div className="mini-grid">
          {divisions.map((d) => (
            <div className="card mini" key={d.name}>
              <div className="mono label">{d.name}</div>
              {d.teams.map((t) => (
                <div className="mini-row" key={t.abbr}>
                  <span className="team-cell">
                    <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
                    <span className="abbr">{t.abbr}</span>
                  </span>
                  <span className="mono">{record(t)}</span>
                  <span className="mono dim">#{t.rank}</span>
                  <Heat label={t.heat} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="power-grid">
          {power.map((col, i) => (
            <div className="card power" key={i}>
              {col.map((t) => (
                <div className="power-row" key={t.abbr}>
                  <span className="mono dim">{t.rank}</span>
                  <span className="team-cell">
                    <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
                    <span className="name">{t.name}</span>
                  </span>
                  <span className="mono">{record(t)}</span>
                  <span className="mono dim small">{t.division}</span>
                  <Heat label={t.heat} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mono legend">
        {Object.entries(HEAT).map(([label, h]) => (
          <span key={label}>
            <span className={`heat ${h.tone}`}>{h.glyph}</span> {label}
          </span>
        ))}
        <span># = power rank</span>
      </div>
    </section>
  );
}
