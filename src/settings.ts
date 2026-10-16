import { clamp } from './physics';
export interface Settings { sensitivity: number; intensity: number; speed: number; density: number; dpr: number; quality: 'auto' | 'low' | 'medium' | 'high'; gestures: boolean; debug: boolean }
const defaults: Settings = { sensitivity: 1, intensity: 1, speed: 1, density: 1, dpr: 1.5, quality: 'auto', gestures: true, debug: false };
export class SettingsManager {
  value: Settings = { ...defaults };
  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem('matrix-hand') || '{}');
      for (const key of ['sensitivity', 'intensity', 'speed', 'density', 'dpr'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) this.value[key] = clamp(saved[key], 0.25, 2);
      if (['auto', 'low', 'medium', 'high'].includes(saved.quality)) this.value.quality = saved.quality;
      for (const key of ['gestures', 'debug'] as const) if (typeof saved[key] === 'boolean') this.value[key] = saved[key];
    } catch { /* Storage can be disabled in private browsing. */ }
  }
  save() { try { localStorage.setItem('matrix-hand', JSON.stringify(this.value)); } catch { /* Settings remain usable without storage. */ } }
}
