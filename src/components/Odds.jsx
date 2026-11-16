import { useEffect, useState } from 'react';

const GAMMA = 'https://gamma-api.polymarket.com';
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function money(n) {
  if (!n) return null;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

// Snapshot from the last data refresh, then live prices straight from Polymarket when the
// browser can reach it (every minute while the game is on, every 5 minutes before).
function useLiveOdds(pm, live) {
  const [odds, setOdds] = useState({ away: pm.away, home: pm.home, at: pm.at, live: false });
  useEffect(() => {
    if (!pm.marketSlug || !pm.sides) return undefined;
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`${GAMMA}/markets?slug=${encodeURIComponent(pm.marketSlug)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const [m] = await r.json();
        const prices = JSON.parse(m?.outcomePrices || 'null');
        if (!prices || prices.length !== 2 || stop) return;
        const p = Object.fromEntries(pm.sides.map((s, i) => [s, Number(prices[i])]));
        const total = p.away + p.home;
        if (!(total > 0)) return;
        setOdds({ away: p.away / total, home: p.home / total, at: new Date().toISOString(), live: true });
      } catch { /* keep the snapshot */ }
    };
    load();
    const id = setInterval(load, live ? 60000 : 300000);
    return () => { stop = true; clearInterval(id); };
  }, [pm.marketSlug, live]);
  return odds;
}

// Split bar in team colors: each side's chance to win, as priced on Polymarket.
export default function Odds({ pm, away, home, live }) {
  const odds = useLiveOdds(pm, live);
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 350); return () => clearTimeout(t); }, []);
  const a = Math.round(odds.away * 100);
  const h = 100 - a;
  const vol = money(pm.volume);

  return (
    <a className="sp-odds" href={pm.url} target="_blank" rel="noopener noreferrer"
      aria-label={`Polymarket: ${away.name} ${a}%, ${home.name} ${h}%. Opens Polymarket.`}>
      <div className="mono sp-odds-head">
        <span>Polymarket{odds.live && <span className="sp-odds-live"> · live</span>}</span>
        <span className="sp-odds-meta">
          {vol ? `${vol} traded` : 'Win chance'}
          {!odds.live && odds.at ? ` · ${TIME.format(new Date(odds.at)).replace(/\s?(AM|PM)$/, (_, p) => p[0].toLowerCase())}` : ''}
          <span aria-hidden="true"> ↗</span>
        </span>
      </div>
      <div className="sp-odds-bar" aria-hidden="true">
        <span className="sp-odds-side" style={{ flexBasis: `${shown ? a : 50}%`, background: away.color }}>
          <b className="mono">{away.abbr} {a}%</b>
        </span>
        <span className="sp-odds-side home" style={{ flexBasis: `${shown ? h : 50}%`, background: home.color }}>
          <b className="mono">{h}% {home.abbr}</b>
        </span>
      </div>
    </a>
  );
}
