# Matrix Hand

A fullscreen Matrix-inspired digital rain surface with spring physics, mouse/touch simulation and private, on-device two-hand tracking. Built with strict TypeScript, Vite, Three.js and MediaPipe Tasks Vision. No backend, analytics, video upload or runtime CDN dependency.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite, under `/hmatrix/`. Installation copies the pinned MediaPipe WASM runtime and downloads Google's official Hand Landmarker model into `public/`. The first installation needs internet access; subsequent builds and use need no external service.

```sh
npm test         # gesture and spring physics unit tests
npm run build    # local assets, strict type check, production bundle, offline precache
npm run preview  # serve dist, including PWA
```

Deploy `dist/` to any static HTTPS host. For an Android phone, use an HTTPS host or a trusted local HTTPS proxy: an ordinary `http://192.168…` development URL cannot access the camera. After the first complete production load and service-worker installation, the app and detector work offline. Chrome's installation menu can install the PWA. Camera access still requires device permission.

## Controls

| Input | Effect |
|---|---|
| Move pointer | Tangential vortex, with friction and inertia |
| Hold pointer | Push the code into the screen |
| Shift + hold (or Alt + hold) | Open a radial hole |
| Mouse wheel | Change push / hole strength |
| Double click / double tap | Expanding shockwave |
| Touch toolbar | Choose push or hole; trigger a wave |
| H / Settings button | Hide / show interface; open settings |

Camera access is requested only after pressing **Activar cámara**. Disable it in settings to stop every media track and terminate the inference worker. A mirrored video with all 21 landmarks appears only with **Depuración** enabled.

| Hand gesture | Effect |
|---|---|
| Open palm, approaching camera | Depth depression based on relative palm scale and apparent size |
| Thumb–index pinch | Latched hole; slightly widening the pinch expands it; releasing closes it |
| Lateral motion / palm rotation | Signed vortex driven by hand velocity and orientation change |
| Hold fist, then quickly open | Shockwave, with cooldown |

Palm scale is calibrated when a hand first appears. Start at a comfortable distance, then approach the camera. Remove and reintroduce the hand to recalibrate. Pinch has priority over fist/open classification. Finger distances are normalized by palm size; entry/exit thresholds differ and output strengths are smoothed. Use good lighting and keep the whole hand in view. This is relative monocular depth, not metric depth sensing.

## Architecture

- `rain.ts` — one instanced draw call, generated katakana/symbol atlas, GLSL lighting, independent column motion and random glyph changes.
- `renderer.ts` — perspective camera, depth layers, quality/DPR limits and adaptive character counts.
- `physics.ts` — typed-array spring displacements, velocity, radial/tangential/depth forces and expanding waves, integrated in substeps up to 120 Hz.
- `input.ts` — pointer and touch inputs using the same fields as hand tracking.
- `tracker.ts`, `hand.worker.ts` — camera lifecycle, 20 Hz inference in a classic worker, one transferable frame in flight, two hands. The assets script transpiles the worker and copies the CommonJS MediaPipe bundle; classic workers are required by its WASM loader.
- `gestures.ts` — palm/fingertip metrics, mirrored coordinates, temporal smoothing, pinch hysteresis, fist priority and burst cooldown.
- `settings.ts`, `debug.ts`, `main.ts` — validated local settings, debugging, UI and lifecycle.
- `public/sw.js`, `scripts/precache.mjs` — versioned production offline cache including worker, model, and SIMD/non-SIMD WASM.

## Performance and limitations

Auto quality adapts every six seconds between approximately 1,800 / 3,400 / 5,700 glyphs (before the density multiplier) and 0.85 / 1.2 / 1.5 DPR caps. Manual quality and DPR cap are available. Physics caps elapsed time at 50 ms to avoid unstable catch-up; rain and interaction motion stay separate. The page pauses inference/render work while hidden and disables camera tracks until visible. Inference runs at most 20 Hz while graphics render independently.

FPS depends on GPU, camera, lighting and thermal throttling. Mobile 30 FPS and desktop 60 FPS are targets, not guarantees. Test on actual Android hardware before promising a device-specific frame rate. Hand crossing or a handedness misclassification can briefly reset smoothing. Continuous palm rotation is used as a circular-motion cue; a geometric circle classifier is not included.

The UI and control text are Spanish; code and technical documentation are English. Katakana glyph shape uses the device's system font fallback. No postprocessing bloom pass is used; atlas glow and additive blending preserve mobile performance.

## Local model and privacy

The model is at `public/models/hand_landmarker.task`; WASM files are at `public/wasm/`. `npm run assets` restores them from the pinned installed package and the official model URL in `scripts/assets.mjs`. To prepare an offline machine, copy these assets and install dependencies from an available npm cache. Keep the MediaPipe package, JS bundle and WASM versions together.

Only local camera frames are transferred to a local worker. No frames are stored or sent over the network. The service worker caches application code and the public model, never camera content. Settings are saved in localStorage; storage failures do not prevent use. Camera errors leave pointer mode available. WebGL context loss pauses rendering and reports recovery. Model loading has a timeout and releases the camera on failure.

MediaPipe and its model retain their upstream licenses. Three.js is MIT licensed; consult the installed packages for license notices.

## Verification

Validated with `npm run build` and seven unit tests (`npm test`). Chrome checks cover real shader compilation/rendering, responsive layout, settings visibility, simulated camera-permission denial, classic-worker model initialization and inference on a blank image. The production page was reloaded and the detector ran successfully with the preview server stopped, confirming the offline cache includes the worker and model. Real hand accuracy, actual camera hardware and Android thermal/FPS behavior still require device testing.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow tests and builds the app on every push to `main`, then publishes **only `dist/`** to GitHub Pages. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Do not publish the repository root: its `index.html` is a Vite source entry point and requires compilation.

Vite uses `/hmatrix/` as its base path, including the JS/CSS bundle, manifest, camera worker/model and service worker. The published URL is https://erseco.github.io/hmatrix/. If the repository name changes, update `base` in `vite.config.ts`.
