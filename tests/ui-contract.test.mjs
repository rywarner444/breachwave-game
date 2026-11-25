import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.mjs', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('every directly referenced UI element exists and identifiers are unique', () => {
  const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
  const used = [...main.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  for (const id of used) assert.ok(ids.includes(id), `Missing DOM element #${id}`);
});

test('browser app remains self-contained, keyboard-navigable, and print-friendly', () => {
  assert.match(index, /<script type="module" src="\.\/src\/main\.mjs"/);
  assert.match(index, /<button id="helpButton"/);
  assert.match(index, /<button id="engineeringButton"/);
  assert.match(index, /<dialog id="reportDialog"/);
  assert.match(index, /aria-pressed="false"/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media print/);
  assert.doesNotMatch(main, /\bfetch\s*\(|XMLHttpRequest\s*\(/);
});

test('mission selector and core gameplay controls are available', () => {
  for (const id of ['missionCards', 'difficultySelect', 'guidedButton', 'tutorialBanner', 'investigateButton',
    'blockButton', 'allowButton', 'isolateButton', 'agentButton', 'abilityGrid', 'reportButton', 'printReport']) {
    assert.ok(index.includes(`id="${id}"`), id);
  }
});
