import { useEffect, useMemo, useRef, useState } from 'react';
import Glance from './components/Glance.jsx';
import Conference from './components/Conference.jsx';
import DivisionDetail from './components/DivisionDetail.jsx';
import { divisionId, updatedLabel } from './format.js';

const LEAGUES = ['nfl', 'nba'];

function leagueFromHash() {
  const h = window.location.hash.replace('#', '').toLowerCase();
  return LEAGUES.includes(h) ? h : null;
}

export default function App() {
  const [league, setLeague] = useState(() => leagueFromHash() || store.get('league') || 'nfl');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('standings');
  const [division, setDivision] = useState(() => store.get(`${league}:division`));
  const [openTeam, setOpenTeam] = useState(null);
  const panelRef = useRef(null);

  // #nfl / #nba in the address picks the league, so each one can be bookmarked.
  useEffect(() => {
    const onHash = () => {
      const l = leagueFromHash();
      if (l) setLeague(l);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    store.set('league', league);
    setData(null);
    setError(null);
    setOpenTeam(null);
    setDivision(store.get(`${league}:division`));
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/${league}.json`, { cache: 'no-cache' })
      .then((r) => {
        if (r.status === 404) throw new Error('not-yet');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [league]);

  const divisions = useMemo(() => (data ? data.conferences.flatMap((c) => c.divisions) : []), [data]);
  const selectedDivision = divisions.find((d) => d.name === division) || null;

  function pick(name, abbr = null) {
    setDivision(name);
    setOpenTeam(abbr);
    store.set(`${league}:division`, name);
    const wide = window.matchMedia('(min-width: 761px)').matches;
    const target = wide ? document.getElementById(divisionId(name)) : panelRef.current;
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const name = league.toUpperCase();
  const badge = data ? data.badge || (data.week ? `WK ${data.week}` : '') : '';
  const kicker = data ? data.kicker || `Week ${data.week} · ${data.throughLabel}` : '';

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-name">State of the League</span>
            {badge && <span className="mono brand-week">{badge}</span>}
          </div>
          <nav className="league-switch" aria-label="League">
            {LEAGUES.map((l) => (
              <a
                key={l}
                className={`mono league${l === league ? ' on' : ''}`}
                href={`#${l}`}
                aria-current={l === league ? 'page' : undefined}
              >
                {l.toUpperCase()}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="top" className="main">
        {error === 'not-yet' && <p className="notice">{name} data is on its way. Check back after the next update.</p>}
        {error && error !== 'not-yet' && <p className="notice">Couldn’t load the latest data ({error}).</p>}
        {!data && !error && <p className="notice">Loading…</p>}
        {data && (
          <>
            <div className="intro">
              <div className="mono kicker">{kicker} · your local time</div>
              <h1>The state of the {data.league || name}</h1>
            </div>

            <Glance
              conferences={data.conferences}
              view={view}
              setView={setView}
              selected={division}
              onPick={pick}
            />

            <div className="desktop-only">
              {data.conferences.map((c) => (
                <Conference key={c.abbr} conf={c} />
              ))}
            </div>

            <div className="mobile-only">
              <DivisionDetail
                ref={panelRef}
                division={selectedDivision}
                openTeam={openTeam}
                setOpenTeam={setOpenTeam}
                leagueKey={league}
              />
            </div>

            <footer className="footer">
              <p>
                {data.formNote || 'Hot/cold reads each team’s last three weeks, weighting the latest game most and factoring in margin.'}{' '}
                Power rank: {data.powerSource}.
              </p>
              <p>
                Updated {updatedLabel(data.updatedAt)}. Scores and schedule from ESPN. Storylines
                {data.aiStorylines ? ' are written by Claude from those facts' : ' are written from those facts'}.
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

// Remembers your league and the last division you opened in each (per browser).
const store = {
  get(key) {
    try { return localStorage.getItem(`sotl:${key}`); } catch { return null; }
  },
  set(key, v) {
    try { localStorage.setItem(`sotl:${key}`, v); } catch { /* private mode */ }
  },
};
