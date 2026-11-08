import { useState } from 'react';

const TREND = { up: { glyph: '▲', label: 'Heating up' }, down: { glyph: '▼', label: 'Cooling off' } };
const one = (n) => (n == null ? '–' : n.toFixed(1));

// Who's dominating the season, ranked by average Game Score from every box score.
export default function Players({ players, colors, initial = 5 }) {
  const [all, setAll] = useState(false);
  if (!players?.length) return null;
  const list = all ? dps : players.slice(0, initial);

  return (
    <section className="card dps" aria-label="Dominant dps">
      <div className="section-head">
        <h2>Dominant players</h2>
        <span className="mono section-sub">Game Score / game</span>
      </div>
      <ol className="dp-list">
        {list.map((p) => {
          const tr = TREND[p.trend];
          return (
            <li key={`${p.name}-${p.team}`} className="dp-row">
              <span className="mono dp-rank">{p.rank}</span>
              <span className="swatch" style={{ background: colors[p.team] }} aria-hidden="true" />
              <div className="dp-body">
                <div className="dp-name">
                  {p.name}
                  <span className="mono dp-team">{p.team}</span>
                </div>
                <div className="mono dp-line">
                  {one(p.ppg)} pts · {one(p.rpg)} reb · {one(p.apg)} ast
                  {tr && <span className={`dp-trend ${p.trend}`} title={tr.label}> {tr.glyph}<span className="dp-trend-text"> {tr.label.toLowerCase()}</span></span>}
                </div>
              </div>
              <span className="mono dp-gs">{one(p.gs)}</span>
            </li>
          );
        })}
      </ol>
      {players.length > initial && (
        <button type="button" className="mono more" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show top ${players.length}`}
        </button>
      )}
    </section>
  );
}
