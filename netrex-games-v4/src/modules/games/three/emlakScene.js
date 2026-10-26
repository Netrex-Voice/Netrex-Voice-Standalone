/**
 * 🏙️ Emlak 3B sahnesi: ahşap masa üstünde basılı tahta (4K'ya kadar), torna piyonlar, ev/otel, Rapier fizikli zarlar.
 *
 * Zar: sonuç HOST'tan gelir. İstemci zarları gerçek fizikle (Rapier) yuvarlar; simülasyon önceden koşturulur, sonunda üstte
 * kalan yüz bulunur ve zarın yüz numaralandırması küpün 24 simetrisinden biriyle döndürülür → üst yüz host'un sayısını
 * gösterir. Görünen yuvarlanma gerçek, sayı garantili.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createRenderer, studioEnvironment, Governor, disposeScene, pickPlane, TIERS } from "./kit";
import { woodTexture, feltTexture, floorTexture, canvas, toTexture } from "./textures";
import { BOARD, GROUPS, N } from "../engines/emlak";

const H = 0.76; // masa yüksekliği
const SIDE = 1.0; // tahta kenarı (m)
const C = 0.14; // köşe kare
const W = (SIDE - 2 * C) / 7; // kenar kare genişliği
const DIE = 0.026;

/** Kare i'nin tahta üzerindeki merkezi (x, z) ve kenarı (0 alt, 1 sol, 2 üst, 3 sağ) */
export function squareCenter(i) {
  const side = Math.floor(i / 8);
  const k = i % 8;
  const half = SIDE / 2;
  const off = k === 0 ? 0 : C + (k - 0.5) * W; // köşeden uzaklık
  const inner = k === 0 ? C / 2 : C / 2; // kenar şeridinin ortası
  // 0: sağ alt köşeden sola; 1: sol alttan yukarı; 2: sol üstten sağa; 3: sağ üstten aşağı
  const along = k === 0 ? C / 2 : off;
  if (side === 0) return { x: half - along, z: half - inner, side };
  if (side === 1) return { x: -half + inner, z: half - along, side };
  if (side === 2) return { x: -half + along, z: -half + inner, side };
  return { x: half - inner, z: -half + along, side };
}

