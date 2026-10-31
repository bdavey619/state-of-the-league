# State of the League

A phone-first, one-page read on every NFL team: standings or power rankings at a glance, then one
line per team with its storyline, a player to watch, and its next game. NBA comes next.

## How it works

```
ESPN scoreboard (weeks 1–18) ─┐
                              ├─> pipeline/build-nfl.mjs ──> public/data/nfl.json ──> React page
ESPN team news (headlines) ───┤        │
Claude (storylines) ──────────┘        └─ pipeline/cache/nfl-storylines.json
```

- **Records, points, last three weeks, next game** come from ESPN's public scoreboard. No API key.
- **Hot/cold** (`pipeline/lib/heat.mjs`): the team's last three calendar weeks, newest weighted most;
  each game counts win/loss plus margin, capped at 21 points. Byes count as nothing.
- **Power rank** (`pipeline/lib/power.mjs`): if `pipeline/overrides/nfl-power.json` matches the
  current week, those ranks are used (paste a consensus ranking there each Tuesday). Otherwise it is
  computed from point differential per game (45%), win pct (35%) and form (20%).
- **Storylines and players to watch** (`pipeline/lib/storylines.mjs`): Claude gets a fact packet per
  team (record, last three games, league-wide notes, recent ESPN headlines, and the team's statistical
  leaders) and writes one sentence plus one player. Every answer is checked: the player must be one of
  the listed leaders and every number must appear in the facts. Failures get one retry, then a template
  sentence. Storylines are cached and only rewritten when a team's latest result or next game changes.
- **Division order** uses win percentage, then point differential (not the NFL's full tiebreakers).

## Run it

```bash
npm install
npm run dev                 # site at localhost:5173, using public/data/nfl.json
npm test                    # pipeline unit tests (no network)

npm run data:nfl:dry        # fetch ESPN, template storylines (no API key needed)
ANTHROPIC_API_KEY=... npm run data:nfl     # fetch ESPN + Claude storylines
npm run data:nfl -- --force-stories        # rewrite every storyline
```

The checked-in `public/data/nfl.json` is a hand-checked snapshot through Thursday, Oct 29, 2026
(week 8), so the site works before the pipeline has ever run.

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → add `ANTHROPIC_API_KEY`.
   Optional variable: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
4. Actions → **Update data and deploy** → Run workflow.

The workflow runs daily and late Sunday/Monday night: it refreshes the data, commits it, builds and
deploys. A push to `main` just rebuilds and deploys.

## Notes

- ESPN's site API is public but undocumented; parsing is defensive and `npm test` covers the shapes
  this relies on (`pipeline/fixtures/espn-event.json`). The build stops if ESPN returns no games, so a
  broken fetch never overwrites good data.
- Team abbreviations follow ESPN (Washington is `WSH`).
- Team colors are decorative swatches only.
