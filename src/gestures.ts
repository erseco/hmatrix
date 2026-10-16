import { clamp, type Field } from './physics';
export interface Landmark { x: number; y: number; z: number }
export interface HandSample { id: string; points: Landmark[] }
export interface Gesture { id: string; x: number; y: number; size: number; pinch: number; openness: number; angle: number; vx: number; vy: number; push: number; hole: number; swirl: number; burst: boolean; label: string; tips: Landmark[] }
interface State { x: number; y: number; time: number; size: number; baseline: number; pinch: boolean; grip: boolean; closedAt: number; cooldown: number; hole: number; push: number; swirl: number; vx: number; vy: number; angle: number }
const distance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
export class GestureRecognizer {
  private states = new Map<string, State>();
  reset() { this.states.clear(); }
  update(hands: HandSample[], time: number, sensitivity: number): Gesture[] {
    const active = new Set(hands.map(hand => hand.id));
    for (const id of this.states.keys()) if (!active.has(id)) this.states.delete(id);
    return hands.map(({ id, points: p }) => {
      const center = { x: (p[0].x + p[5].x + p[9].x + p[13].x + p[17].x) / 5, y: (p[0].y + p[5].y + p[9].y + p[13].y + p[17].y) / 5 };
      const x = 1 - center.x, y = center.y;
      const size = Math.max(0.015, distance(p[0], p[9]));
      const pinch = Math.hypot(p[4].x - p[8].x, p[4].y - p[8].y, p[4].z - p[8].z) / size;
      const openness = [8, 12, 16, 20].reduce((sum, tip) => sum + distance(p[tip], p[0]) / size, 0) / 4;
      const angle = Math.atan2(p[5].y - p[17].y, p[17].x - p[5].x);
      let state = this.states.get(id);
      if (!state) {
        state = { x, y, time, size, baseline: size, pinch: false, grip: false, closedAt: 0, cooldown: 0, hole: 0, push: 0, swirl: 0, vx: 0, vy: 0, angle };
        this.states.set(id, state);
      }
      const dt = clamp((time - state.time) / 1000, 1 / 120, 0.15), smooth = 1 - Math.exp(-dt * 14);
      const vx = clamp((x - state.x) / dt, -4, 4), vy = clamp((y - state.y) / dt, -4, 4);
      const turn = state.vx * vy - state.vy * vx;
      state.vx += (vx - state.vx) * smooth; state.vy += (vy - state.vy) * smooth;
      state.x += (x - state.x) * smooth; state.y += (y - state.y) * smooth;
      state.size += (size - state.size) * smooth;
      // Sensitivity changes force strength, not the distance required to release a gesture.
      state.pinch = openness >= 1.2 && pinch < (state.pinch ? 0.55 : 0.32);
      let burst = false;
      if (!state.pinch && openness < 1.2) {
        if (!state.grip) state.closedAt = time;
        state.grip = true;
      }
      if (state.grip && openness > 1.65) {
        burst = !state.pinch && time - state.closedAt > 180 && time - state.closedAt < 1400 && time > state.cooldown;
        state.grip = false;
        if (burst) state.cooldown = time + 1000;
      }
      if (state.pinch) state.grip = false;
      // A latched pinch allows gradual widening before release, with separate entry and exit thresholds.
      const hole = state.pinch ? 0.7 + clamp(pinch, 0, 0.8) * 1.5 : 0;
      const push = !state.pinch && openness > 1.65 ? clamp((state.size / state.baseline - 1) * 2 + (state.size - 0.12) * 3, 0, 2) * sensitivity : 0;
      const angleDelta = Math.atan2(Math.sin(angle - state.angle), Math.cos(angle - state.angle));
      const swirl = state.pinch || state.grip ? 0 : clamp((state.vx * 2 + turn * 0.7 + angleDelta / dt * 0.35) * sensitivity, -4, 4);
      state.hole += (hole - state.hole) * smooth; state.push += (push - state.push) * smooth;
      state.swirl += (swirl - state.swirl) * (1 - Math.exp(-dt * 5));
      state.time = time; state.angle = angle;
      return { id, x: state.x, y: state.y, size: state.size, pinch, openness, angle, vx: state.vx, vy: state.vy, push: state.push, hole: state.hole, swirl: state.swirl, burst,
        label: state.pinch ? 'PELLIZCO' : state.grip ? 'PUÑO' : push > 0.15 ? 'EMPUJE' : Math.abs(state.swirl) > 0.2 ? 'VÓRTICE' : 'MANO ABIERTA', tips: [p[4], p[8], p[12], p[16], p[20]] };
    });
  }
}
export function gestureField(gesture: Gesture, width: number, height: number): Field {
  return { x: (gesture.x - 0.5) * width, y: (0.5 - gesture.y) * height, radius: 2.5 + gesture.hole * 1.5, push: gesture.push, hole: gesture.hole, swirl: gesture.swirl };
}
