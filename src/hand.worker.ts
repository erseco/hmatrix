import type { HandLandmarker as Landmarker } from '@mediapipe/tasks-vision';
const { FilesetResolver, HandLandmarker } = (self as unknown as { exports: typeof import('@mediapipe/tasks-vision') }).exports;
let landmarker: Landmarker | undefined;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const vision = await FilesetResolver.forVisionTasks(data.base + 'wasm');
      landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: data.base + 'models/hand_landmarker.task', delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      try {
        const result = landmarker!.detectForVideo(data.bitmap, data.time);
        self.postMessage({ type: 'result', landmarks: result.landmarks, handedness: result.handedness, time: data.time });
      } finally { data.bitmap.close(); }
    }
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
