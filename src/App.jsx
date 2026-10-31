import { useEffect, useState } from 'react';
import Glance from './components/Glance.jsx';
import Conference from './components/Conference.jsx';
import MobileList from './components/MobileList.jsx';
import { updatedLabel } from './format.js';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nfl.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-name">State of the League</span>
            {data && <span className="mono brand-week">WK {data.week}</span>}
          </div>
          <nav className="league-switch" aria-label="League">
            <a className="mono league on" href="#top" aria-current="page">NFL</a>
            <span className="mono league">NBA soon</span>
          </nav>
        </div>
      </header>

      <main id="top" className="main">
        {error && <p className="notice">Couldn’t load the latest data ({error}).</p>}
        {!data && !error && <p className="notice">Loading…</p>}
        {data && (
          <>
            <div className="intro">
              <div className="mono kicker">
                Week {data.week} · {data.throughLabel} · your local time
              </div>
              <h1>The state of the NFL</h1>
            </div>

            <div className="desktop-only">
              <Glance conferences={data.conferences} />
              {data.conferences.map((c) => (
                <Conference key={c.abbr} conf={c} />
              ))}
            </div>

            <div className="mobile-only">
              <MobileList conferences={data.conferences} />
            </div>

            <footer className="footer">
              <p>
                Hot/cold reads each team’s last three weeks, weighting the latest game most and
                factoring in margin. Power rank: {data.powerSource}.
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
