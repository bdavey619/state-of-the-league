// Weekly recap: three league-wide storylines, written once a week from the week's changes and
// the current team storylines. No game scores or stat lines — big picture only.

import { callClaude } from './storylines.mjs';

const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

// NFL: the latest week whose games are all final. NBA: the Monday that starts the current week (PT).
export function recapKey(league, games, now = new Date()) {
  if (league.form === 'weeks') {
    const byWeek = {};
    for (const g of games) (byWeek[g.week] ||= []).push(g);
    const done = Object.keys(byWeek).map(Number).filter((w) => byWeek[w].every((g) => g.completed));
    const week = Math.max(0, ...done);
    return { key: `wk-${week}`, label: `Week ${week} recap` };
  }
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const monday = new Date(pt);
  monday.setDate(pt.getDate() - ((pt.getDay() + 6) % 7));
  const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  return { key: `wk-${iso}`, label: `Week of ${fmtDay.format(new Date(`${iso}T12:00:00Z`))}` };
}

export function recapFacts(conferences, events, league) {
  const lines = [];
  for (const c of conferences) {
    for (const d of c.divisions) {
      const lead = d.teams[0];
      lines.push(`${d.name}: led by ${lead.city} ${lead.name} (${lead.w}-${lead.l}${lead.t ? '-' + lead.t : ''}).`);
    }
  }
  const all = conferences.flatMap((c) => c.divisions.flatMap((d) => d.teams));
  const hot = all.filter((t) => t.heat === 'Hot').map((t) => t.name);
  const cold = all.filter((t) => t.heat === 'Cold').map((t) => t.name);
  lines.push(`Running hot: ${hot.join(', ') || 'none'}. Gone cold: ${cold.join(', ') || 'none'}.`);
  const top = [...all].sort((a, b) => a.rank - b.rank).slice(0, 5).map((t) => `${t.rank}. ${t.name}`);
  lines.push(`Power rankings top 5: ${top.join('; ')}.`);
  lines.push(`Changes this week:\n${events.map((e) => `- ${e.text}`).join('\n') || '- none recorded yet'}`);
  lines.push(`Team storylines:\n${all.map((t) => `- ${t.abbr} ${t.name} (${t.w}-${t.l}${t.t ? '-' + t.t : ''}): ${t.story}`).join('\n')}`);
  return `${league.name} — state of the league\n${lines.join('\n')}`;
}

const SYSTEM = (league) => `You write the weekly recap for a phone-first ${league.name} dashboard.
Return JSON only: {"bullets": [{"text": string, "teams": [team abbreviations]}]} with exactly 3 bullets.
Rules:
- Each bullet is one sentence, at most 140 characters, about a league-wide storyline: a race, a collapse, a surprise, a team whose record doesn't match how it's playing, an injury that changes a season.
- Big picture only. No game scores, no individual stat lines, no play-by-play. Records like 5-2 are fine.
- Refer to teams by nickname. Use ONLY facts in the packet; every number must appear in it. No hype words, no exclamation marks.
- "teams" lists the abbreviations of teams the bullet is about (from the packet).`;

const nums = (s) => (String(s).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) || []).map(Number);

export function validateRecap(out, facts, league) {
  const errs = [];
  const bullets = out?.bullets;
  if (!Array.isArray(bullets) || bullets.length < 2 || bullets.length > 4) return ['need 3 bullets'];
  const allowed = new Set(nums(facts));
  const maxGames = league.key === 'nba' ? 82 : 17;
  bullets.forEach((b, i) => {
    if (!b?.text || b.text.length > 160) errs.push(`bullet ${i + 1}: missing or too long`);
    const bad = nums(b?.text).filter((n) => !allowed.has(n));
    if (bad.length) errs.push(`bullet ${i + 1}: numbers not in facts: ${bad.join(', ')}`);
    for (const m of String(b?.text).matchAll(/\b(\d{1,3})-(\d{1,3})\b/g)) {
      if (Number(m[1]) + Number(m[2]) > maxGames) errs.push(`bullet ${i + 1}: looks like a game score (${m[0]})`);
    }
  });
  return errs;
}

export function fallbackRecap(events) {
  const top = [...events].sort((a, b) => b.weight - a.weight || String(b.at).localeCompare(String(a.at))).slice(0, 3);
  return top.map((e) => ({ text: e.text, teams: [e.abbr] }));
}

export async function writeRecap({ conferences, events, league, useAI, log = console.log }) {
  const facts = recapFacts(conferences, events, league);
  if (useAI && process.env.ANTHROPIC_API_KEY) {
    let feedback = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callClaude([facts], feedback, SYSTEM(league), { object: true });
        const errs = validateRecap(res, facts, league);
        if (!errs.length) return { bullets: res.bullets.map((b) => ({ text: b.text.trim(), teams: (b.teams || []).filter(Boolean) })), source: 'claude' };
        feedback = errs.join('\n');
        log(`  recap retry: ${feedback}`);
      } catch (e) {
        log(`  recap failed: ${e.message}`);
        break;
      }
    }
  }
  const bullets = fallbackRecap(events);
  return bullets.length ? { bullets, source: 'template' } : null;
}
