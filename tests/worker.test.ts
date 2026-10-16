import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

test('generated classic worker initializes, processes frames and closes failed frames', async () => {
  execFileSync(process.execPath, ['scripts/assets.mjs'], { cwd: fileURLToPath(new URL('../', import.meta.url)) });
  const messages: { type: string; message?: string }[] = [];
  let failInference = false;
  const scope: Record<string, unknown> = {
    Error,
    postMessage: (message: { type: string; message?: string }) => messages.push(message),
    importScripts: (url: string) => {
      assert.equal(url, './vision_bundle.js');
      scope.exports = {
        FilesetResolver: { forVisionTasks: async (path: string) => { assert.equal(path, '/hmatrix/wasm'); return {}; } },
        HandLandmarker: { createFromOptions: async () => ({
          detectForVideo: () => {
            if (failInference) throw new Error('Inference failed');
            return { landmarks: [], handedness: [] };
          },
        }) },
      };
    },
  };
  scope.self = scope;
  runInNewContext(readFileSync(new URL('../public/hand-worker.js', import.meta.url), 'utf8'), scope);
  const onmessage = scope.onmessage as (event: { data: Record<string, unknown> }) => Promise<void>;
  await onmessage({ data: { type: 'init', base: '/hmatrix/' } });
  assert.equal(messages.at(-1)?.type, 'ready');
  let closed = 0;
  const bitmap = { close: () => closed++ };
  await onmessage({ data: { type: 'frame', bitmap, time: 1 } });
  assert.equal(messages.at(-1)?.type, 'result');
  assert.equal(closed, 1);
  failInference = true;
  await onmessage({ data: { type: 'frame', bitmap, time: 2 } });
  assert.equal(messages.at(-1)?.type, 'error');
  assert.equal(messages.at(-1)?.message, 'Inference failed');
  assert.equal(closed, 2);
});
