import { nextLabel, record } from '../format.js';
import Heat from './Heat.jsx';

export default function Conference({ conf }) {
  return (
    <section className="conference" aria-labelledby={`h-${conf.abbr}`}>
      <h2 id={`h-${conf.abbr}`}>
        {conf.abbr} <span className="conf-name">{conf.name}</span>
      </h2>

      <div className="row row-head mono" aria-hidden="true">
        <span className="c-team">Team</span>
        <span className="c-story">Storyline</span>
        <span className="c-player">Player to watch</span>
        <span className="c-next">Next</span>
      </div>

      {conf.divisions.map((d) => (
        <div className="card division" key={d.name}>
          <div className="mono division-name">{d.name}</div>
          {d.teams.map((t) => {
            const next = nextLabel(t.next);
            return (
              <div className="row" key={t.abbr}>
                <div className="c-team team-cell">
                  <span className="swatch lg" style={{ background: t.color }} aria-hidden="true" />
                  <span className="name">{t.name}</span>
                  <span className="mono rec">{record(t)}</span>
                  <Heat label={t.heat} />
                </div>
                <p className="c-story story">{t.story}</p>
                <div className="c-player player">
                  <span>
                    <strong>{t.player?.name}</strong> <span className="mono pos">{t.player?.pos}</span>
                  </span>
                  <span className="player-line">{t.player?.line}</span>
                </div>
                <div className="c-next next">
                  <strong>{next.opp}</strong>
                  <span className="mono when">{next.when}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
