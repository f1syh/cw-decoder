import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('PWA shell exposes required controls and manifest', async () => {
  const html = await read('index.html');
  assert.match(html, /manifest\.webmanifest/);
  for (const id of ['startStop','modeToggle','status','frequency','wpm','confidence','morseCurrent','decodedText','clearText','copyText']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('manifest is standalone French PWA', async () => {
  const manifest = JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'fr');
  assert.equal(manifest.start_url, './');
});

test('service worker caches application shell', async () => {
  const sw = await read('sw.js');
  for (const path of ['./','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest']) assert.ok(sw.includes(path));
});

test('V10.4 propagates qualified ON start timestamp to Morse decoder', async () => {
  const app = await read('js/app.js');
  assert.match(app, /timestampMs\s*:\s*d\.keyDown\s*\?\s*\(d\.keyDownSinceMs\s*\?\?\s*t\)\s*:\s*t/);
});

test('V10.5 constrains BF acquisition to 800-1000 Hz for validation', async () => {
  const app = await read('js/app.js');
  assert.match(app, /createCwDetector\(\{\s*minHz\s*:\s*800\s*,\s*maxHz\s*:\s*1000\s*\}\)/);
});

test('V10.6 logs high-resolution DSP qualification telemetry', async () => {
  const app = await read('js/app.js');
  assert.match(app, /t-lastDspLog>=20/);
  assert.match(app, /kind:'dsp'/);
  assert.match(app, /onCandidateMs:d\.onCandidateMs/);
  assert.match(app, /offCandidateMs:d\.offCandidateMs/);
});