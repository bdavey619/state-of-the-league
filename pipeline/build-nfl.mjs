#!/usr/bin/env node
// Builds public/data/nfl.json.
//
//   node pipeline/build-nfl.mjs                 fetch ESPN, write storylines with Claude
//   node pipeline/build-nfl.mjs --no-ai         template storylines only (no API key needed)
//   node pipeline/build-nfl.mjs --force-stories rewrite every storyline, ignoring the cache
//   node pipeline/build-nfl.mjs --games=path    use a saved games file instead of fetching
//   node pipeline/build-nfl.mjs --season=2026
//   --out=path --cache=path                     write somewhere else (used by the smoke test)
//
// Env: ANTHROPIC_API_KEY (optional), ANTHROPIC_MODEL (default claude-sonnet-5-5).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTeamNews, fetchWeek } from './lib/espn.mjs';
import { arrange, buildTeams, leagueNotes, seasonState } from './lib/model.mjs';
import { applyPower } from './lib/power.mjs';
import { storyKey, writeStorylines } from './lib/storylines.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const now = new Date();
const season = Number(args.season) || (now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1);
const paths = {
  out: resolve(ROOT, args.out || 'public/data/nfl.json'),
  games: resolve(ROOT, 'pipeline/cache/nfl-games.json'),
  stories: resolve(ROOT, args.cache || 'pipeline/cache/nfl-storylines.json'),
  power: resolve(ROOT, 'pipeline/overrides/nfl-power.json'),
  runLog: resolve(ROOT, args.runlog || 'pipeline/cache/nfl-run-log.json'),
};

async function readJSON(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}
async function writeJSON(p, data) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

async function loadGames() {
  if (args.games) return readJSON(resolve(ROOT, args.games), []);
  const games = [];
  for (let week = 1; week <= 18; week++) {
    const wk = await fetchWeek(season, week);
    games.push(...wk);
    process.stdout.write(`week ${week}: ${wk.length} games\n`);
  }
  if (!games.length) throw new Error(`No games returned for ${season}. Is the season right?`);
  await writeJSON(paths.games, games);
  return games;
}

const throughFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

async function main() {
  const games = await loadGames();
  const state = seasonState(games);
  const teams = buildTeams(games);
  const powerSource = applyPower(teams, await readJSON(paths.power, null), state.currentWeek);
  const conferences = arrange(teams);
  const notes = leagueNotes(teams);

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
        for (const t of div.teams) news[t.abbr] = await fetchTeamNews(t.espnId);
      }
      console.log(`storylines: ${div.name} (${stale.map((t) => t.abbr).join(', ')})`);
      // Send the whole division so Claude sees rivals in context, but only store stale ones.
      const results = await writeStorylines(div.teams, { notes, news }, { useAI, issues });
      for (const t of stale) cache[t.abbr] = { key: storyKey(t), result: results[t.abbr] };
    }
  }
  await writeJSON(paths.stories, cache);

  const out = {
    league: 'NFL',
    season,
    week: state.currentWeek,
    throughLabel: state.lastCompletedDate ? `through ${throughFmt.format(new Date(state.lastCompletedDate))}` : 'preseason',
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
            last3: t.last3,
            story: s.story,
            player: s.player,
            next: t.next ? { opp: t.next.opp, home: t.next.home, kickoff: t.next.kickoff, network: t.next.network } : null,
          };
        }),
      })),
    })),
  };
  out.aiStorylines = aiCount > 16;
  await writeJSON(paths.out, out);
  await writeJSON(paths.runLog, { at: now.toISOString(), model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', claudeStories: aiCount, issues });
  console.log(`wrote ${paths.out}: week ${out.week}, ${aiCount}/32 storylines from Claude, power: ${powerSource}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
