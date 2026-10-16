import * as THREE from 'three';
import { DigitalRain } from './rain';
import type { Settings } from './settings';
export class MatrixRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  rain: DigitalRain;
  width = 20;
  height = 20;
  private level = matchMedia('(pointer:coarse)').matches ? 0 : 2;
  constructor(canvas: HTMLCanvasElement, private settings: Settings) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000); this.camera.position.z = 22;
    this.resize(); this.rain = new DigitalRain(this.count(), this.width); this.scene.add(this.rain.mesh);
  }
  private count() { return Math.floor(([1800, 3400, 5700][this.quality()] * this.settings.density) / 38) * 38; }
  private quality() { return this.settings.quality === 'auto' ? this.level : ['low', 'medium', 'high'].indexOf(this.settings.quality); }
  configure() {
    const count = this.count();
    if (count !== this.rain.count) { this.scene.remove(this.rain.mesh); this.rain.dispose(); this.rain = new DigitalRain(count, this.width); this.scene.add(this.rain.mesh); }
    this.resize();
  }
  adapt(fps: number) {
    if (this.settings.quality !== 'auto') return;
    const next = fps < 38 ? Math.max(0, this.level - 1) : fps > 57 ? Math.min(2, this.level + 1) : this.level;
    if (next !== this.level) { this.level = next; this.configure(); }
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.height = 2 * Math.tan(24 * Math.PI / 180) * 22; this.width = this.height * this.camera.aspect;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.settings.dpr, [0.85, 1.2, 1.5][this.quality()]));
    this.renderer.setSize(innerWidth, innerHeight, false); this.rain?.resize(this.width);
  }
  point(x: number, y: number) { return { x: (x - 0.5) * this.width, y: (0.5 - y) * this.height }; }
  render() { this.rain.upload(); this.renderer.render(this.scene, this.camera); }
  dispose() { this.rain.dispose(); this.renderer.dispose(); }
}
