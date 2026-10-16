import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const assets = (await readdir('dist/assets')).map(name => `./assets/${name}`);
const wasm = (await readdir('dist/wasm')).map(name => `./wasm/${name}`);
const hash = createHash('sha256');
for (const path of ['dist/index.html', 'dist/sw.js', 'dist/hand-worker.js', 'dist/vision_bundle.js', ...assets.map(path => 'dist/' + path.slice(2))]) hash.update(await readFile(path));
const source = await readFile('dist/sw.js', 'utf8');
await writeFile('dist/sw.js', source.replace('matrix-hand-v1', `matrix-hand-${hash.digest('hex').slice(0, 12)}`).replace('const assets = []; // Replaced by the production build.', `const assets = ${JSON.stringify([...assets, ...wasm])};`));