function boardTexture(size, aniso) {
  const c = canvas(size, size);
  const g = c.getContext("2d");
  const ppm = size / SIDE;
  g.fillStyle = "#e8efe4";
  g.fillRect(0, 0, size, size);
  // merkez
  g.fillStyle = "#d9e6d5";
  g.fillRect(C * ppm, C * ppm, (SIDE - 2 * C) * ppm, (SIDE - 2 * C) * ppm);
  g.save();
  g.translate(size / 2, size / 2);
  g.rotate(-Math.PI / 4);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#b91c1c";
  g.font = `900 ${0.11 * ppm}px system-ui, sans-serif`;
  g.fillText("EMLAK", 0, -0.02 * ppm);
  g.fillStyle = "#1f2937";
  g.font = `600 ${0.028 * ppm}px system-ui, sans-serif`;
  g.fillText("İstanbul · Netrex", 0, 0.06 * ppm);
  g.restore();
  // kartlar alanı
  g.strokeStyle = "#7c8f78";
  g.lineWidth = 0.002 * ppm;
  g.setLineDash([0.01 * ppm, 0.006 * ppm]);
  g.strokeRect(0.56 * ppm, 0.27 * ppm, 0.14 * ppm, 0.09 * ppm);
  g.setLineDash([]);
  // kareler
  for (let i = 0; i < N; i++) {
    const sq = BOARD[i];
    const { x, z, side } = squareCenter(i);
    const corner = i % 8 === 0;
    const w = corner ? C : W;
    const h = C;
    g.save();
    g.translate((x + SIDE / 2) * ppm, (z + SIDE / 2) * ppm);
    g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][side]);
    // yerel: kare genişliği w (yatay), yükseklik h; dış kenar aşağıda (+y)
    g.strokeStyle = "#2b2b2b";
    g.lineWidth = 0.0015 * ppm;
    g.strokeRect((-w / 2) * ppm, (-h / 2) * ppm, w * ppm, h * ppm);
    g.fillStyle = "#1f2937";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (sq.kind === "prop") {
      g.fillStyle = GROUPS[sq.g].color;
      g.fillRect((-w / 2) * ppm, (-h / 2) * ppm, w * ppm, 0.032 * ppm);
      g.strokeRect((-w / 2) * ppm, (-h / 2) * ppm, w * ppm, 0.032 * ppm);
    }
    const name = sq.name;
    g.fillStyle = "#111827";
    const fs = corner ? 0.018 : 0.0135;
    g.font = `700 ${fs * ppm}px system-ui, sans-serif`;
    const words = name.split(" ");
    const y0 = corner ? -0.01 : sq.kind === "prop" ? -0.02 : -0.035;
    words.forEach((wd, k) => g.fillText(wd, 0, (y0 + k * fs * 1.15) * ppm));
    if (sq.kind === "transit") {
      g.font = `${0.03 * ppm}px system-ui`;
      g.fillText(name.includes("Vapur") ? "⛴" : name.includes("Metro") ? "🚇" : name.includes("Teleferik") ? "🚡" : "🚆", 0, 0.012 * ppm);
    }
    if (sq.kind === "util") {
      g.font = `${0.03 * ppm}px system-ui`;
      g.fillText(name.includes("Elektrik") ? "💡" : "💧", 0, 0.012 * ppm);
    }
    if (sq.kind === "card") {
      g.font = `900 ${0.05 * ppm}px system-ui`;
      g.fillStyle = "#b45309";
      g.fillText("?", 0, 0.015 * ppm);
    }
    if (sq.kind === "tax") {
      g.font = `600 ${0.012 * ppm}px system-ui`;
      g.fillText(`${sq.amount} öde`, 0, 0.03 * ppm);
    }
    if (sq.price) {
      g.font = `600 ${0.012 * ppm}px system-ui, sans-serif`;
      g.fillStyle = "#374151";
      g.fillText(`₺${sq.price}`, 0, (h / 2 - 0.014) * ppm);
    }
    if (corner) {
      g.font = `${0.04 * ppm}px system-ui`;
      g.fillText(sq.kind === "start" ? "⬅" : sq.kind === "jail" ? "🔒" : sq.kind === "park" ? "🌳" : "🚓", 0, 0.03 * ppm);
    }
    g.restore();
  }
  const t = toTexture(c, { aniso });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function pipTexture(n, size = 256) {
  const c = canvas(size, size);
  const g = c.getContext("2d");
  g.fillStyle = "#f8f6f0";
  g.fillRect(0, 0, size, size);
  const p = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.27, 0.23], [0.73, 0.23], [0.27, 0.5], [0.73, 0.5], [0.27, 0.77], [0.73, 0.77]] }[n];
  for (const [x, y] of p) {
    const gr = g.createRadialGradient(x * size, y * size, 0, x * size, y * size, size * 0.09);
    gr.addColorStop(0, n === 1 ? "#7f1d1d" : "#0b0b0b");
    gr.addColorStop(0.75, n === 1 ? "#b91c1c" : "#1f1f1f");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x * size, y * size, size * 0.085, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c, { aniso: 4 });
}

// Standart zar: yüz indeksi (BoxGeometry: +x,−x,+y,−y,+z,−z) → sayı (karşıtlar toplamı 7)
const STD = [3, 4, 1, 6, 2, 5];
const FACE_N = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
/** Küpün 24 dönüş simetrisi */
const ROTS = (() => {
  const out = [];
  const seen = new Set();
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  const stack = [new THREE.Quaternion()];
  while (stack.length && out.length < 24) {
    const q = stack.pop();
    const key = FACE_N.map((n) => n.clone().applyQuaternion(q)).map((v) => `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)}`).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    for (const r of [qx, qy, qz]) stack.push(q.clone().multiply(r));
  }
  return out;
})();
const topFace = (q) => {
  let best = 0;
  let by = -2;
  FACE_N.forEach((n, i) => {
    const y = n.clone().applyQuaternion(q).y;
    if (y > by) (by = y), (best = i);
  });
  return best;
};
/** Sim sonunda yüz `face` üstte; görsel ön-dönüş R öyle seçilir ki o yüzde `want` görünsün */
function relabel(face, want) {
  for (const R of ROTS) {
    // mesh = sim · R: yerel yüz f'deki sayı = STD[R⁻¹ uygulanmış yüz]
    const nLocal = FACE_N[face].clone().applyQuaternion(R.clone().invert());
    const idx = FACE_N.findIndex((n) => n.distanceTo(nLocal) < 0.01);
    if (STD[idx] === want) return R;
  }
  return new THREE.Quaternion();
}

