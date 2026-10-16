import './style.css';
import { MatrixRenderer } from './renderer';
import { SettingsManager } from './settings';
import { InputController } from './input';
import { HandTracker } from './tracker';
import { GestureRecognizer, gestureField, type Gesture, type HandSample } from './gestures';
import { DebugOverlay } from './debug';
import type { Field } from './physics';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const settings = new SettingsManager();
if (new URLSearchParams(location.search).get('debug') === '1') settings.value.debug = true;
let toastTimer = 0;
function notify(message: string, duration = 5000) {
  $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), duration);
}
function start() {
  const canvas = $<HTMLCanvasElement>('#matrix');
  let view: MatrixRenderer;
  try { view = new MatrixRenderer(canvas, settings.value); }
  catch { notify('WebGL no está disponible. Activa la aceleración gráfica o abre la aplicación en Chrome.', 60000); return; }
  const recognizer = new GestureRecognizer(), debug = new DebugOverlay();
  let hands: HandSample[] = [], gestures: Gesture[] = [], lastDetection = 0, foundHand = false;
  let cameraRequested = false, contextLost = false;
  const fields: Field[] = [];
  const input = new InputController(canvas, (x, y) => { const point = view.point(x, y); view.rain.engine.burst(point.x, point.y); });
  function cameraUI() {
    $('#camera-label').textContent = cameraRequested ? 'Desactivar cámara' : 'Activar cámara';
    $('#camera-toggle').textContent = cameraRequested ? 'Desactivar cámara' : 'Activar cámara';
    $('#system-state').textContent = tracker.active ? 'VISION ONLINE' : cameraRequested ? 'CONNECTING VISION' : 'SIMULATION ONLINE';
  }
  const tracker = new HandTracker((detected, time) => {
    hands = detected; lastDetection = performance.now();
    gestures = settings.value.gestures ? recognizer.update(hands, time, settings.value.sensitivity) : [];
    for (const gesture of gestures) if (gesture.burst) { const point = view.point(gesture.x, gesture.y); view.rain.engine.burst(point.x, point.y); }
    if (hands.length && !foundHand) { foundHand = true; notify('Mano detectada · ya puedes tocar el código', 3500); window.setTimeout(immerse, 1500); }
    cameraUI();
  }, message => { cameraRequested = false; foundHand = false; recognizer.reset(); cameraUI(); notify(message, 9000); });
  function immerse() { document.body.classList.add('immersive'); $('#intro').inert = true; $('header').inert = true; }
  async function toggleCamera() {
    cameraRequested = !cameraRequested;
    if (cameraRequested) { notify('Preparando visión local…'); cameraUI(); await tracker.start(); }
    else { tracker.stop(); recognizer.reset(); foundHand = false; }
    cameraUI();
  }
  $('#camera').onclick = () => { void toggleCamera(); }; $('#camera-toggle').onclick = () => { void toggleCamera(); };
  $('#explore').onclick = immerse;
  canvas.addEventListener('pointerdown', immerse);
  function panel(open: boolean) {
    $('#panel').hidden = !open; $('#settings').setAttribute('aria-expanded', String(open));
    if (open) { $('#intro').style.visibility = 'hidden'; $('header').inert = false; document.body.classList.remove('immersive'); $('#close').focus(); }
    else { $('#intro').style.visibility = ''; $('#settings').focus(); immerse(); }
  }
  $('#settings').onclick = () => panel($('#panel').hasAttribute('hidden')); $('#close').onclick = () => panel(false);
  const help = $<HTMLDialogElement>('#help-dialog');
  function toggleHelp() {
    if (help.open) help.close();
    else { immerse(); help.showModal(); }
  }
  $('#help').onclick = toggleHelp;
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (!help.open && !$('#panel').hidden) panel(false); return; }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
    if (event.key.toLowerCase() === 'h') { event.preventDefault(); toggleHelp(); }
    if (event.key.toLowerCase() === 'd') { event.preventDefault(); $<HTMLInputElement>('#debug').click(); }
  });
  for (const key of ['sensitivity', 'intensity', 'speed', 'density', 'dpr'] as const) {
    const control = $<HTMLInputElement>(`#${key}`), output = $<HTMLOutputElement>(`#${key}-value`);
    control.value = String(settings.value[key]); output.value = `${settings.value[key].toFixed(2)}×`;
    control.oninput = () => { settings.value[key] = Number(control.value); output.value = `${Number(control.value).toFixed(2)}×`; if (key === 'dpr') view.resize(); settings.save(); };
    control.onchange = () => { if (key === 'density') view.configure(); };
  }
  const quality = $<HTMLSelectElement>('#quality'); quality.value = settings.value.quality;
  quality.onchange = () => { settings.value.quality = quality.value as typeof settings.value.quality; settings.save(); view.configure(); };
  for (const key of ['gestures', 'debug'] as const) {
    const control = $<HTMLInputElement>(`#${key}`); control.checked = settings.value[key];
    control.onchange = () => { settings.value[key] = control.checked; settings.save(); if (key === 'gestures') { tracker.paused = !control.checked; gestures = []; recognizer.reset(); } $('#debug-overlay').hidden = !settings.value.debug; };
  }
  tracker.paused = !settings.value.gestures;
  $('#debug-overlay').hidden = !settings.value.debug;
  $('#fullscreen').onclick = () => {
    const operation = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    if (operation) void operation.catch(() => notify('La pantalla completa no está disponible.'));
    else notify('La pantalla completa no está disponible en este navegador.');
  };
  $('#touch-mode').onclick = () => { input.touchHole = !input.touchHole; $('#touch-mode').textContent = input.touchHole ? 'Modo: agujero' : 'Modo: empujar'; $('#touch-mode').setAttribute('aria-pressed', String(input.touchHole)); };
  $('#touch-burst').onclick = () => view.rain.engine.burst(input.field.x, input.field.y);
  window.addEventListener('resize', () => view.resize());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; notify('Contexto gráfico perdido. Esperando recuperación…', 30000); });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; view.configure(); notify('Renderizado recuperado.'); });
  let last = performance.now(), sample = last, frames = 0, fps = 60, adaptAt = last, debugAt = 0, frameId = 0;
  function frame(time: number) {
    frameId = requestAnimationFrame(frame);
    if (document.hidden || contextLost) { last = time; return; }
    const dt = Math.min((time - last) / 1000, 0.05); last = time;
    view.rain.update(dt, settings.value.speed);
    fields.length = 0; fields.push(input.update(dt, view.width, view.height, settings.value.sensitivity));
    if (time - lastDetection < 250 && settings.value.gestures) for (const gesture of gestures) fields.push(gestureField(gesture, view.width, view.height));
    view.rain.engine.step(dt, view.rain.base, fields, settings.value.intensity); view.render();
    frames++;
    if (time - sample > 1000) { fps = frames * 1000 / (time - sample); $('#fps').textContent = `${Math.round(fps)} FPS`; frames = 0; sample = time; }
    if (time - adaptAt > 6000) { view.adapt(fps); adaptAt = time; }
    if (settings.value.debug && time - debugAt > 100) { debug.draw(tracker.video, hands, gestures, fps, view.rain.count); debugAt = time; }
  }
  frameId = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    last = performance.now(); sample = last; frames = 0; gestures = []; hands = []; recognizer.reset();
    for (const track of tracker.video.srcObject instanceof MediaStream ? tracker.video.srcObject.getVideoTracks() : []) track.enabled = !document.hidden;
  });
  window.addEventListener('pagehide', event => {
    tracker.stop(); cameraRequested = false; cameraUI();
    if (!event.persisted) { cancelAnimationFrame(frameId); input.dispose(); view.dispose(); }
  });
}
start();
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => notify('Modo sin conexión no disponible; la experiencia sigue funcionando.')); });
}
