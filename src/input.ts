import { clamp, type Field } from './physics';
export class InputController {
  readonly field: Field = { x: 0, y: 0, radius: 3.5, push: 0, hole: 0, swirl: 0 };
  private x = 0.5; private y = 0.5; private down = false; private shift = false; private inside = false;
  private vx = 0; private last = 0; private strength = 1;
  private touchStart = 0;
  private abort = new AbortController();
  constructor(canvas: HTMLCanvasElement, burst: (x: number, y: number) => void) {
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointermove', e => {
      const now = performance.now(), x = e.clientX / innerWidth;
      this.vx = clamp((x - this.x) / Math.max(0.016, (now - this.last) / 1000) * 3, -4, 4);
      this.x = x; this.y = e.clientY / innerHeight; this.last = now; this.inside = true; this.shift = e.shiftKey || e.altKey;
    }, options);
    canvas.addEventListener('pointerdown', e => {
      this.x = e.clientX / innerWidth; this.y = e.clientY / innerHeight; this.down = true; this.inside = true; this.shift = e.shiftKey || e.altKey;
      canvas.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch') {
        const now = performance.now(); if (now - this.touchStart < 300) burst(this.x, this.y); this.touchStart = now;
      }
    }, options);
    const release = () => { this.down = false; };
    canvas.addEventListener('pointerup', release, options); canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('pointerleave', () => { this.inside = false; this.down = false; }, options);
    canvas.addEventListener('dblclick', () => burst(this.x, this.y), options);
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.strength = clamp(this.strength - e.deltaY * 0.002, 0.25, 2.5); }, { ...options, passive: false });
    window.addEventListener('blur', () => { release(); this.inside = false; this.vx = 0; }, options);
  }
  touchHole = false;
  update(dt: number, width: number, height: number, sensitivity: number) {
    const alpha = 1 - Math.exp(-dt * 14);
    this.field.x += ((this.x - 0.5) * width - this.field.x) * alpha;
    this.field.y += ((0.5 - this.y) * height - this.field.y) * alpha;
    this.field.push += ((this.down && !this.shift && !this.touchHole ? this.strength : 0) - this.field.push) * alpha;
    this.field.hole += ((this.down && (this.shift || this.touchHole) ? this.strength : 0) - this.field.hole) * alpha;
    this.field.swirl += ((this.inside && performance.now() - this.last < 100 ? this.vx * sensitivity : 0) - this.field.swirl) * (1 - Math.exp(-dt * 4));
    return this.field;
  }
  dispose() { this.abort.abort(); }
}