function pawnGeometry() {
  const p = [[0, 0], [0.012, 0], [0.0125, 0.002], [0.012, 0.004], [0.0085, 0.006], [0.0062, 0.014], [0.0055, 0.021], [0.0078, 0.023], [0.0078, 0.0245], [0.005, 0.0255]];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    p.push([0.0068 * Math.cos(a) + 0.00001, 0.032 + 0.0068 * Math.sin(a)]);
  }
  const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  g.computeVertexNormals();
  return g;
}

export class EmlakScene {
  constructor(canvasEl, o) {
    this.canvas = canvasEl;
    const { renderer, start, auto, maxTex } = createRenderer(canvasEl, o.gfx);
    this.renderer = renderer;
    const tex = Math.min(maxTex, TIERS[start].tex);
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color("#141210");
    scene.fog = new THREE.Fog("#141210", 2.5, 7);
    studioEnvironment(renderer, scene, 0.04);
    scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight("#fff5e6", "#1a120a", 0.5));
    const key = new THREE.SpotLight("#fff3df", 14, 4, Math.PI / 4, 0.6, 1.4);
    key.position.set(0.35, H + 1.6, 0.5);
    key.target.position.set(0, H, 0);
    key.castShadow = true;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.005;
    key.shadow.radius = 3;
    key.shadow.camera.near = 0.8;
    key.shadow.camera.far = 3;
    scene.add(key, key.target);

