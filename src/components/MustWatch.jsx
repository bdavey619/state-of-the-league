import { useMemo } from 'react';
import { useCountUp } from '../motion.js';

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const time = (d) => TIME.format(d).replace(/\s?(AM|PM)$/, (_, p) => p[0].toLowerCase());

// "Tonight 7:00p", "Tomorrow 4:30p", "Sun 10:00a", or "Live" once it has tipped off.
export function whenLabel(iso, now) {
  const d = new Date(iso);
  if (d <= now) return 'Live now';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.floor((d - today) / 86400000);
  if (days === 0) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'} ${time(d)}`;
  if (days === 1) return `Tomorrow ${time(d)}`;
  return `${DAY.format(d)} ${time(d)}`;
}

const TIER = { must: 'Must watch', worth: 'Worth a look', other: '' };

// Games worth showing: not started yet, or tipped off in the last ~2.5 hours. When the same two
// teams meet twice in the window (an NBA two-game set), the later one is tagged "Game 2".
export function upcomingGames(watch, now = new Date()) {
  const games = (watch?.games || []).filter((g) => g.score >= 40 && new Date(g.kickoff) > now - 2.5 * 3600000);
  const pair = (g) => [g.away.abbr, g.home.abbr].sort().join('-');
  const byTime = [...games].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const count = {};
  const game = {};
  byTime.forEach((g) => { count[pair(g)] = (count[pair(g)] || 0) + 1; game[g.id] = count[pair(g)]; });
  return games.map((g) => (game[g.id] > 1 ? { ...g, gameNo: game[g.id] } : g));
}

// The best upcoming games by Watch Score: who's good, how close it should be, what's at stake.
// `skip` is the game already featured in the spotlight above.
export default function MustWatch({ watch, limit = 3, skip = null }) {
  const now = new Date();
  const games = useMemo(
    () => upcomingGames(watch, now).filter((g) => g.id !== skip).slice(0, limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watch, limit, skip],
  );
  if (!games.length) return null;

  return (
    <section className="card watch" aria-label="Must-watch games">
      <div className="section-head">
        <h2>Must watch</h2>
        <span className="mono section-sub">{watch.window}</span>
      </div>
      <ol className="watch-list">
        {games.map((g, i) => (
          <li key={g.id} className="watch-game">
            <Score score={g.score} tier={g.tier} delay={250 + i * 120} />
            <div className="watch-body">
              <div className="watch-teams">
                <Side t={g.away} />
                <span className="watch-at">@</span>
                <Side t={g.home} />
              </div>
              <div className="mono watch-meta">
                {whenLabel(g.kickoff, now)}
                {g.network ? ` · ${g.network}` : ''}
                {g.gameNo ? ` · Game ${g.gameNo}` : ''}
                {TIER[g.tier] ? <span className={`watch-tier tier-${g.tier}`}> · {TIER[g.tier]}</span> : null}
              </div>
              {g.reasons?.length > 0 && (
                <div className="watch-tags">
                  {g.reasons.map((r) => <span key={r} className="tag">{r}</span>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Score({ score, tier, delay }) {
  const shown = useCountUp(score, { duration: 800, delay });
  return (
    <div className={`mono watch-score tier-${tier}`} title="Watch Score, 0–100" aria-label={`Watch Score ${score}`}>
      {shown}
    </div>
  );
}

function Side({ t }) {
  return (
    <span className="watch-side">
      <span className="swatch" style={{ background: t.color }} aria-hidden="true" />
      <span className="watch-name">{t.name}</span>
      <span className="mono watch-rec">{t.rec}</span>
    </span>
  );
}
