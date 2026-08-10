// Generates one standalone page per (direction, screen) for screenshotting.
// Run: node design/shots.mjs [key ...]
//
// Output lands in design/shots/, two levels below the serve root, so the
// fragments' own '../../frontend/...' font path still resolves untouched.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });

const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['ember', 'aurora'];
const SCREENS = ['dashboard', 'inbox'];
const made = [];

for (const key of keys) {
  const path = join(here, 'parts', `${key}.html`);
  if (!existsSync(path)) {
    console.log(`  ! missing parts/${key}.html`);
    continue;
  }

  // Sticky is a scroll behaviour. Captured at full page height there is no
  // scroll to respond to, and Chromium composites the stuck element a second
  // time against the viewport top — a ghost bar at the head of the image.
  const fragment = readFileSync(path, 'utf8').replace(/position:\s*sticky\s*;/g, 'position: static;');

  for (const screen of SCREENS) {
    const other = screen === 'dashboard' ? 'inbox' : 'dashboard';
    const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${key} — ${screen}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #09090b; }
  [data-screen="${other}"] { display: none !important; }
  /* 100vh is the switcher's job. In a full-height capture the viewport IS the
     page, so any vh floor inflates the layout by its own height. */
  [data-screen="${screen}"] { min-height: 0 !important; border-top: 0 !important; }
  .workspace { min-height: 0 !important; }
  .screen-label { display: none !important; }
  [data-screen="${screen}"] { padding-bottom: 40px !important; }
</style>
</head>
<body>
${fragment}
<script>
  // Publish the real content height for a --dump-dom pass. Measured after
  // fonts settle: Inter loads async and changes line heights, so measuring
  // early gives a height short by tens of pixels.
  function publish() {
    document.body.setAttribute('data-h', document.documentElement.scrollHeight);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(publish);
  else publish();
  window.addEventListener('load', publish);
</script>
</body>
</html>
`;
    writeFileSync(join(outDir, `${key}-${screen}.html`), doc, 'utf8');
    made.push(`shots/${key}-${screen}.html`);
  }
}

console.log(made.map((m) => `  ✓ ${m}`).join('\n'));
