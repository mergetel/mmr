#!/usr/bin/env node
// Makes up the day's leaderboard and writes it to data/leaderboard/.
//
//   node scripts/generate.mjs                    today (UTC), catching up any missed days
//   node scripts/generate.mjs --date 2026-10-29  up to that day
//   node scripts/generate.mjs --backfill 30      with no history yet, start 30 days back
//   node scripts/generate.mjs --pr-body body.md  also write a PR description
//
// In GitHub Actions it writes changed, date, title and headline to $GITHUB_OUTPUT.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, genesis, prTitle, stateOf, step } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'leaderboard');
const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;

function args(argv) {
  const out = { date: new Date().toISOString().slice(0, 10), backfill: 1, prBody: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--date') out.date = argv[++i];
    else if (a === '--backfill') out.backfill = Number(argv[++i]);
    else if (a === '--pr-body') out.prBody = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date) || Number.isNaN(Date.parse(out.date + 'T00:00:00Z'))) {
    throw new Error(`--date wants YYYY-MM-DD, got ${JSON.stringify(out.date)}`);
  }
  if (!Number.isInteger(out.backfill) || out.backfill < 1 || out.backfill > 366) {
    throw new Error('--backfill wants a whole number of days from 1 to 366');
  }
  return out;
}

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

function output(pairs) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(pairs).map(([k, v]) => `${k}=${String(v).replace(/[\r\n]+/g, ' ')}`);
  appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
}

const money = (n) => '$' + n.toLocaleString('en-US');

function prBody(day) {
  const arrow = (p) => (p.prev_rank == null ? 'new' : p.prev_rank > p.rank ? `up ${p.prev_rank - p.rank}` : p.prev_rank < p.rank ? `down ${p.rank - p.prev_rank}` : 'same');
  const rows = day.top.slice(0, 5).map((p) => `| ${p.rank} | ${p.name} | ${money(p.mmr)} | ${arrow(p)} |`);
  const idx = day.index.change_pct == null ? '' : ` (${day.index.change_pct >= 0 ? '+' : ''}${day.index.change_pct}%)`;
  return [
    `Today's drama: ${day.headline}.`,
    '',
    `The MMR Index closed at ${day.index.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}${idx}.`,
    '',
    '| # | Project | MMR* | Move |',
    '|---|---|---|---|',
    ...rows,
    '',
    '*Monthly Made-up Revenue. Every project, number and headline here is made up, and none of it is revenue. The daily leaderboard workflow opened this PR and merges it.',
    '',
  ].join('\n');
}

function main() {
  const opts = args(process.argv.slice(2));
  mkdirSync(DIR, { recursive: true });
  const dates = readdirSync(DIR).map((f) => f.match(DAY_FILE)?.[1]).filter(Boolean).sort();
  const last = dates[dates.length - 1];

  if (last && last >= opts.date) {
    console.log(`Nothing to make up: ${last} is already there.`);
    output({ changed: 'false', date: opts.date });
    return;
  }

  let date, prev;
  if (last) {
    date = addDays(last, 1);
    prev = stateOf(read(join(DIR, last + '.json')));
  } else {
    date = addDays(opts.date, 1 - opts.backfill);
    prev = { index: null, projects: genesis(addDays(date, -1)) };
  }

  const manifestFile = join(DIR, 'days.json');
  const manifest = existsSync(manifestFile) ? read(manifestFile) : { made_up: true, days: [] };
  let day;
  for (; date <= opts.date; date = addDays(date, 1)) {
    day = step(prev, date);
    write(join(DIR, date + '.json'), day);
    manifest.days.push({ date, index: day.index.value, headline: day.headline, leader: day.top[0].name });
    console.log(`${date}  ${day.index.value.toFixed(2).padStart(10)}  ${day.headline}`);
    prev = stateOf(day);
  }
  write(manifestFile, manifest);

  const title = prTitle(day);
  if (opts.prBody) writeFileSync(opts.prBody, prBody(day));
  console.log(`\n${title}`);
  output({ changed: 'true', date: day.date, title, headline: day.headline });
}

main();
