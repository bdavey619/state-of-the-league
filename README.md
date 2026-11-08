# State of the League

A phone-first, one-page read on every NFL and NBA team: standings or power rankings at a glance,
then tap a division to see its teams, each with a storyline, a player to watch, and its next game.
`#nfl` and `#nba` in the address pick the league.

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
- **Division order and NBA conference seeds** use win percentage, then point differential (not the
  leagues' full tiebreakers).

### What changed (and the weekly recap)

Every refresh stores a compact snapshot in `pipeline/history/<league>.json` and compares it with the
previous one. Only shifts are recorded, never game results: a new division leader, an unbeaten run
ending or a first win, a team turning hot or cold, a power-rank move of 4+ (NFL) / 5+ (NBA), and streak
milestones. Events are kept for three weeks. On the site, a one-line banner shows the ones newer than
your last visit (remembered per browser); otherwise it shows the weekly recap.

The recap is three league-wide storylines written by Claude once a week (NFL: after the week's last
game; NBA: each Monday) from the week's changes and the current team storylines. Checks reject game
scores and any number that isn't in the facts. It is also rewritten mid-week after a major change
(lead change, unbeaten run ending, first win) so it never contradicts the standings. `--force-recap`
(or the workflow's *force_recap* option) rewrites it on demand.

### NBA differences

- Games come from ESPN's scoreboard one day at a time, opening night through a week ahead.
- Hot/cold reads the last 10 games instead of the last three weeks; detail shows the conference seed
  and last-10 record.
- **Trends**: a third at-a-glance view charts each team's games over .500 after every game (one line
  per team, per division), with a sparkline in each team's details.
- Power rank is computed (point differential per game 50%, record 30%, last 10 20%) unless
  `pipeline/overrides/nba-power.json` has `"validThrough": "YYYY-MM-DD"` on or after today.
- Storylines refresh whenever a team plays, so most NBA teams get a new one every couple of days.

### Must watch (both leagues)

Every upcoming game in the window (next 48 hours for the NBA, this week for the NFL) gets a **Watch Score** from 0 to 100 (`pipeline/lib/watch.mjs`):

| Part | NBA | NFL | What it measures |
| --- | --- | --- | --- |
| Quality | 35% | 45% | Both teams' power ranks, leaning on the weaker team |
| Closeness | 25% | 25% | Projected margin from point differential per game, plus home edge |
| Stakes | 20% | 20% | Division lead on the line, top-6 seeding battle, unbeaten runs, win streaks |
| Form | 10% | 10% | Both teams' hot/cold |
| Stars | 10% | — | Players from the top-25 dominance list |

80+ is a **must watch**, 65+ is **worth a look**. Each game carries up to three plain-English reasons. The site shows the top three or four that haven't finished, scoring 40 or more.

### Dominant players (NBA)

Each refresh pulls the box score of every completed game from ESPN's summary endpoint and caches it in `pipeline/cache/nba-box.json`, so each game is only fetched once. Players are ranked by average **Game Score** (John Hollinger's one-number box-score rating), minimum 3 games and 60% of their team's games. A player is "heating up" or "cooling off" when his last five games are 4+ Game Score above or below his season average. The same averages feed each team's player to watch.

## Run it

Add `--now=2026-10-30T18:00:00Z` to a fixture run to pretend it's a different time (handy for testing Must watch).

```bash
npm install
npm run dev                 # site at localhost:5173, using public/data/nfl.json
npm test                    # pipeline unit tests (no network)

npm run data:nfl:dry        # fetch ESPN, template storylines (no API key needed)
npm run data:nba:dry
ANTHROPIC_API_KEY=... npm run data:nfl     # fetch ESPN + Claude storylines
ANTHROPIC_API_KEY=... npm run data:nba
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
