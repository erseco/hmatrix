import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InteractionEngine, type Field } from '../src/physics';
const field: Field = { x: 0, y: 0, radius: 4, push: 1, hole: 0, swirl: 0 };
function simulate(hz: number, input: Field = field) {
 const engine = new InteractionEngine(1), base = new Float32Array([1, 0, 0]);
 for (let i = 0; i < hz; i++) engine.step(1 / hz, base, [input], 1);
 return { engine, base };
}
test('push displaces depth and elastic spring returns to origin', () => {
 const { engine, base } = simulate(60); assert.ok(engine.offset[2] < -1);
 for (let i = 0; i < 300; i++) engine.step(1 / 60, base, [], 1);
 assert.ok(Math.abs(engine.offset[2]) < 0.001);
});
test('hole repels and vortex adds tangential inertia', () => {
 const hole = simulate(60, { ...field, push: 0, hole: 1 }).engine; assert.ok(hole.offset[0] > 1);
 const { engine, base } = simulate(60, { ...field, push: 0, swirl: 1 }); assert.ok(Math.abs(engine.offset[1]) > 0.1);
 const y = engine.offset[1]; engine.step(1 / 120, base, [], 1); assert.notEqual(engine.offset[1], y);
});
test('results agree at 30, 60 and 120 Hz and remain finite after a stalled frame', () => {
 const a = simulate(30).engine.offset[2], b = simulate(60).engine.offset[2], c = simulate(120).engine.offset[2];
 assert.ok(Math.abs(a - b) < 0.01); assert.ok(Math.abs(b - c) < 0.01);
 const { engine, base } = simulate(30); engine.step(10, base, [field], 2); assert.ok(engine.offset.every(Number.isFinite));
});
test('wave expands and expires; coincident field centers stay finite', () => {
 const engine = new InteractionEngine(1), base = new Float32Array([2, 0, 0]); engine.burst(0, 0);
 for (let i = 0; i < 20; i++) engine.step(1 / 60, base, [], 1);
 assert.ok(engine.offset[0] > 0);
 for (let i = 0; i < 120; i++) engine.step(1 / 60, base, [], 1);
 assert.equal(engine.waves.length, 0);
 base.fill(0); engine.step(1 / 60, base, [{ ...field, hole: 1 }], 1); assert.ok(engine.offset.every(Number.isFinite));
});
