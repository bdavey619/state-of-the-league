// Storylines and players to watch. Claude writes them from a fact packet built only from
// fetched data; every output is checked against that packet and falls back to a template
// sentence if it fails. (Lesson from the MLB brief: never let the model add facts.)

import { signed } from './model.mjs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const ORD = ['', '1st', '2nd', '3rd', '4th'];

const rec = (t) => `${t.w}-${t.l}${t.t ? '-' + t.t : ''}`;
const fmtGame = (g) => g.result === 'BYE'
  ? `Wk${g.week} bye`
  : `Wk${g.week} ${g.result} ${g.for}-${g.against} ${g.home ? 'vs' : 'at'} ${g.opp}`;

export function factPacket(t, { notes = [], news = [], now = new Date() } = {}) {
  const recentNews = news
    .filter((n) => !n.published || now - new Date(n.published) < 10 * 86400000)
    .slice(0, 4)
    .map((n) => `- ${n.headline}${n.description ? ': ' + n.description : ''}`);
  const players = t.leaderList.map((p) =>
    `- ${p.name} (${p.pos || '?'}): led the team in ${p.kinds.join('/')} in ${p.games} games, ${p.yards} yards in those games. Latest: ${p.lastLine}`);
  return [
    `TEAM ${t.abbr} — ${t.city} ${t.name}`,
    `Record ${rec(t)}, ${ORD[t.place] || t.place} in ${t.conf} ${t.div}. Points ${t.pf}-${t.pa} (differential ${signed(t.pd)}). Streak ${t.streak || 'none'}. Power rank ${t.rank} of 32. Form: ${t.heat}.`,
    `Last three weeks: ${t.last3.map(fmtGame).join('; ') || 'none'}.`,
    ...notes.map((n) => `Note: ${n}`),
    t.next ? `Next: ${t.next.home ? 'vs' : 'at'} ${t.next.opp}.` : 'Next: season over.',
    recentNews.length ? `Recent ESPN headlines:\n${recentNews.join('\n')}` : 'Recent ESPN headlines: none.',
    `Player candidates (choose exactly one):\n${players.join('\n') || '- none'}`,
  ].join('\n');
}

const SYSTEM = `You write one-line team summaries for a phone-first NFL dashboard.
For each team you get a fact packet. Return JSON only: an array of
{"abbr": string, "story": string, "player": {"name": string, "pos": string, "line": string}}.
Rules:
- story: one plain sentence, at most 110 characters, about where this team's season stands right now. Prefer what is most telling (an injury or firing from the headlines, a streak, a record that doesn't match the point differential, a notable recent result).
- player: pick exactly one name from "Player candidates". line: at most 55 characters on why to watch them, e.g. "150 yds and a TD vs KC".
- Use ONLY facts in the packet. Every number you write must appear in the packet. Do not guess injuries, trades, coaches or anything not stated. No hype words, no exclamation marks.`;

