import type { HandSample, Landmark } from './gestures';
export class HandTracker {
  readonly video = document.createElement('video');
  private worker?: Worker;
  private stream?: MediaStream;
  private timer = 0;
  private busy = false;
  private lastVideoTime = -1;
  private generation = 0;
  active = false;
  paused = false;
  constructor(private result: (hands: HandSample[], time: number) => void, private error: (message: string) => void) {
    this.video.muted = true; this.video.playsInline = true;
  }
  async start() {
    const generation = ++this.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (this.stream === stream) this.fail('La cámara se ha desconectado. Puedes volver a activarla.'); });
      this.video.srcObject = stream; await this.video.play();
      if (generation !== this.generation) return;
      const worker = new Worker(new URL(`${import.meta.env.BASE_URL}hand-worker.js`, location.href));
      this.worker = worker;
      const timeout = window.setTimeout(() => { if (!this.active && this.worker === worker) this.fail('No se pudo cargar el detector. Comprueba los recursos locales.'); }, 30000);
      worker.onerror = () => { clearTimeout(timeout); this.fail('El detector no es compatible con este navegador. Puedes usar el ratón o la pantalla táctil.'); };
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') { clearTimeout(timeout); this.active = true; this.schedule(); }
        if (data.type === 'error') { clearTimeout(timeout); this.fail(`Error de detección: ${data.message}`); }
        if (data.type === 'result') {
          this.busy = false;
          const hands: HandSample[] = data.landmarks.map((points: Landmark[], i: number) => ({ id: `${data.handedness[i]?.[0]?.categoryName ?? 'hand'}`, points }));
          if (!this.paused) this.result(hands, data.time);
        }
      };
      worker.postMessage({ type: 'init', base: new URL(import.meta.env.BASE_URL, location.href).href });
    } catch (error) {
      if (generation !== this.generation) return;
      const name = error instanceof Error ? error.name : '';
      this.fail(name === 'NotAllowedError' ? 'Permiso de cámara denegado. Puedes seguir usando el ratón o el tacto.' : error instanceof Error ? error.message : 'Cámara no disponible.');
    }
  }
  private schedule() {
    this.timer = window.setInterval(() => { void this.capture(); }, 50);
  }
  private async capture() {
    if (this.paused || document.hidden || this.busy || !this.worker || this.video.readyState < 2 || this.video.currentTime === this.lastVideoTime) return;
    this.busy = true; this.lastVideoTime = this.video.currentTime;
    const worker = this.worker;
    try {
      const bitmap = await createImageBitmap(this.video);
      if (this.worker !== worker) { bitmap.close(); return; }
      worker.postMessage({ type: 'frame', bitmap, time: performance.now() }, [bitmap]);
    } catch { this.busy = false; this.fail('No se pudo procesar la cámara. Usa el modo de simulación.'); }
  }
  private fail(message: string) { this.stop(); this.error(message); }
  stop() {
    ++this.generation; clearInterval(this.timer); this.worker?.terminate(); this.worker = undefined;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.video.pause(); this.video.srcObject = null; this.active = false; this.busy = false; this.lastVideoTime = -1;
    this.result([], performance.now());
  }
}
