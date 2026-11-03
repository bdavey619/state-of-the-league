import { forwardRef } from 'react';
import { nextLabel, record } from '../format.js';
import Heat from './Heat.jsx';
import { Sparkline } from './TrendChart.jsx';

// Phone: the chosen division's teams, one line each; tap a team for its storyline and player.
const DivisionDetail = forwardRef(function DivisionDetail({ division, openTeam, setOpenTeam }, ref) {
  if (!division) {
    return (
      <section className="d-empty" ref={ref}>
        Tap a division to see its teams.
      </section>
    );
  }
  return (
    <section className="d-panel" ref={ref} aria-labelledby="h-division">
      <h2 id="h-division">{division.name}</h2>
      <div className="m-card">
        {division.teams.map((t, i) => {
          const isOpen = openTeam === t.abbr;
          const next = nextLabel(t.next);
          return (
            <div className={`m-team${isOpen ? ' open' : ''}`} key={t.abbr}>
              <button
                type="button"
                className="m-row"
                aria-expanded={isOpen}
                onClick={() => setOpenTeam(isOpen ? null : t.abbr)}
              >
                <span className="mono m-rank">{i + 1}</span>
                <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
                <span className="m-name">{t.name}</span>
                <span className="mono m-rec">{record(t)}</span>
                <Heat label={t.heat} />
                <span className="m-next">
                  <span className="m-opp">{next.opp}</span>
                  <span className="mono m-when">{next.when}</span>
                </span>
                <svg className="m-chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              {isOpen && (
                <div className="m-detail">
                  <p>{t.story}</p>
                  <div className="m-player">
                    <span className="mono m-label">Watch</span>
                    <span>
                      <strong>{t.player?.name}</strong> <span className="mono pos">{t.player?.pos}</span>
                      <span className="player-line"> · {t.player?.line}</span>
                    </span>
                  </div>
                  {t.trend?.length > 1 && (
                    <div className="m-trend">
                      <span className="mono m-label">Trend</span>
                      <Sparkline values={t.trend} color={t.color} />
                      <span className="mono m-trend-now">{t.trend.at(-1) > 0 ? '+' : ''}{t.trend.at(-1)} vs .500</span>
                    </div>
                  )}
                  <div className="mono m-meta">
                    {t.seed ? `${ordinal(t.seed)} in the ${division.name.split(' ')[0]} · ` : ''}
                    {t.form ? `Last ${t.form.split('-').reduce((a, b) => +a + +b, 0)}: ${t.form} · ` : ''}
                    Power rank #{t.rank}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default DivisionDetail;
