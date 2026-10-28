// Everything the daily generator needs that isn't file handling. No dependencies.

// The card's PRNG and delusion levels, copied from index.html. The leaderboard
// links each row to a card, and the card only shows the row's number if both
// sides agree on these. tests/card.test.mjs fails if they drift apart.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LEVELS = [
  { label: 'Humble brag', min: 9, max: 480 },
  { label: 'Indie hacker', min: 1200, max: 9800 },
  { label: 'Thread guy', min: 12000, max: 96000 },
  { label: 'Series A (in my head)', min: 140000, max: 4800000 },
];

export const CHARTS = ['hockey', 'wall', 'whale', 'crayon'];

// The card's own name field is capped at 24 characters.
export const MAX_NAME = 24;

// The amount the card at index.html draws for a seed and a delusion level.
export function cardAmount(seed, d) {
  const lvl = LEVELS[d];
  return Math.round(lvl.min * Math.pow(lvl.max / lvl.min, mulberry32(seed >>> 0)()));
}

// FNV-1a, so every random choice can be keyed by a string like a date.
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const rng = (key) => mulberry32(hash(key));

function gauss(rnd) {
  const u = 1 - rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// Fictional projects only. Names are the joke, never a real product.
export const PROJECTS = [
  ['ai-wrapper', 'AI Wrapper #7'],
  ['directories', 'Directory of Directories'],
  ['todo-again', 'Todo App (Again)'],
  ['habit-tracker', 'Habit Tracker #41'],
  ['boilerplate', 'Boilerplate Boilerplate'],
  ['waitlist', 'Waitlist, No Product'],
  ['dashboards', 'Dashboard of Dashboards'],
  ['pomodoro', 'Pomodoro but Angrier'],
  ['crm-for-one', 'CRM for One'],
  ['newsletter', 'Newsletter Newsletter'],
  ['courses', 'Course About Courses'],
  ['dark-mode', 'Dark Mode as a Service'],
  ['vibe-crm', 'Vibe Coded CRM'],
  ['side-project', 'Side Project #14'],
  ['weekend-hack', 'Weekend Hack, Day 400'],
  ['blue-calendar', 'Calendar but Blue'],
  ['deck-gen', 'Deck Generator Generator'],
  ['email-reheater', 'Cold Email Reheater'],
  ['screenshot-maker', 'Revenue Screenshot Maker'],
  ['seo-robot', 'SEO Blog Robot'],
  ['fake-door', 'Fake Door Test'],
  ['timer-timer', 'Timer for Timers'],
  ['domain-2am', 'Domain I Bought at 2am'],
  ['wrapper-wrapper', 'Wrapper Wrapper'],
  ['ramen', 'Ramen Profitable Ramen'],
  ['invoice-thing', 'Invoice Thing v3'],
  ['landing-deluxe', 'Landing Page Deluxe'],
  ['agent-agents', 'Agent That Agents'],
  ['spreadsheet-ai', 'Spreadsheet, But AI'],
  ['linkpage', 'Yet Another Link Page'],
  ['moms-favorite', "Mom's Favorite SaaS"],
  ['name-picker', 'Startup Name Picker'],
  ['uptime-monitor', 'Uptime Monitor Monitor'],
  ['prompt-library', 'Prompt Library #12'],
  ['pivot-before-last', 'The Pivot Before Last'],
  ['feedback-widget', 'Unused Feedback Widget'],
];

export const TOP = 20;
const FLOOR = 9;
const CEILING = 4800000;

// Each project keeps its own temperament forever: a drift, a wobble, a chart.
function temperament(id) {
  const r = rng('temperament:' + id);
  return {
    drift: 0.004 + gauss(r) * 0.012,
    wobble: 0.05 + r() * 0.2,
    chart: CHARTS[Math.floor(r() * CHARTS.length)],
  };
}

const DROP_REASONS = [
  'mom cancels',
  'the free trial ends',
  'a cousin asks for a refund',
  'the one whale churns',
  'changing the font back',
  'a reply that just said "mid"',
  'forgetting to renew the domain',
  'the founder takes a nap',
  'the landing page 404s for a week',
  'admitting the chart was a mockup',
];

const CLIMB_REASONS = [
  'adding AI to the name',
  'a reply guy says "nice"',
  'raising the price to $9',
  'posting the same chart twice',
  'mom signs up again',
  'launching for the fourth time',
  'buying a .ai domain',
  'a thread with eleven emojis',
  'changing the button to green',
  'calling it "agentic"',
];

const VERIFIERS = ['me', 'my mom', 'a screenshot', 'vibes', 'trust me', 'my alt', 'a spreadsheet', 'the founder', 'nobody'];

// The pivot is a rename. Numbered names count up, the rest get AI bolted on.
export function pivotName(name) {
  const m = name.match(/^(.*#)(\d+)$/);
  if (m) return m[1] + (Number(m[2]) + 1);
  const options = [[' AI', 'AI'], ['Agentic ', 'Agentic'], [' for Dogs', 'for Dogs'], [' 2.0', '2.0']];
  for (const [bit, token] of options) {
    const next = bit.startsWith(' ') ? name + bit : bit + name;
    if (next.length <= MAX_NAME && !name.includes(token)) return next;
  }
  return null;
}

function levelFor(mmr) {
  let best = 0, bestGap = Infinity;
  LEVELS.forEach((l, i) => {
    const gap = mmr < l.min ? Math.log(l.min / mmr) : mmr > l.max ? Math.log(mmr / l.max) : 0;
    if (gap < bestGap) { best = i; bestGap = gap; }
  });
  return best;
}

// Find a card seed that draws (very nearly) this amount, then use the card's
// figure as the row's figure so the permalink and the row always agree.
export function snapToCard(target, key) {
  const d = levelFor(target);
  const lvl = LEVELS[d];
  const t = Math.min(lvl.max, Math.max(lvl.min, target));
  const base = hash('card:' + key);
  let best = null;
  for (let k = 0; k < 400000; k++) {
    const s = (base + Math.imul(k, 0x9E3779B1)) >>> 0;
    const amount = cardAmount(s, d);
    const miss = Math.abs(amount - t);
    if (!best || miss < best.miss) best = { s, d, amount, miss };
    if (miss <= Math.max(0, t * 0.001)) break;
  }
  return { s: best.s, d: best.d, mmr: best.amount };
}

export function genesis(dayBefore) {
  const r = rng('genesis:' + dayBefore);
  return PROJECTS.map(([id, name]) => ({
    id,
    name,
    mmr: Math.round(300 * Math.pow(2000000 / 300, r())),
  }));
}

// "|| 0" turns -0 into 0, which is what the JSON file will say anyway.
const pct = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 || 0 : null);

// One day of made-up economics. `prev` is the previous day's file (or a
// genesis state with no ranks), and the date seeds every roll of the dice.
export function step(prev, date) {
  const r = rng('day:' + date);
  const before = new Map(prev.projects.map((p) => [p.id, p]));
  const market = gauss(r) * 0.03;
  const events = [];

  // At most one pivot a day, and only some days.
  let pivotId = null;
  if (r() < 0.22) {
    const candidates = prev.projects.filter((p) => pivotName(p.name));
    if (candidates.length) pivotId = pick(candidates, r).id;
  }

  const projects = prev.projects.map((p) => {
    const t = temperament(p.id);
    let mult = Math.exp(t.drift + market + gauss(r) * t.wobble);
    let name = p.name;
    let story = null;
    const roll = r();
    if (p.id === pivotId) {
      name = pivotName(p.name);
      mult *= 0.5 + r() * 1.1;
      story = { kind: 'pivot', from: p.name };
    } else if (roll < 0.012) {
      mult *= 0.3 + r() * 0.3;
      story = { kind: 'crash', reason: pick(DROP_REASONS, r) };
    } else if (roll < 0.024) {
      mult *= 1.8 + r() * 2.2;
      story = { kind: 'moon', reason: pick(CLIMB_REASONS, r) };
    }
    const target = Math.min(CEILING, Math.max(FLOOR, p.mmr * mult));
    const card = snapToCard(target, date + ':' + p.id);
    return {
      id: p.id,
      name,
      mmr: card.mmr,
      card: { s: card.s, d: card.d, c: t.chart },
      verified: pick(VERIFIERS, r),
      story,
    };
  });

  projects.sort((a, b) => b.mmr - a.mmr || a.id.localeCompare(b.id));
  projects.forEach((p, i) => {
    const old = before.get(p.id);
    p.rank = i + 1;
    p.prev_rank = old && old.rank ? old.rank : null;
    p.change_pct = old ? pct(p.mmr, old.mmr) : null;
  });

  const top = projects.slice(0, TOP);
  const total = top.reduce((sum, p) => sum + p.mmr, 0);
  const index = Math.round(total / 10) / 100;
  const ranked = prev.projects.some((p) => p.rank);

  // Every story the day could lead with. The best one wins.
  const say = (lines) => pick(lines, r);
  for (const p of projects) {
    const inTop = p.rank <= TOP;
    const wasTop = p.prev_rank && p.prev_rank <= TOP;
    const moved = p.prev_rank ? p.prev_rank - p.rank : 0;
    const s = p.story;
    const n = p.name;
    if (s && s.kind === 'pivot') {
      events.push({ score: 4.6, headline: `${s.from} pivots to ${n}`, title: `${s.from} becomes ${n}` });
    }
    if (!ranked) continue;
    const change = Math.round(p.change_pct);
    if (p.rank === 1 && p.prev_rank !== 1) {
      events.push({ score: 5, headline: say([`${n} takes #1, says it's "just getting started"`, `${n} is the new #1, posts a 40 tweet thread about it`, `${n} hits #1, updates the bio before the landing page`]), title: `${n} takes the crown` });
    }
    if (s && s.kind === 'crash' && (inTop || wasTop)) {
      events.push({ score: 2.5 - change / 40, headline: say([`${n} loses ${-change}% overnight after ${s.reason}`, `${n} down ${-change}% after ${s.reason}, calls it a reset`, `${n} sheds ${-change}% after ${s.reason}, founder "not worried"`]), title: `${n} in freefall` });
    }
    if (s && s.kind === 'moon' && inTop) {
      events.push({ score: 2.5 + Math.min(change, 300) / 150, headline: say([`${n} up ${change}% after ${s.reason}`, `${n} jumps ${change}% after ${s.reason}, posts the chart`]), title: `${n} on a tear` });
    }
    if (inTop && moved <= -3) {
      events.push({ score: 2 - moved / 2, headline: `${n} drops ${-moved} spots after ${(s && s.reason) || say(DROP_REASONS)}`, title: `${n} in freefall` });
    }
    if (inTop && moved >= 3) {
      events.push({ score: 1.9 + moved / 2, headline: `${n} climbs ${moved} spots after ${(s && s.reason) || say(CLIMB_REASONS)}`, title: `${n} on a tear` });
    }
    if (inTop && !wasTop) {
      events.push({ score: 2.6, headline: say([`${n} enters the top 20 on the strength of one tweet`, `${n} sneaks into the top 20, screenshots it immediately`]), title: `${n} crashes the party` });
    }
    if (!inTop && wasTop) {
      events.push({ score: 2.4, headline: say([`${n} falls out of the top 20, blames the algorithm`, `${n} drops out of the top 20, announces a "break"`]), title: `${n} is out` });
    }
    if (inTop && Math.abs(change) >= 15) {
      events.push(change > 0
        ? { score: 1 + change / 100, headline: say([`${n} up ${change}%, founder posts the chart twice`, `${n} gains ${change}% for reasons nobody can name`, `${n} up ${change}%, founder starts a podcast`]), title: `${n} on a tear` }
        : { score: 1 - change / 100, headline: say([`${n} down ${-change}%, founder posts a thread on resilience`, `${n} slips ${-change}%, says it was planned`, `${n} down ${-change}%, landing page now says "beta"`]), title: `${n} has a day` });
    }
  }
  events.forEach((e) => { e.score += r() * 0.5; });
  events.sort((a, b) => b.score - a.score);
  const lead = events[0] || {
    headline: `Quiet day. ${top[0].name} posts a thread about it anyway`,
    title: 'a quiet day, loudly',
  };

  const clean = (p) => {
    const row = { rank: p.rank, prev_rank: p.prev_rank, id: p.id, name: p.name, mmr: p.mmr, change_pct: p.change_pct, verified: p.verified, card: p.card };
    if (p.story && p.story.kind === 'pivot') row.pivoted_from = p.story.from;
    return row;
  };

  return {
    date,
    made_up: 'Every project, number and headline in this file is made up. None of it is revenue.',
    headline: lead.headline,
    title: lead.title,
    index: { value: index, change_pct: prev.index ? pct(index, prev.index.value) : null },
    top: top.map(clean),
    bench: projects.slice(TOP).map(clean),
  };
}

// The previous day's file back into the shape step() reads.
export function stateOf(day) {
  return { index: day.index, projects: [...day.top, ...day.bench] };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prTitle(day) {
  const [, m, d] = day.date.split('-').map(Number);
  return `Leaderboard for ${MONTHS[m - 1]} ${d}: ${day.title}`;
}

export function addDays(date, n) {
  const t = new Date(date + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
