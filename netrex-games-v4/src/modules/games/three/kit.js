/**
 * 🎛️ Ortak 3B altyapı (three.js): renderer, uyarlanabilir kalite (60 fps hedefi), ortam ışığı, temizlik.
 *
 * Kalite kademeleri (0 düşük → 3 ultra). Başlangıç kademesi GPU'dan tahmin edilir, sonra gerçek kare süresine göre
 * otomatik iner/çıkar: önce piksel oranı, sonra gölge haritası. Kullanıcı "Grafik" ayarıyla sabitleyebilir.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const TIERS = [
  { name: "Düşük", dpr: 0.75, shadow: 512, tex: 1024, aa: false, soft: false },
  { name: "Orta", dpr: 1, shadow: 1024, tex: 2048, aa: true, soft: true },
  { name: "Yüksek", dpr: 1.5, shadow: 2048, tex: 2048, aa: true, soft: true },
  { name: "Ultra", dpr: 2, shadow: 4096, tex: 4096, aa: true, soft: true },
];

/** GPU'ya göre başlangıç kademesi (kaba tahmin; asıl karar ölçülen kare süresiyle verilir) */
export function guessTier() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return 0;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (/swiftshader|llvmpipe|software|basic render/i.test(r)) return 0;
    if (/intel.*(hd|uhd) graphics( [2-6]\d\d)?|mali|adreno|powervr|apple gpu/i.test(r)) return 1;
    if (/rtx|radeon rx|geforce gtx 1[0-9]|apple m[1-9]/i.test(r)) return 3;
    return 2;
  } catch (e) {
    return 1;
  }
}

/**
 * @param canvas
 * @param pref "auto" | 0..3
 */
export function createRenderer(canvas, pref = "auto") {
  const start = pref === "auto" ? guessTier() : clampTier(pref);
  const tier = TIERS[start];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.aa, powerPreference: "high-performance", alpha: false, stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r18x: PCFSoft kaldırıldı; yumuşaklık shadow.radius ile
  const maxTex = renderer.capabilities.maxTextureSize || 4096;
  return { renderer, start, auto: pref === "auto", maxTex };
}

const clampTier = (t) => Math.max(0, Math.min(3, Math.round(Number(t) || 0)));

/** Ortam yansıması (prosedürel stüdyo; dosya indirmez, çözünürlükten bağımsız) */
export function studioEnvironment(renderer, scene, intensity = 0.04) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), intensity).texture;
  pmrem.dispose();
  scene.environment = env;
  return env;
}

/**
 * Kare süresi yöneticisi: 2 sn pencerede ortalama > 17,2 ms (≈58 fps altı) ise kalite düşer;
 * 6 sn boyunca < 11 ms ise (ve otomatikse) bir basamak çıkar. Piksel oranı 0,1 adımlarla ayarlanır.
 */
export class Governor {
  constructor({ renderer, tier, auto, lights = [], onChange }) {
    this.r = renderer;
    this.tier = tier;
    this.auto = auto;
    this.lights = lights;
    this.onChange = onChange;
    this.dpr = Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr);
    this.r.setPixelRatio(this.dpr);
    this.applyShadow();
    this.samples = [];
    this.lastAdjust = performance.now();
    this.fastSince = 0;
    this.fps = 60;
  }

  applyShadow() {
    const size = TIERS[this.tier].shadow;
    for (const l of this.lights) {
      if (!l.castShadow || l.shadow.mapSize.x === size) continue;
      l.shadow.mapSize.set(size, size);
      l.shadow.map?.dispose();
      l.shadow.map = null;
    }
  }

  /** Her karede çağrılır (ms) */
  frame(ms) {
    this.samples.push(ms);
    if (this.samples.length > 240) this.samples.shift();
    const now = performance.now();
    if (now - this.lastAdjust < 2000 || this.samples.length < 60) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.fps = Math.round(1000 / avg);
    if (!this.auto) return;
    if (avg > 17.2) {
      this.lastAdjust = now;
      this.samples.length = 0;
      if (this.dpr > 0.6) this.setDpr(this.dpr - 0.15);
      else if (this.tier > 0) this.setTier(this.tier - 1);
      return;
    }
    if (avg < 11) {
      if (!this.fastSince) this.fastSince = now;
      if (now - this.fastSince > 6000) {
        this.fastSince = 0;
        this.lastAdjust = now;
        this.samples.length = 0;
        const cap = Math.min(window.devicePixelRatio || 1, TIERS[this.tier].dpr);
        if (this.dpr < cap - 0.01) this.setDpr(Math.min(cap, this.dpr + 0.15));
        else if (this.tier < 3) this.setTier(this.tier + 1);
      }
    } else this.fastSince = 0;
  }

  setDpr(d) {
    this.dpr = Math.max(0.5, Math.round(d * 100) / 100);
    this.r.setPixelRatio(this.dpr);
    this.onChange?.(this);
  }

  setTier(t) {
    this.tier = clampTier(t);
    this.applyShadow();
    this.onChange?.(this);
  }
}

/** Sahnedeki tüm geometri/malzeme/dokuları serbest bırakır */
export function disposeScene(scene) {
  const seen = new Set();
  scene.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) (seen.add(o.geometry), o.geometry.dispose());
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const k in m) if (m[k]?.isTexture && !seen.has(m[k])) (seen.add(m[k]), m[k].dispose());
      m.dispose();
    }
  });
  scene.environment?.dispose?.();
}

/** Ekran koordinatından bir düzleme ışın kesişimi (Y = h yatay düzlem) */
const _ray = new THREE.Raycaster();
const _v2 = new THREE.Vector2();
const _hit = new THREE.Vector3();
export function pickPlane(camera, canvas, clientX, clientY, plane) {
  const r = canvas.getBoundingClientRect();
  _v2.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  _ray.setFromCamera(_v2, camera);
  return _ray.ray.intersectPlane(plane, _hit) ? _hit.clone() : null;
}