    // masa (ahşap) + keçe altlık
    const wood = woodTexture(Math.min(2048, tex), { base: [118, 74, 42], dark: [66, 38, 18], seed: 19, rings: 16 });
    const planks = floorTexture(Math.min(2048, tex), 23);
    planks.map.repeat.set(1.3, 1);
    const table = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.05, 1.5, 4, 0.02), new THREE.MeshStandardMaterial({ map: planks.map, roughness: 0.55 }));
    table.position.y = H - 0.025;
    table.receiveShadow = true;
    scene.add(table);
    // tahta (karton, hafif kalın)
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTexture(tex, aniso), roughness: 0.55 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: "#1f3b2a", roughness: 0.6 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(SIDE, 0.006, SIDE), [edgeMat, edgeMat, boardMat, edgeMat, edgeMat, edgeMat]);
    board.position.y = H + 0.003;
    board.receiveShadow = true;
    board.castShadow = true;
    scene.add(board);
    // zar tepsisi (keçe)
    const felt = feltTexture(Math.min(1024, tex), [96, 22, 28], 7);
    this.trayY = H + 0.006;
    // zar tepsisi: keçe zemin + ahşap kenar (zarlar bunun içinde yuvarlanır)
    const tray = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ map: felt.map, normalMap: felt.normalMap, roughness: 0.95 }));
    tray.rotation.x = -Math.PI / 2;
    tray.position.set(-0.12, this.trayY + 0.0006, 0.08);
    tray.receiveShadow = true;
    scene.add(tray);
    const rimMat = new THREE.MeshPhysicalMaterial({ map: wood.map, roughness: 0.35, clearcoat: 0.4 });
    for (const [x, z, w, d] of [[-0.12, -0.022, 0.312, 0.012], [-0.12, 0.182, 0.312, 0.012], [-0.276, 0.08, 0.012, 0.212], [0.036, 0.08, 0.012, 0.212]]) {
      const rim = new THREE.Mesh(new RoundedBoxGeometry(w, 0.022, d, 3, 0.004), rimMat);
      rim.position.set(x, this.trayY + 0.011, z);
      rim.castShadow = true;
      scene.add(rim);
    }

    // piyonlar
    this.pawnGeo = pawnGeometry();
    this.pawns = [];
    // ev/otel örnekleri (instanced)
    const houseGeo = new THREE.BoxGeometry(0.014, 0.012, 0.016);
    const roofGeo = new THREE.ConeGeometry(0.0115, 0.008, 4);
    roofGeo.rotateY(Math.PI / 4);
    this.houseMesh = new THREE.InstancedMesh(houseGeo, new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.4 }), 32);
    this.roofMesh = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.4 }), 32);
    this.hotelMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.03, 0.016, 0.018, 2, 0.002), new THREE.MeshStandardMaterial({ color: "#b91c1c", roughness: 0.35 }), 12);
    for (const m of [this.houseMesh, this.roofMesh, this.hotelMesh]) {
      m.castShadow = true;
      m.count = 0;
      scene.add(m);
    }
    // sahiplik işaretleri (kare kenarında renkli şerit)
    this.ownMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.0015, 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), N);
    this.ownMesh.count = 0;
    scene.add(this.ownMesh);

    // zarlar
    const faces = [1, 2, 3, 4, 5, 6].map((n) => pipTexture(n, Math.min(512, tex / 4)));
    const dieMats = STD.map((n) => new THREE.MeshPhysicalMaterial({ map: faces[n - 1], roughness: 0.25, clearcoat: 0.8 }));
    this.dice = [0, 1].map(() => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(DIE, DIE, DIE, 4, DIE * 0.12), dieMats);
      m.castShadow = true;
      scene.add(m);
      return m;
    });
    this.dice.forEach((d, i) => d.position.set(-0.16 + i * 0.05, this.trayY + DIE / 2, 0.08));
    this.diceAnim = null;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.02, 20);
    this.camera.position.set(0, H + 1.05, 0.9);
    this.camera.lookAt(0, H, 0.02);
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(H + 0.006));
    this.gov = new Governor({ renderer, tier: start, auto, lights: [key] });
    this.tokenPos = [];
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // tahtanın tamamı sığsın
    this.camera.fov = Math.min(70, Math.max(38, w / h < 1.2 ? 58 : 44));
    this.camera.updateProjectionMatrix();
  }

  /** İşaretçiden kare indeksi */
  pickSquare(clientX, clientY) {
    const p = pickPlane(this.camera, this.canvas, clientX, clientY, this.plane);
    if (!p) return -1;
    let best = -1;
    let bd = 1;
    for (let i = 0; i < N; i++) {
      const c = squareCenter(i);
      const d = Math.max(Math.abs(p.x - c.x), Math.abs(p.z - c.z));
      if (d < bd) (bd = d), (best = i);
    }
    return bd < C * 0.55 ? best : -1;
  }

  setPlayers(players) {
    while (this.pawns.length < players.length) {
      const m = new THREE.Mesh(this.pawnGeo, new THREE.MeshPhysicalMaterial({ color: "#fff", roughness: 0.25, clearcoat: 1 }));
      m.castShadow = true;
      this.scene.add(m);
      this.pawns.push(m);
    }
    players.forEach((p, i) => {
      this.pawns[i].material.color.set(p.color);
      this.pawns[i].visible = !p.out;
      if (this.tokenPos[i] == null) this.tokenPos[i] = { at: p.pos, path: [], t: 0 };
      const tp = this.tokenPos[i];
      const target = p.pos;
      const last = tp.path.length ? tp.path[tp.path.length - 1] : tp.at;
      if (target !== last) {
        // kare kare yürüyüş yolu (ileri; gözaltına ışınlanmada doğrudan)
        const steps = (target - last + N) % N;
        if (steps > 0 && steps <= 12) for (let k = 1; k <= steps; k++) tp.path.push((last + k) % N);
        else tp.path.push(target);
      }
    });
  }

  setBoard(own, houses, mort, players) {
    // sahiplik şeritleri
    let k = 0;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      if (own[i] == null) continue;
      const c = squareCenter(i);
      const horiz = c.side === 0 || c.side === 2;
      const out = c.side === 0 ? 1 : c.side === 2 ? -1 : 0;
      const outX = c.side === 1 ? -1 : c.side === 3 ? 1 : 0;
      m4.compose(new THREE.Vector3(c.x + outX * (C / 2 + 0.006), H + 0.0065, c.z + out * (C / 2 + 0.006)), new THREE.Quaternion(), new THREE.Vector3(horiz ? W * 0.9 : 0.008, 1, horiz ? 0.008 : W * 0.9));
      this.ownMesh.setMatrixAt(k, m4);
      this.ownMesh.setColorAt(k, new THREE.Color(mort[i] ? "#6b7280" : players[own[i]].color));
      k++;
    }
    this.ownMesh.count = k;
    this.ownMesh.instanceMatrix.needsUpdate = true;
    if (this.ownMesh.instanceColor) this.ownMesh.instanceColor.needsUpdate = true;
    // evler / oteller (renk bandının üstünde sıralı)
    let h = 0;
    let o = 0;
    for (let i = 0; i < N; i++) {
      const n = houses[i];
      if (!n) continue;
      const c = squareCenter(i);
      const inward = [[0, -1], [1, 0], [0, 1], [-1, 0]][c.side];
      const bx = c.x + inward[0] * (C / 2 - 0.016);
      const bz = c.z + inward[1] * (C / 2 - 0.016);
      const along = c.side === 0 || c.side === 2 ? [1, 0] : [0, 1];
      if (n === 5) {
        m4.compose(new THREE.Vector3(bx, H + 0.014, bz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.side % 2 ? Math.PI / 2 : 0), new THREE.Vector3(1, 1, 1));
        this.hotelMesh.setMatrixAt(o++, m4);
      } else
        for (let q = 0; q < n; q++) {
          const off = (q - (n - 1) / 2) * 0.02;
          const pos = new THREE.Vector3(bx + along[0] * off, H + 0.012, bz + along[1] * off);
          m4.compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
          this.houseMesh.setMatrixAt(h, m4);
          m4.compose(pos.clone().setY(H + 0.022), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
          this.roofMesh.setMatrixAt(h, m4);
          h++;
        }
    }
    this.houseMesh.count = this.roofMesh.count = h;
    this.hotelMesh.count = o;
    for (const m of [this.houseMesh, this.roofMesh, this.hotelMesh]) m.instanceMatrix.needsUpdate = true;
  }

  /**
   * Zar at: Rapier ile önceden simüle et, son yüzleri istenen sonuca göre yeniden etiketle, sonra oynat.
   * seed: aynı atış için tüm istemcilerde benzer görünüm (tohumlu başlangıç).
   */
  async roll(result, seed, onClack) {
    let RAPIER;
    try {
      RAPIER = (await import("@dimforge/rapier3d-compat")).default;
      await RAPIER.init();
    } catch (e) {
      // fizik yüklenemezse: zarları doğrudan sonuca koy
      this.dice.forEach((d, i) => d.quaternion.copy(relabel(2, result[i])));
      return;
    }
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = 1 / 240;
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-0.12, this.trayY, 0.08));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 0.001, 0.1).setTranslation(0, -0.001, 0).setFriction(0.6).setRestitution(0.35), ground);
    for (const [x, z, hx, hz] of [[-0.156, 0, 0.006, 0.106], [0.156, 0, 0.006, 0.106], [0, -0.102, 0.156, 0.006], [0, 0.102, 0.156, 0.006]])
      world.createCollider(RAPIER.ColliderDesc.cuboid(hx, 0.05, hz).setTranslation(x, 0.05, z).setRestitution(0.4).setFriction(0.3), ground);
    let r = seed >>> 0 || 1;
    const rnd = () => ((r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
    const bodies = [0, 1].map((i) => {
      const b = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(-0.24 + i * 0.03, this.trayY + 0.07 + i * 0.01, 0.13 - i * 0.02)
          .setLinvel(0.9 + rnd() * 0.4, 0.2 + rnd() * 0.3, -0.35 - rnd() * 0.3)
          .setAngvel({ x: (rnd() - 0.5) * 40, y: (rnd() - 0.5) * 40, z: (rnd() - 0.5) * 40 })
          .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)))
          .setCcdEnabled(true)
      );
      world.createCollider(RAPIER.ColliderDesc.roundCuboid(DIE / 2 - 0.003, DIE / 2 - 0.003, DIE / 2 - 0.003, 0.003).setDensity(1200).setFriction(0.45).setRestitution(0.3), b);
      return b;
    });
    // önceden simüle et (en fazla 4 sn), kareleri kaydet
    const frames = [];
    let clacks = [];
    let lastV = [0, 0];
    for (let step = 0; step < 240 * 4; step++) {
      world.step();
      if (step % 4 === 0) {
        frames.push(bodies.map((b) => ({ p: { ...b.translation() }, q: { ...b.rotation() } })));
        bodies.forEach((b, i) => {
          const v = b.linvel();
          const sp = Math.hypot(v.x, v.y, v.z);
          if (lastV[i] - sp > 0.35) clacks.push({ f: frames.length - 1, k: Math.min(1, (lastV[i] - sp) / 1.5) });
          lastV[i] = sp;
        });
      }
      if (step > 120 && bodies.every((b) => b.isSleeping() || Math.hypot(b.linvel().x, b.linvel().y, b.linvel().z) < 0.002)) break;
    }
    const fixes = bodies.map((b, i) => {
      const q = new THREE.Quaternion(b.rotation().x, b.rotation().y, b.rotation().z, b.rotation().w);
      return relabel(topFace(q), result[i]);
    });
    world.free();
    this.diceAnim = { frames, i: 0, acc: 0, fixes, clacks, onClack };
  }

  /** Her karede çağrılır */
  update(dt, ms) {
    // zar animasyonu (60 Hz kayıt)
    const a = this.diceAnim;
    if (a) {
      a.acc += dt;
      while (a.acc >= 1 / 60 && a.i < a.frames.length - 1) {
        a.acc -= 1 / 60;
        a.i++;
        for (const c of a.clacks) if (c.f === a.i) a.onClack?.(c.k);
      }
      const f = a.frames[a.i];
      f.forEach((st, k) => {
        this.dice[k].position.set(st.p.x, st.p.y, st.p.z);
        this.dice[k].quaternion.set(st.q.x, st.q.y, st.q.z, st.q.w).multiply(a.fixes[k]);
      });
      if (a.i >= a.frames.length - 1) this.diceAnim = null;
    }
    // piyon yürüyüşü (kare başına 0,16 sn zıplama)
    this.tokenPos.forEach((tp, i) => {
      const m = this.pawns[i];
      if (!m) return;
      if (tp.path.length) {
        tp.t += dt / 0.16;
        if (tp.t >= 1) {
          tp.at = tp.path.shift();
          tp.t = 0;
        }
      }
      const from = squareCenter(tp.at);
      const to = tp.path.length ? squareCenter(tp.path[0]) : from;
      const t = tp.path.length ? tp.t : 0;
      const e = t * t * (3 - 2 * t);
      // aynı karedeki piyonlar yan yana
      const ox = ((i % 3) - 1) * 0.022;
      const oz = (Math.floor(i / 3) - 0.5) * 0.022;
      m.position.set(from.x + (to.x - from.x) * e + ox, H + 0.006 + Math.sin(Math.PI * t) * 0.03, from.z + (to.z - from.z) * e + oz);
    });
    this.gov.frame(ms);
    this.renderer.render(this.scene, this.camera);
  }

  get stats() {
    return { fps: this.gov.fps, tier: TIERS[this.gov.tier].name, dpr: this.gov.dpr, calls: this.renderer.info.render.calls };
  }

  dispose() {
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}
