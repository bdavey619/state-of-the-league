import { useMemo, useState } from 'react';
import { nextLabel, record } from '../format.js';
import Heat from './Heat.jsx';

// Phone layout: one compact line per team; tap to open its storyline and player to watch.
export default function MobileList({ conferences, view }) {
  const [open, setOpen] = useState(null);

  const groups = useMemo(() => {
    const divisions = conferences.flatMap((c) => c.divisions);
    if (view === 'standings') return divisions.map((d) => ({ name: d.name, teams: d.teams }));
    const all = divisions.flatMap((d) => d.teams).sort((a, b) => a.rank - b.rank);
    return [{ name: 'Power rankings', teams: all }];
  }, [conferences, view]);

  return (
    <section className="m-list" aria-label="Teams">
      <h2 className="m-title">Every team</h2>

      {groups.map((g) => (
        <div className="m-group" key={g.name}>
          {view === 'standings' && <div className="mono m-group-name">{g.name}</div>}
          <div className="m-card">
            {g.teams.map((t) => {
              const isOpen = open === t.abbr;
              const next = nextLabel(t.next);
              return (
                <div className={`m-team${isOpen ? ' open' : ''}`} key={t.abbr}>
                  <button
                    type="button"
                    className="m-row"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : t.abbr)}
                  >
                    <span className="mono m-rank">{view === 'power' ? t.rank : `#${t.rank}`}</span>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mono legend">Tap a team for its storyline and player to watch</div>
    </section>
  );
}
