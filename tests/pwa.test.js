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