import { useMemo } from 'react';
import { HEAT, record } from '../format.js';
import Heat from './Heat.jsx';
import { TrendChart } from './TrendChart.jsx';

// Summary: division standings (2-up on phones) or power rankings. Tapping a division card,
// or a team in the power list, calls onPick(divisionName, teamAbbr?).
export default function Glance({ conferences, view, setView, selected, onPick, trends = false }) {
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
            {trends ? 'Power' : 'Power rankings'}
          </button>
          {trends && (
            <button type="button" aria-pressed={view === 'trends'} onClick={() => setView('trends')}>
              Trends
            </button>
          )}
        </div>
      </div>

      {view === 'trends' && trends ? (
        <div className="mini-grid trend-grid">
          {divisions.map((d) => (
            <button
              type="button"
              className={`card mini trend-card${selected === d.name ? ' selected' : ''}`}
              key={d.name}
              aria-pressed={selected === d.name}
              aria-label={`${d.name}: show teams`}
              onClick={() => onPick(d.name)}
            >
              <span className="mono label">{d.name}</span>
              <TrendChart teams={d.teams} />
            </button>
          ))}
        </div>
      ) : view === 'standings' ? (
        <div className="mini-grid">
          {divisions.map((d) => (
            <button
              type="button"
              className={`card mini${selected === d.name ? ' selected' : ''}`}
              key={d.name}
              aria-pressed={selected === d.name}
              aria-label={`${d.name}: show teams`}
              onClick={() => onPick(d.name)}
            >
              <span className="mono label">{d.name}</span>
              {d.teams.map((t) => (
                <span className="mini-row" key={t.abbr}>
                  <span className="team-cell">
                    <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
                    <span className="abbr">{t.abbr}</span>
                  </span>
                  <span className="mono">{record(t)}</span>
                  <span className="mono dim">#{t.rank}</span>
                  <Heat label={t.heat} />
                </span>
              ))}
            </button>
          ))}
        </div>
      ) : (
        <div className="power-grid">
          {power.map((col, i) => (
            <div className="card power" key={i}>
              {col.map((t) => (
                <button type="button" className="power-row" key={t.abbr} onClick={() => onPick(t.division, t.abbr)}>
                  <span className="mono dim">{t.rank}</span>
                  <span className="team-cell">
                    <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
                    <span className="name">{t.name}</span>
                    <span className="abbr">{t.abbr}</span>
                  </span>
                  <span className="mono">{record(t)}</span>
                  <span className="mono dim small division-cell">{t.division}</span>
                  <Heat label={t.heat} />
                </button>
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
        <span>{view === 'trends' ? 'Lines: games over .500 after each game' : '# = power rank'}</span>
      </div>
    </section>
  );
}
