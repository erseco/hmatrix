import type { HandSample, Gesture } from './gestures';
const connections = [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
export class DebugOverlay {
  private canvas = document.querySelector<HTMLCanvasElement>('#landmarks')!;
  private ctx = this.canvas.getContext('2d')!;
  draw(video: HTMLVideoElement, hands: HandSample[], gestures: Gesture[], fps: number, count: number) {
    const ctx = this.ctx; ctx.clearRect(0, 0, 320, 240);
    if (video.readyState >= 2) { ctx.save(); ctx.translate(320, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0, 320, 240); ctx.restore(); }
    ctx.strokeStyle = '#6aff9d'; ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5;
    for (const hand of hands) {
      for (const chain of connections) {
        ctx.beginPath(); chain.forEach((index, i) => { const p = hand.points[index]; if (i) ctx.lineTo((1 - p.x) * 320, p.y * 240); else ctx.moveTo((1 - p.x) * 320, p.y * 240); }); ctx.stroke();
      }
      for (const p of hand.points) { ctx.beginPath(); ctx.arc((1 - p.x) * 320, p.y * 240, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    document.querySelector('#debug-text')!.textContent = `${fps.toFixed(0)} FPS · ${count} glyphs · ${hands.length} hands\n` + gestures.map(g => `${g.id}: ${g.label}\nsize ${g.size.toFixed(2)} pinch ${g.pinch.toFixed(2)} angle ${g.angle.toFixed(2)}\nv ${g.vx.toFixed(2)}, ${g.vy.toFixed(2)} push ${g.push.toFixed(2)} hole ${g.hole.toFixed(2)}`).join('\n');
  }
}