function extractNumbers(s) {
  return (String(s).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

export function validate(item, team, packet) {
  const errs = [];
  if (!item || typeof item.story !== 'string' || !item.story.trim()) errs.push('missing story');
  if (item?.story && item.story.length > 130) errs.push('story too long');
  const names = team.leaderList.map((p) => p.name);
  if (!item?.player?.name || !names.includes(item.player.name)) errs.push('player not in candidates');
  if (item?.player?.line && item.player.line.length > 70) errs.push('player line too long');
  const allowed = new Set(extractNumbers(packet));
  const bad = extractNumbers(`${item?.story || ''} ${item?.player?.line || ''}`).filter((n) => !allowed.has(n));
  if (bad.length) errs.push(`numbers not in facts: ${bad.join(', ')}`);
  return errs;
}

export function fallback(team, notes = []) {
  const last = team.games.at(-1);
  let story;
  if (notes.some((n) => n.startsWith('The only unbeaten'))) story = `The last unbeaten team at ${rec(team)}.`;
  else if (notes.some((n) => n.startsWith('The only winless'))) story = `The only winless team, now ${rec(team)}.`;
  else if (/^[WL][3-9]/.test(team.streak)) story = `${team.streak[0] === 'W' ? 'Won' : 'Lost'} ${team.streak.slice(1)} straight; ${signed(team.pd)} on the season.`;
  else if (notes.some((n) => n.startsWith('Record is better'))) story = `${rec(team)}, though a ${signed(team.pd)} point differential says they've been fortunate.`;
  else if (notes.some((n) => n.startsWith('Better than the record'))) story = team.pd > 0
    ? `Better than ${rec(team)}: they've outscored opponents by ${team.pd}.`
    : `${rec(team)}, but only ${signed(team.pd)} on points; close losses have hurt.`;
  else if (last) story = `${last.result === 'W' ? 'Beat' : last.result === 'L' ? 'Lost to' : 'Tied'} ${last.opp} ${Math.max(last.for, last.against)}-${Math.min(last.for, last.against)} last time out; ${signed(team.pd)} on the season.`;
  else story = 'Season just getting started.';
  const p = team.leaderList[0];
  return {
    abbr: team.abbr,
    story,
    player: p ? { name: p.name, pos: p.pos, line: `Team's ${p.kinds[0]} leader: ${p.yards} yds` } : { name: '', pos: '', line: '' },
    source: 'template',
  };
}

async function callClaude(packets, feedback) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callClaudeOnce(packets, feedback);
    } catch (e) {
      if (attempt >= 3 || !e.retryable) throw e;
      await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
    }
  }
}

async function callClaudeOnce(packets, feedback) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: packets.join('\n\n---\n\n') + (feedback ? `\n\nYour previous answer had problems; fix them:\n${feedback}` : ''),
      }],
    }),
  });
  if (!res.ok) {
    const err = new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const json = await res.json();
  const text = (json.content || []).map((c) => c.text || '').join('');
  const body = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Could not parse JSON (stop_reason ${json.stop_reason}): ${text.slice(0, 200)}`);
  }
}

// Writes storylines for a group of teams (one division per call). Returns abbr → result.
export async function writeStorylines(group, ctx, { useAI = true, log = console.log, issues = [] } = {}) {
  const packets = group.map((t) => factPacket(t, { notes: ctx.notes[t.abbr], news: ctx.news[t.abbr] }));
  const out = {};
  if (useAI && process.env.ANTHROPIC_API_KEY) {
    let feedback = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      let items = [];
      try {
        items = await callClaude(packets, feedback);
      } catch (e) {
        log(`  Claude call failed: ${e.message}`);
        issues.push({ teams: group.map((t) => t.abbr), error: e.message });
        break;
      }
      const problems = [];
      group.forEach((t, i) => {
        if (out[t.abbr]) return;
        const item = items.find((x) => x?.abbr === t.abbr);
        const errs = validate(item, t, packets[i]);
        if (errs.length) problems.push(`${t.abbr}: ${errs.join('; ')}`);
        else {
          const cand = t.leaderList.find((p) => p.name === item.player.name);
          out[t.abbr] = { abbr: t.abbr, story: item.story.trim(), player: { name: cand.name, pos: cand.pos || item.player.pos || '', line: item.player.line.trim() }, source: 'claude' };
        }
      });
      if (!problems.length) break;
      feedback = problems.join('\n');
      log(`  retrying: ${feedback}`);
      issues.push({ attempt: attempt + 1, problems });
    }
  }
  for (const t of group) if (!out[t.abbr]) out[t.abbr] = fallback(t, ctx.notes[t.abbr]);
  return out;
}

// Cache key: storyline only needs rewriting when the team's latest result or next game changes.
export function storyKey(team) {
  return `${team.games.at(-1)?.id || 'none'}|${team.next?.gameId || 'none'}`;
}
