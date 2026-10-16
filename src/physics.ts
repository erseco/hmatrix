export interface Field { x: number; y: number; radius: number; push: number; hole: number; swirl: number }
export interface Wave { x: number; y: number; age: number }
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export class InteractionEngine {
  readonly offset: Float32Array;
  readonly velocity: Float32Array;
  readonly waves: Wave[] = [];
  private time = 0;
  constructor(readonly count: number) {
    this.offset = new Float32Array(count * 3);
    this.velocity = new Float32Array(count * 3);
  }
  burst(x: number, y: number) {
    if (this.waves.length >= 8) this.waves.shift();
    this.waves.push({ x, y, age: 0 });
  }
  step(dt: number, base: Float32Array, fields: readonly Field[], intensity: number) {
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    for (const wave of this.waves) wave.age += dt;
    for (let i = this.waves.length - 1; i >= 0; i--) if (this.waves[i].age > 1.8) this.waves.splice(i, 1);
    // Substeps keep the spring stable even when rendering drops to 20 FPS.
    const steps = Math.ceil(dt / (1 / 120));
    if (!steps) return;
    const h = dt / steps;
    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < this.count; i++) {
        const j = i * 3;
        let fx = -35 * this.offset[j], fy = -35 * this.offset[j + 1], fz = -35 * this.offset[j + 2];
        const x = base[j] + this.offset[j], y = base[j + 1] + this.offset[j + 1];
        for (const field of fields) {
          // Match the renderer's focal plane so depth layers share an interaction center.
          const projection = (22 - base[j + 2]) / 22;
          const dx = x - field.x * projection, dy = y - field.y * projection;
          const radius = field.radius * projection * (1 + 0.04 * Math.sin(Math.atan2(dy, dx) * 5 + this.time * 2));
          const distance = Math.hypot(dx, dy), d = Math.max(distance, 0.01);
          const falloff = Math.exp(-2.5 * (distance / radius) ** 2);
          const radial = field.hole * 110 * Math.max(0, 1 - distance / radius);
          fx += intensity * (dx / d * radial - dy * field.swirl * 24 * falloff);
          fy += intensity * (dy / d * radial + dx * field.swirl * 24 * falloff);
          fz -= intensity * field.push * 170 * falloff;
        }
        for (const wave of this.waves) {
          const dx = x - wave.x, dy = y - wave.y, d = Math.max(0.01, Math.hypot(dx, dy));
          const force = 240 * Math.exp(-(((d - wave.age * 11) / 0.8) ** 2)) * Math.exp(-wave.age * 2) * intensity;
          fx += dx / d * force; fy += dy / d * force;
        }
        this.velocity[j] += (fx - 8 * this.velocity[j]) * h;
        this.velocity[j + 1] += (fy - 8 * this.velocity[j + 1]) * h;
        this.velocity[j + 2] += (fz - 8 * this.velocity[j + 2]) * h;
        for (let axis = 0; axis < 3; axis++) this.offset[j + axis] += this.velocity[j + axis] * h;
      }
    }
  }
  reset(index: number) {
    for (let axis = 0; axis < 3; axis++) this.offset[index * 3 + axis] = this.velocity[index * 3 + axis] = 0;
  }
}
