import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GestureRecognizer, type Landmark } from '../src/gestures';
function hand(pinch: number, open = true): Landmark[] {
 const p = Array.from({ length: 21 }, () => ({ x: .5, y: .6, z: 0 }));
 p[0] = { x: .5, y: .8, z: 0 }; p[9] = { x: .5, y: .6, z: 0 };
 p[5] = { x: .4, y: .6, z: 0 }; p[17] = { x: .6, y: .6, z: 0 };
 for (const i of [8, 12, 16, 20]) p[i] = { x: .5, y: open ? .35 : .68, z: 0 };
 p[4] = { x: .5 + pinch * .2, y: p[8].y, z: 0 }; return p;
}
test('pinch has hysteresis and smooth release', () => {
 const r = new GestureRecognizer(); const read = (ratio: number, t: number) => r.update([{ id: 'left', points: hand(ratio) }], t, 1)[0];
 assert.equal(read(.2, 0).label, 'PELLIZCO'); assert.equal(read(.5, 50).label, 'PELLIZCO');
 const before = read(.6, 100).hole, after = read(.9, 150).hole;
 assert.ok(after > 0 && after < before); assert.notEqual(read(.9, 200).label, 'PELLIZCO');
});
test('fist then rapid opening triggers one burst, pinch never triggers it', () => {
 const r = new GestureRecognizer(); const read = (p: Landmark[], t: number) => r.update([{ id: 'left', points: p }], t, 1)[0];
 read(hand(1, false), 100); read(hand(1, false), 400);
 assert.equal(read(hand(1), 500).burst, true); assert.equal(read(hand(1), 550).burst, false);
 read(hand(.2), 700); assert.equal(read(hand(1), 1000).burst, false);
});
test('two hands stay independent, mirrored coordinates and empty frames reset state', () => {
 const r = new GestureRecognizer(); const a = hand(.2), b = hand(1);
 for (const p of a) p.x -= .2;
 const g = r.update([{ id: 'left', points: a }, { id: 'right', points: b }], 100, 1);
 assert.ok(g[0].x > .5); assert.equal(g[0].label, 'PELLIZCO'); assert.notEqual(g[1].label, 'PELLIZCO');
 assert.deepEqual(r.update([], 150, 1), []);
 assert.equal(r.update([{ id: 'left', points: hand(.5) }], 200, 1)[0].hole, 0);
});

test('pinch releases at every sensitivity when fingers separate', () => {
 for (const sensitivity of [.25, 1, 2]) {
  const r = new GestureRecognizer();
  const read = (ratio: number, t: number) => r.update([{ id: 'left', points: hand(ratio) }], t, sensitivity)[0];
  assert.equal(read(.2, 0).label, 'PELLIZCO');
  assert.notEqual(read(.6, 50).label, 'PELLIZCO');
  for (let t = 100; t <= 700; t += 50) read(.6, t);
  assert.ok(read(.6, 750).hole < .001);
 }
});
test('closing a pinching hand releases pinch and recognizes a fist', () => {
 const r = new GestureRecognizer();
 r.update([{ id: 'left', points: hand(.2) }], 100, 1);
 const closed = r.update([{ id: 'left', points: hand(.1, false) }], 300, 1)[0];
 assert.equal(closed.label, 'PUÑO');
 assert.equal(closed.burst, false);
 assert.equal(r.update([{ id: 'left', points: hand(1) }], 600, 1)[0].burst, true);
});
test('fingertips overlapping in the image but separated in depth are not a pinch', () => {
 const r = new GestureRecognizer(), points = hand(.1);
 points[4].z = -.2;
 assert.notEqual(r.update([{ id: 'left', points }], 100, 1)[0].label, 'PELLIZCO');
});
