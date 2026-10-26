/**
 * 🔊 Gerçekçi darbe sesleri (WebAudio sentezi; dosya yok). Ses seviyesi/sessiz oyun tercihlerinden gelir.
 * Her ses: kısa gürültü patlaması (malzeme rezonansına göre bant geçiren) + tını bileşeni; şiddet ve stereo konum.
 */
import { useGamesPrefs } from "../store";

let ctx = null;
let master = null;
let noise = null;
let hum = null;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    // 1 sn beyaz gürültü tamponu (tüm sesler paylaşır)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  const { muted, vol } = useGamesPrefs.getState();
  master.gain.value = muted ? 0 : (vol / 100) * 0.9;
  return ctx;
}

function out(pan) {
  if (!ctx.createStereoPanner) return master;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(master);
  return p;
}

function burst(dest, { type = "bandpass", freq, q = 1, decay, gain, delay = 0 }) {
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

function tone(dest, { freq, decay, gain, type = "sine", delay = 0, slide = 0 }) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + decay + 0.02);
}

/**
 * @param kind puck | rail | goal | paddle | table | net | floor | ballclick | cushion | pocket | cue | dice | buzzer
 * @param k    şiddet 0..1
 * @param pan  -1..1
 */
export function sfx(kind, k = 0.5, pan = 0) {
  if (!ensure()) return;
  const d = out(pan);
  k = Math.max(0.05, Math.min(1, k));
  switch (kind) {
    case "puck": // sert plastik "çat"
      burst(d, { freq: 2400 + 900 * k, q: 2.2, decay: 0.05, gain: 0.55 * k });
      tone(d, { freq: 1150, decay: 0.035, gain: 0.18 * k, type: "triangle" });
      break;
    case "rail": // ray: daha kalın, kısa
      burst(d, { freq: 900, q: 1.2, decay: 0.07, gain: 0.45 * k });
      tone(d, { freq: 190, decay: 0.09, gain: 0.25 * k });
      break;
    case "goal": // diskin kale yuvasına düşmesi + kısa korna
      burst(d, { type: "lowpass", freq: 500, decay: 0.25, gain: 0.6 });
      tone(d, { freq: 120, decay: 0.3, gain: 0.35, slide: 0.6 });
      tone(d, { freq: 523, decay: 0.45, gain: 0.08, type: "sawtooth", delay: 0.18 });
      tone(d, { freq: 659, decay: 0.45, gain: 0.07, type: "sawtooth", delay: 0.18 });
      break;
    case "paddle": // masa tenisi raket "tok"
      tone(d, { freq: 1500 + 400 * k, decay: 0.03, gain: 0.3 * k });
      burst(d, { freq: 3200, q: 1.5, decay: 0.025, gain: 0.35 * k });
      break;
    case "table": // masa sekmesi
      tone(d, { freq: 860, decay: 0.05, gain: 0.32 * k });
      burst(d, { freq: 1800, q: 1.4, decay: 0.035, gain: 0.25 * k });
      break;
    case "net":
      burst(d, { type: "lowpass", freq: 1100, decay: 0.09, gain: 0.3 * k });
      break;
    case "floor":
      tone(d, { freq: 620, decay: 0.06, gain: 0.18 * k });
      burst(d, { freq: 1300, q: 1, decay: 0.05, gain: 0.15 * k });
      break;
    case "ballclick": // bilardo topları
      tone(d, { freq: 2900 + 600 * k, decay: 0.022, gain: 0.35 * k });
      burst(d, { freq: 4200, q: 2.5, decay: 0.02, gain: 0.4 * k });
      break;
    case "cushion":
      burst(d, { freq: 420, q: 0.9, decay: 0.08, gain: 0.4 * k });
      tone(d, { freq: 140, decay: 0.08, gain: 0.2 * k });
      break;
    case "pocket":
      burst(d, { type: "lowpass", freq: 380, decay: 0.35, gain: 0.5 });
      tone(d, { freq: 95, decay: 0.3, gain: 0.3, slide: 0.7 });
      break;
    case "cue":
      tone(d, { freq: 1900, decay: 0.03, gain: 0.25 * k });
      burst(d, { freq: 2600, q: 1.8, decay: 0.03, gain: 0.3 * k });
      break;
    case "dice":
      burst(d, { freq: 1600 + 600 * Math.random(), q: 2, decay: 0.03, gain: 0.35 * k });
      tone(d, { freq: 900 + 500 * Math.random(), decay: 0.025, gain: 0.12 * k });
      break;
    case "buzzer":
      tone(d, { freq: 440, decay: 0.35, gain: 0.08, type: "square" });
      break;
    default:
  }
}

/** Air hockey üfleyici uğultusu (döngü). Döndürdüğü fonksiyon durdurur. */
export function startHum(level = 0.035) {
  if (!ensure()) return () => {};
  stopHum();
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 380;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(f).connect(g).connect(master);
  src.start();
  hum = src;
  return stopHum;
}
export function stopHum() {
  try {
    hum?.stop();
  } catch (e) {}
  hum = null;
}
export function refreshVolume() {
  ensure();
}
