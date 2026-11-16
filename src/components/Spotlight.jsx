import { useMemo } from 'react';
import { useCountUp } from '../motion.js';
import { upcomingGames, whenLabel } from './MustWatch.jsx';

// The single best game to watch, front and center: big names in team colors and a Watch Score dial.
export function pickSpotlight(watch) {
  return upcomingGames(watch)[0] || null;
}

export default function Spotlight({ game, window: span }) {
  const now = useMemo(() => new Date(), [game?.id]);
  if (!game) return null;
  const live = new Date(game.kickoff) <= now;
  const when = whenLabel(game.kickoff, now);
  // Long names (Timberwolves, Trail Blazers) step the type down so they fit on one line.
  const longest = Math.max(game.away.name.length, game.home.name.length);
  const size = longest > 11 ? 'sp-xl' : longest > 9 ? 'sp-l' : '';
  const kicker = live ? 'On now' : game.tier === 'must' ? 'Must watch' : span === 'this week' ? 'Game of the week' : 'Best game coming up';

  return (
    <section
      className="spotlight"
      aria-label="Top game to watch"
      style={{ '--away': game.away.color, '--home': game.home.color }}
    >
      <div className="sp-glow" aria-hidden="true" />
      <div className="sp-head mono">
        <span className="sp-kicker">{live && <span className="sp-live" aria-hidden="true" />}{kicker}</span>
        <span className="sp-when">
          {live ? (game.network || 'Live') : when}
          {!live && game.network ? ` · ${game.network}` : ''}
          {game.gameNo ? ` · Game ${game.gameNo}` : ''}
        </span>
      </div>

      <div className="sp-main">
        <div className={`sp-teams ${size}`}>
          <Team t={game.away} />
          <span className="mono sp-at">at</span>
          <Team t={game.home} />
        </div>
        <Dial score={game.score} tier={game.tier} />
      </div>

      {game.reasons?.length > 0 && (
        <div className="sp-tags">
          {game.reasons.map((r) => <span key={r} className="sp-tag">{r}</span>)}
        </div>
      )}
    </section>
  );
}

function Team({ t }) {
  return (
    <div className="sp-team">
      <span className="sp-bar" style={{ background: t.color }} aria-hidden="true" />
      <span className="sp-name">{t.name}</span>
      <span className="mono sp-rec">{t.rec}</span>
    </div>
  );
}

// Ring fills to the score as the number counts up.
function Dial({ score, tier }) {
  const shown = useCountUp(score, { duration: 1100, delay: 200 });
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className={`sp-dial tier-${tier}`} role="img" aria-label={`Watch Score ${score} out of 100`}>
      <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} className="sp-track" />
        <circle
          cx="48" cy="48" r={r} className="sp-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <span className="mono sp-score">{shown}</span>
      <span className="mono sp-label">Watch score</span>
    </div>
  );
}
