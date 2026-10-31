// Per-league configuration: reference data, how games are fetched, how form is measured,
// and the instructions Claude gets. Everything league-specific lives here.

import { NBA_TEAMS, NFL_TEAMS, normNba, normNfl } from './teams.mjs';

const RULES = `Return JSON only: an array of
{"abbr": string, "story": string, "player": {"name": string, "pos": string, "line": string}}.
Rules:
- story: one plain sentence, at most 110 characters, about where this team's season stands right now. Prefer what is most telling (an injury, trade or firing from the headlines, a streak, a record that doesn't match the point differential, a notable recent result).
- player: pick exactly one name from "Player candidates". line: at most 55 characters on why to watch them.
- Write scores winner first, the way box scores do: "lost 20-3 at SEA", "beat GB 27-19".
- Start with the team's nickname ("The Pistons are 5-1..."), not its abbreviation or city shorthand. Opponents can be abbreviations.
- Headlines often describe the opponent in a game. Only use news that is about THIS team's own players, coaches or front office; never attribute another team's injury or move to this team.
- Use ONLY facts in the packet. Every number you write must appear in the packet. Do not guess injuries, trades, coaches or anything not stated. No hype words, no exclamation marks.`;

export const NFL = {
  key: 'nfl',
  name: 'NFL',
  sportPath: 'football/nfl',
  teams: NFL_TEAMS,
  norm: normNfl,
  teamCount: 32,
  conferences: [
    { abbr: 'AFC', name: 'American Football Conference' },
    { abbr: 'NFC', name: 'National Football Conference' },
  ],
  divisions: ['East', 'North', 'South', 'West'],
  form: 'weeks',
  units: { passing: 'passing yds', rushing: 'rushing yds', receiving: 'receiving yds' },
  power: { pd: 0.45, pct: 0.35, heat: 0.2 },
  powerNote: 'computed from point differential (45%), record (35%) and recent form (20%)',
  formNote: "Hot/cold reads each team's last three weeks, weighting the latest game most and factoring in margin.",
  system: `You write one-line team summaries for a phone-first NFL dashboard. For each team you get a fact packet.\n${RULES}\n- Player line example: "150 yds and a TD vs KC".`,
};

export const NBA = {
  key: 'nba',
  name: 'NBA',
  sportPath: 'basketball/nba',
  teams: NBA_TEAMS,
  norm: normNba,
  teamCount: 30,
  conferences: [
    { abbr: 'East', name: 'Eastern Conference' },
    { abbr: 'West', name: 'Western Conference' },
  ],
  divisionsByConf: {
    East: ['Atlantic', 'Central', 'Southeast'],
    West: ['Northwest', 'Pacific', 'Southwest'],
  },
  form: 'games',
  formN: 10,
  units: { points: 'pts', rebounds: 'reb', assists: 'ast' },
  power: { pd: 0.5, pct: 0.3, heat: 0.2 },
  powerNote: 'computed from point differential per game (50%), record (30%) and last 10 games (20%)',
  formNote: "Hot/cold reads each team's last 10 games, weighting recent games more and factoring in margin.",
  system: `You write one-line team summaries for a phone-first NBA dashboard. For each team you get a fact packet. It is early in the season, so small samples matter: say so rather than overstating.\n${RULES}\n- Player line example: "34 pts and 11 reb vs DEN".`,
  // NBA regular season windows (ESPN season type 2 filters out preseason anyway).
  seasons: { 2026: { start: '2026-10-20', end: '2027-04-11' } },
};

export const LEAGUES = { nfl: NFL, nba: NBA };

export function divisionsOf(league, confAbbr) {
  return league.divisionsByConf ? league.divisionsByConf[confAbbr] : league.divisions;
}
