import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_NAME, PROJECTS, TOP, cardAmount, pivotName, stateOf, step } from '../scripts/lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'leaderboard');
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const dates = readdirSync(DIR).map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.json$/)?.[1]).filter(Boolean).sort();
const days = dates.map((d) => read(d + '.json'));

// The card's own makeUp(), lifted out of index.html, so a change to the card
// that would break the leaderboard links fails here.
function cardMakeUp() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('  const LEVELS = [');
  const end = html.indexOf('  function rr(');
  assert.ok(start > 0 && end > start, 'index.html no longer has LEVELS ... rr() in that order');
  return new Function(html.slice(start, end) + '\nreturn makeUp;')();
}

test('there is history', () => {
  assert.ok(days.length >= 2, 'expected at least two days in data/leaderboard');
});

test('every row opens a card that shows the same number', () => {
  const makeUp = cardMakeUp();
  for (const day of days) {
    for (const row of [...day.top, ...day.bench]) {
      const m = makeUp({ seed: row.card.s, d: row.card.d, c: row.card.c, n: row.name });
      assert.equal(m.amount, row.mmr, `${day.date} ${row.name}`);
      assert.equal(m.name, row.name);
      assert.equal(cardAmount(row.card.s, row.card.d), row.mmr);
    }
  }
});

test('history replays exactly from the day before', () => {
  for (let i = 1; i < days.length; i++) {
    assert.deepEqual(step(stateOf(days[i - 1]), dates[i]), days[i], dates[i]);
  }
});

test('days.json lists every day file, in order', () => {
  const manifest = read('days.json');
  assert.deepEqual(manifest.days.map((d) => d.date), dates);
  manifest.days.forEach((d, i) => {
    assert.equal(d.index, days[i].index.value);
    assert.equal(d.headline, days[i].headline);
  });
});

test('every day is a top 20 of unique, card-sized names with a made-up note', () => {
  for (const day of days) {
    assert.equal(day.top.length, TOP);
    assert.match(day.made_up, /made up/);
    const names = [...day.top, ...day.bench].map((r) => r.name);
    assert.equal(new Set(names).size, names.length, day.date);
    names.forEach((n) => assert.ok(n.length <= MAX_NAME, n));
    assert.doesNotMatch(day.headline, /[–—]/, 'no dashes in the drama');
  }
});

test('starting names fit the card and pivots stay inside it', () => {
  for (const [, name] of PROJECTS) {
    assert.ok(name.length <= MAX_NAME, name);
    let n = name;
    for (let i = 0; i < 6 && n; i++) {
      n = pivotName(n);
      if (n) assert.ok(n.length <= MAX_NAME, n);
    }
  }
  assert.equal(pivotName('AI Wrapper #7'), 'AI Wrapper #8');
});
