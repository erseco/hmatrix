import * as THREE from 'three';
import { InteractionEngine } from './physics';

const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789<>+=:*{}';
export class DigitalRain {
  readonly geometry = new THREE.InstancedBufferGeometry();
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.ShaderMaterial;
  readonly mesh: THREE.Mesh;
  readonly base: Float32Array;
  readonly display: Float32Array;
  readonly info: Float32Array;
  readonly engine: InteractionEngine;
  private readonly speed: Float32Array;
  private readonly phase: Float32Array;
  private readonly depth: Float32Array;
  private readonly column: Float32Array;
  constructor(readonly count: number, private width: number) {
    this.base = new Float32Array(count * 3); this.display = new Float32Array(count * 3);
    this.info = new Float32Array(count * 4); this.speed = new Float32Array(count);
    this.phase = new Float32Array(count); this.depth = new Float32Array(count); this.column = new Float32Array(count);
    this.engine = new InteractionEngine(count);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 38px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#69ff9a'; ctx.shadowBlur = 3;
    for (let i = 0; i < glyphs.length; i++) ctx.fillText(glyphs[i], (i % 16) * 64 + 32, Math.floor(i / 16) * 64 + 33);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    const plane = new THREE.PlaneGeometry(0.30, 0.43);
    this.geometry.index = plane.index;
    this.geometry.setAttribute('position', plane.getAttribute('position'));
    this.geometry.setAttribute('uv', plane.getAttribute('uv'));
    this.geometry.instanceCount = count;
    this.geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(this.display, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('info', new THREE.InstancedBufferAttribute(this.info, 4).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: this.texture } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 offset; attribute vec4 info; varying vec2 vUv; varying float vLight; varying float vDepth;
      void main(){ vUv=(vec2(mod(info.x,16.0),7.0-floor(info.x/16.0))+uv)/vec2(16.0,8.0); vLight=info.y; vDepth=info.z;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position+offset,1.0); }`,
      fragmentShader: `uniform sampler2D atlas; varying vec2 vUv; varying float vLight; varying float vDepth;
      void main(){ float a=texture2D(atlas,vUv).a; if(a<0.025) discard;
      vec3 color=mix(vec3(0.015,0.8,0.18),vec3(0.8,1.0,0.88),smoothstep(0.8,1.0,vLight));
      gl_FragColor=vec4(color,a*vLight*vDepth); }`,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material); this.mesh.frustumCulled = false;
    for (let start = 0; start < count; start += 38) {
      const x = (Math.random() - 0.5) * (width + 10), z = -Math.random() * 9;
      const speed = 1.5 + Math.random() * 4, phase = Math.random() * 32, length = 12 + Math.floor(Math.random() * 25);
      for (let k = 0; k < 38 && start + k < count; k++) {
        const i = start + k;
        this.column[i] = x; this.depth[i] = z; this.speed[i] = speed; this.phase[i] = phase + k * 0.44;
        this.info[i * 4] = Math.floor(Math.random() * glyphs.length);
        this.info[i * 4 + 1] = k < length ? Math.pow(1 - k / length, 1.35) * 0.9 + 0.08 : 0;
        this.info[i * 4 + 2] = 1 - Math.abs(z) / 16;
      }
    }
    plane.dispose();
  }
  resize(width: number) {
    for (let i = 0; i < this.count; i++) this.column[i] *= (width + 10) / (this.width + 10);
    this.width = width;
  }
  update(dt: number, speed: number) {
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      this.phase[i] -= dt * this.speed[i] * speed;
      if (this.phase[i] < -16) { this.phase[i] += 32; this.engine.reset(i); }
      this.base[j] = this.column[i]; this.base[j + 1] = this.phase[i]; this.base[j + 2] = this.depth[i];
      if (Math.random() < dt * 2) this.info[i * 4] = Math.floor(Math.random() * glyphs.length);
    }
  }
  upload() {
    for (let i = 0; i < this.display.length; i++) this.display[i] = this.base[i] + this.engine.offset[i];
    (this.geometry.getAttribute('offset') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('info') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); this.texture.dispose(); }
}
