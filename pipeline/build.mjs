#!/usr/bin/env node
// Builds public/data/<league>.json.
//
//   node pipeline/build.mjs --league=nfl         fetch ESPN, write storylines with Claude
//   node pipeline/build.mjs --league=nba
//   --no-ai           template storylines only (no API key needed)
//   --force-stories   rewrite every storyline, ignoring the cache
//   --games=path      use a saved games file instead of fetching
//   --season=2026     season start year
//   --out=path --cache=path                     write somewhere else (used by the smoke test)
//
// Env: ANTHROPIC_API_KEY (optional), ANTHROPIC_MODEL (default claude-sonnet-5-5).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDay, fetchTeamNews, fetchWeek } from './lib/espn.mjs';
import { LEAGUES } from './lib/leagues.mjs';
import { arrange, buildTeams, leagueNotes, seasonState } from './lib/model.mjs';
import { applyPower } from './lib/power.mjs';
import { storyKey, writeStorylines } from './lib/storylines.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const league = LEAGUES[String(args.league || 'nfl').toLowerCase()];
if (!league) throw new Error(`Unknown --league=${args.league}`);
const K = league.key;
const now = new Date();
const season = Number(args.season) || (now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1);
const paths = {
  out: resolve(ROOT, args.out || `public/data/${K}.json`),
  games: resolve(ROOT, `pipeline/cache/${K}-games.json`),
  stories: resolve(ROOT, args.cache || `pipeline/cache/${K}-storylines.json`),
  power: resolve(ROOT, `pipeline/overrides/${K}-power.json`),
  runLog: resolve(ROOT, args.runlog || `pipeline/cache/${K}-run-log.json`),
};

async function readJSON(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}
async function writeJSON(p, data) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');

async function loadGames() {
  if (args.games) return readJSON(resolve(ROOT, args.games), []);
  const games = [];
  if (league.form === 'weeks') {
    for (let week = 1; week <= 18; week++) {
      const wk = await fetchWeek(season, week, league);
      games.push(...wk);
      process.stdout.write(`week ${week}: ${wk.length} games\n`);
    }
  } else {
    // Day by day from opening night through a week from now (for next games).
    const window = league.seasons?.[season] || { start: `${season}-10-15`, end: `${season + 1}-04-20` };
    const start = new Date(`${window.start}T12:00:00Z`);
    const stop = new Date(Math.min(new Date(`${window.end}T12:00:00Z`), now.getTime() + 8 * 86400000));
    for (let d = start; d <= stop; d = new Date(d.getTime() + 86400000)) {
      const day = await fetchDay(ymd(d), league);
      games.push(...day);
      await new Promise((r) => setTimeout(r, 120));
    }
    process.stdout.write(`${K}: ${games.length} games from ${window.start} to ${ymd(stop)}\n`);
  }
  if (!games.length) throw new Error(`No games returned for ${season}. Is the season right?`);
  await writeJSON(paths.games, games);
  return games;
}

const throughFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
const seasonLabel = league.form === 'weeks' ? `${season}` : `${season}-${String(season + 1).slice(2)}`;

async function main() {
  const games = await loadGames();
  const state = seasonState(games);
  const teams = buildTeams(games, league);
  const powerSource = applyPower(teams, await readJSON(paths.power, null), state.currentWeek, league);
  const conferences = arrange(teams, league);
  const notes = leagueNotes(teams, league);

  // Storylines: reuse cached ones unless the team's latest result or next game changed.
  const cache = args['force-stories'] ? {} : await readJSON(paths.stories, {});
  const useAI = !args['no-ai'];
  const news = {};
  let aiCount = 0;
  const issues = [];
  for (const conf of conferences) {
    for (const div of conf.divisions) {
      const stale = div.teams.filter((t) => cache[t.abbr]?.key !== storyKey(t) || (useAI && cache[t.abbr]?.result?.source !== 'claude' && process.env.ANTHROPIC_API_KEY));
      if (!stale.length) continue;
      if (useAI && process.env.ANTHROPIC_API_KEY) {
        for (const t of div.teams) news[t.abbr] = await fetchTeamNews(t.espnId, 6, league);
      }
      console.log(`storylines: ${div.name} (${stale.map((t) => t.abbr).join(', ')})`);
      // Send the whole division so Claude sees rivals in context, but only store stale ones.
      const results = await writeStorylines(div.teams, { notes, news }, { useAI, issues, league });
      for (const t of stale) cache[t.abbr] = { key: storyKey(t), result: results[t.abbr] };
    }
  }
  await writeJSON(paths.stories, cache);

  const through = state.lastCompletedDate ? `through ${throughFmt.format(new Date(state.lastCompletedDate))}` : 'preseason';
  const out = {
    league: league.name,
    season,
    seasonLabel,
    week: league.form === 'weeks' ? state.currentWeek : null,
    badge: league.form === 'weeks' ? `WK ${state.currentWeek}` : seasonLabel,
    kicker: league.form === 'weeks' ? `Week ${state.currentWeek} · ${through}` : `${seasonLabel} · ${through}`,
    throughLabel: through,
    formNote: league.formNote,
    updatedAt: now.toISOString(),
    powerSource,
    aiStorylines: false,
    conferences: conferences.map((c) => ({
      abbr: c.abbr,
      name: c.name,
      divisions: c.divisions.map((d) => ({
        name: d.name,
        teams: d.teams.map((t) => {
          const s = cache[t.abbr].result;
          if (s.source === 'claude') aiCount++;
          return {
            abbr: t.abbr, city: t.city, name: t.name, color: t.color,
            w: t.w, l: t.l, t: t.t, pf: t.pf, pa: t.pa,
            rank: t.rank, heat: t.heat,
            seed: league.key === 'nba' ? t.seed : undefined,
            form: league.form === 'games' ? t.lastNRecord : undefined,
            last3: t.last3,
            story: s.story,
            player: s.player,
            next: t.next ? { opp: t.next.opp, home: t.next.home, kickoff: t.next.kickoff, network: t.next.network } : null,
          };
        }),
      })),
    })),
  };
  out.aiStorylines = aiCount > league.teamCount / 2;
  await writeJSON(paths.out, out);
  await writeJSON(paths.runLog, { at: now.toISOString(), model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', claudeStories: aiCount, issues });
  console.log(`wrote ${paths.out}: ${out.kicker}, ${aiCount}/${league.teamCount} storylines from Claude, power: ${powerSource}`);
}

main().catch(async (e) => {
  console.error(e);
  // Leave a trace in the repo; the workflow commits this file even when a league fails.
  await writeJSON(paths.runLog, { at: now.toISOString(), failed: true, error: String(e?.stack || e) }).catch(() => {});
  process.exit(1);
});
