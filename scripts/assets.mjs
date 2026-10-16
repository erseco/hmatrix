import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, copyFile, access, writeFile } from 'node:fs/promises';
await mkdir('public/wasm', { recursive: true });
await mkdir('public/models', { recursive: true });
for (const name of await readdir('node_modules/@mediapipe/tasks-vision/wasm')) await copyFile(`node_modules/@mediapipe/tasks-vision/wasm/${name}`, `public/wasm/${name}`);
const path = 'public/models/hand_landmarker.task';
try { await access(path); } catch {
 const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
 if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
 await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

await copyFile('node_modules/@mediapipe/tasks-vision/vision_bundle.cjs', 'public/vision_bundle.js');
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)), '--project', 'tsconfig.worker.json'], { stdio: 'inherit' });
