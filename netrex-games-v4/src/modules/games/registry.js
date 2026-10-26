/**
 * 🎮 Netrex Games — oyun kayıt defteri (manifest + doğrulama)
 *
 * Her oyun bir manifest ile tanımlanır. Motor (`engine`) yalnızca HOST'ta, arayüz (`view`) herkeste, ikisi de
 * dinamik import ile ve oyun açılınca yüklenir. Yeni oyun eklemek = bir motor + bir arayüz + buraya bir manifest
 * (bkz. docs/games/README.md). Üçüncü taraf kod YÜKLENMEZ: yalnızca bu repodaki birinci taraf modüller kayıtlıdır.
 */

export const CATEGORIES = {
  sports: "Spor",
  party: "Parti",
  board: "Masa Oyunu",
  casual: "Rahat",
};

const COLORS = { red: "Kırmızı", blue: "İndigo", green: "Yeşil", amber: "Turuncu", pink: "Pembe", teal: "Turkuaz" };

export const GAMES = [
  {
    id: "airhockey",
    version: "1.0.0",
    name: "Air Hockey",
    tagline: "Gerçek ölçülü masa, falsolu disk, sıfır gecikme hissi",
    description:
      "2 × 1 m gerçek ölçülü 3B masa: 82,5 mm disk, yuvarlatılmış raylar, hava yastığı. Raydan ve raketten sürtünmeyle sekme diski döndürür (falso). Kendi raketin anında tepki verir; vuruşun host tarafından doğrulanır, skoru yalnızca host belirler.",
    category: "sports",
    accent: "#38bdf8",
    icon: "Zap",
    players: { min: 2, max: 2 },
    bots: true,
    realtime: true,
    secret: false,
    controls: ["Fare / dokunma: raketi sürükle", "Raket yalnızca kendi yarında hareket eder"],
    howTo: ["Diski rakip kaleye gönder.", "İlk hedef skora ulaşan kazanır.", "Rakip ayrılırsa maçı hükmen kazanırsın."],
    config: [
      { key: "target", label: "Hedef skor", group: "Maç", type: "select", options: [3, 5, 7, 10, 15], default: 7 },
      { key: "goal", label: "Kale genişliği", group: "Saha", type: "select", options: ["small", "normal", "large"], labels: { small: "Dar", normal: "Normal", large: "Geniş" }, default: "normal" },
      { key: "padSize", label: "Raket boyutu", group: "Saha", type: "select", options: ["small", "normal", "large"], labels: { small: "Küçük", normal: "Normal", large: "Büyük" }, default: "normal" },
      { key: "puckSpeed", label: "Disk hızı", group: "Saha", type: "select", options: ["slow", "normal", "fast"], labels: { slow: "Yavaş", normal: "Normal", fast: "Hızlı" }, default: "normal" },
      { key: "botLevel", label: "Bot seviyesi", type: "select", options: ["easy", "normal", "hard"], labels: { easy: "Kolay", normal: "Normal", hard: "Zor" }, default: "normal" },
    ],
    engine: () => import("./engines/airhockey.js"),
    view: () => import("./views/AirHockeyView.jsx"),
  },
  {
    id: "pingpong",
    version: "1.0.0",
    name: "Ping Pong",
    tagline: "3B masa tenisi: topspin, kesme, Magnus kavisi",
    description:
      "ITTF ölçülü masa ve file, 40 mm top: hava direnci, Magnus etkisi (topspin dalar, kesme süzülür), falsolu sekme. Raketi yukarı sürersen topspin, aşağı kesersen backspin, hızlı vurursan smaç. Servis, let, çift sekme ve 2 fark kuralları.",
    category: "sports",
    accent: "#f59e0b",
    icon: "Dumbbell",
    players: { min: 2, max: 2 },
    bots: true,
    realtime: true,
    secret: false,
    controls: ["Fare / dokunma / ok tuşları: raketi yana ve yukarı sür (ileri-geri otomatik)", "Servis: tıkla veya Boşluk; raketi hareket ettirerek falso ver"],
    howTo: ["Topu file üzerinden rakip masaya gönder.", "Rakip tarafta iki sekme = sayı.", "Kendi masana düşen ya da dışarı giden top sayı kaybettirir."],
    config: [
      { key: "target", label: "Hedef sayı", group: "Maç", type: "select", options: [5, 7, 11, 15, 21], default: 11 },
      { key: "winBy2", label: "2 sayı fark şartı", group: "Maç", type: "toggle", default: true },
      { key: "serveEvery", label: "Servis kaç sayıda değişsin", group: "Maç", type: "select", options: [1, 2, 5], default: 2 },
      { key: "speed", label: "Top hızı", group: "Fizik", type: "select", options: ["slow", "normal", "fast"], labels: { slow: "Yavaş", normal: "Normal", fast: "Hızlı" }, default: "normal" },
      { key: "botLevel", label: "Bot seviyesi", type: "select", options: ["easy", "normal", "hard"], labels: { easy: "Kolay", normal: "Normal", hard: "Zor" }, default: "normal" },
    ],
    engine: () => import("./engines/pingpong.js"),
    view: () => import("./views/PingPongView.jsx"),
  },
  {
    id: "pool",
    version: "1.0.0",
    name: "Bilardo",
    tagline: "8 top: falso, takip, geri çekme — gerçek fizikle",
    description:
      "8 ft masada 8 top. Toplar kayar ve yuvarlanır; ıstakanın vurduğu nokta takip, geri çekme ve yan falso üretir; bantlar ve cep çeneleri gerçek geometriyle modellenmiştir. Vuruş parametreleri gönderilir, herkes aynı fiziği kendi ekranında 60 fps oynatır: ping'den etkilenmez.",
    category: "sports",
    accent: "#16a34a",
    icon: "Circle",
    players: { min: 2, max: 2 },
    bots: true,
    realtime: false,
    secret: false,
    controls: ["Sürükle: nişan al (Shift: hassas)", "Güç: basılı tut ve geri çek, bırakınca vur", "Sağ alttaki toptan falso noktasını seç", "Elde top: beyazı sürükleyip bırak"],
    howTo: ["Açılıştan sonra ilk geçerli sokuş grubunu belirler (düz 1–7 / çizgili 9–15).", "Kendi grubunu bitir, sonra 8'i sok.", "Faul (beyaz cebe, yanlış ilk temas, bant yok): rakip elde topla oynar.", "8'i erken ya da faulle sokmak oyunu kaybettirir."],
    config: [
      { key: "turnTime", label: "Vuruş süresi", group: "Kurallar", type: "select", options: [0, 30, 45, 60], labels: { 0: "Sınırsız", 30: "30 sn", 45: "45 sn", 60: "60 sn" }, default: 0 },
      { key: "botLevel", label: "Bot seviyesi", type: "select", options: ["easy", "normal", "hard"], labels: { easy: "Kolay", normal: "Normal", hard: "Zor" }, default: "normal" },
    ],
    engine: () => import("./engines/pool.js"),
    view: () => import("./views/PoolView.jsx"),
  },
  {
    id: "tabu",
    version: "1.0.0",
    name: "Tabu",
    tagline: "Yasaklı kelimeleri söylemeden anlat, takımın bilsin",
    description:
      "İki takım sırayla oynar. Anlatıcı kelimeyi yasaklıları söylemeden anlatır; rakip takım gizlice denetler. Kart yalnızca yetkili oyunculara gönderilir.",
    category: "party",
    accent: "#a855f7",
    icon: "MessageCircleQuestion",
    players: { min: 4, max: 12 },
    bots: false,
    realtime: false,
    secret: true,
    teams: true,
    controls: ["Anlatıcı: Doğru / Pas", "Rakip takım: Tabu! (yasaklı söylendiğinde)"],
    howTo: ["Anlatıcı kartı sesli sohbette anlatır.", "Doğru +1, Tabu −1, Pas hakkı sınırlıdır.", "Tüm turlar bitince en yüksek puanlı takım kazanır."],
    config: [
      { key: "secs", label: "Tur süresi (sn)", group: "Tur", type: "select", options: [30, 45, 60, 90, 120], default: 60 },
      { key: "rounds", label: "Takım başına tur", group: "Tur", type: "select", options: [1, 2, 3, 4, 6], default: 3 },
      { key: "passes", label: "Pas hakkı", group: "Tur", type: "select", options: [0, 1, 3, 5], default: 3 },
      { key: "okPts", label: "Doğru bilince puan", group: "Puan", type: "select", options: [1, 2, 3], default: 1 },
      { key: "tabooPts", label: "Tabu cezası", group: "Puan", type: "select", options: [0, 1, 2], default: 1 },
      { key: "name0", label: "1. takım adı", group: "Takımlar", type: "text", max: 16, default: "Kırmızı Takım" },
      { key: "color0", label: "1. takım rengi", group: "Takımlar", type: "select", options: ["red", "blue", "green", "amber", "pink", "teal"], labels: COLORS, default: "red" },
      { key: "name1", label: "2. takım adı", group: "Takımlar", type: "text", max: 16, default: "Mavi Takım" },
      { key: "color1", label: "2. takım rengi", group: "Takımlar", type: "select", options: ["red", "blue", "green", "amber", "pink", "teal"], labels: COLORS, default: "blue" },
      { key: "cardPack", label: "Kart havuzu", group: "Kartlar", type: "select", options: ["builtin", "mix", "custom"], labels: { builtin: "Hazır kartlar", mix: "Hazır + benim kartlarım", custom: "Yalnızca benim kartlarım (≥10)" }, default: "builtin" },
      { key: "customCards", label: "Özel kartlar", group: "Kartlar", type: "area", max: 2400, hint: "Her satır: Kelime: yasak1, yasak2, yasak3 (3–5 yasaklı)", default: "" },
    ],
    engine: () => import("./engines/tabu.js"),
    view: () => import("./views/TabuView.jsx"),
  },
  {
    id: "emlak",
    version: "1.0.0",
    name: "Emlak",
    tagline: "İstanbul'u satın al, kirayı topla, rakiplerini iflas ettir",
    description:
      "Özgün emlak ticaret oyunu: 32 karelik İstanbul tahtası, 7 renk grubu, ulaşım hatları ve idareler. Satın al ya da ihaleye çıkar, grubunu tamamlayıp ev ve otel kur, takas yap, ipotek et. Zarlar gerçek fizikle yuvarlanır; sonuçları sunucu belirler. 2–6 kişi, eksik koltuklara bot eklenebilir.",
    category: "board",
    accent: "#f59e0b",
    icon: "Building2",
    players: { min: 2, max: 6 },
    bots: true,
    realtime: false,
    secret: false,
    controls: ["Zar at, satın al ya da ihaleye çıkar", "Arsana tıkla: ev kur, sat, ipotek et", "Oyuncuya tıkla: takas teklif et"],
    howTo: ["Başlangıçtan her geçişte 200 alırsın.", "Bir renk grubunun tamamı sendeyse kira iki kat olur ve ev kurabilirsin (eşit dağıtarak).", "Parası biten varlık satar ya da iflas eder; son kalan ya da tur sınırında en zengin kazanır."],
    config: [
      { key: "rounds", label: "Tur sınırı", group: "Kurallar", type: "select", options: [15, 25, 40, 60], default: 25 },
      { key: "auctions", label: "Alınmayan arsa ihaleye çıksın", group: "Kurallar", type: "toggle", default: true },
      { key: "turnTime", label: "Hamle süresi", group: "Kurallar", type: "select", options: [0, 45, 60, 90], labels: { 0: "Sınırsız", 45: "45 sn", 60: "60 sn", 90: "90 sn" }, default: 0 },
    ],
    engine: () => import("./engines/emlak.js"),
    view: () => import("./views/EmlakView.jsx"),
  },
  {
    id: "okey",
    version: "1.0.0",
    name: "Okey",
    tagline: "Dört kişilik klasik Türk Okey'i, eksik koltuklara bot",
    description:
      "106 taş, gösterge, okey ve sahte okey ile standart kurallar. Dağıtım ve tüm hamleler sunucuda doğrulanır; kimse başkasının elini göremez. Boş koltukları botlar doldurur.",
    category: "board",
    accent: "#ef4444",
    icon: "LayoutGrid",
    players: { min: 1, max: 4 },
    bots: true,
    realtime: false,
    secret: true,
    controls: ["Taşı sürükle ya da tıkla-seç", "Yığından veya soldaki atıktan çek, sonra taş at", "Eliniz hazırsa taşı 'Bitir'e sürükleyin"],
    howTo: ["Amaç: 14 taşın tamamını seri veya gruplara ayırıp bir taş atarak bitirmek.", "Seri: aynı renk ardışık (≥3). Grup: aynı sayı farklı renk (3–4).", "Okey joker, sahte okey okeyin yüzünü taşır."],
    config: [
      { key: "turnTime", label: "Hamle süresi", group: "Kurallar", type: "select", options: [0, 30, 60, 90], labels: { 0: "Sınırsız", 30: "30 sn", 60: "60 sn", 90: "90 sn" }, default: 0 },
      { key: "hints", label: "Bitirme ipucu (eliniz hazırsa uyarır)", group: "Kurallar", type: "toggle", default: true },
      { key: "botLevel", label: "Bot seviyesi", type: "select", options: ["easy", "normal", "hard"], labels: { easy: "Kolay", normal: "Normal", hard: "Zor" }, default: "normal" },
    ],
    engine: () => import("./engines/okey.js"),
    view: () => import("./views/OkeyView.jsx"),
  },
];

export const getGame = (id) => GAMES.find((g) => g.id === id) || null;

/** Manifest doğrulaması: kayıt anında ve testlerde çalışır; hatalı manifest oyunu kaydetmeyi engeller */
export function validateManifest(m) {
  const errs = [];
  const need = (c, msg) => c || errs.push(msg);
  need(m && typeof m === "object", "manifest yok");
  if (!m || typeof m !== "object") return errs;
  need(/^[a-z][a-z0-9]{1,23}$/.test(m.id || ""), "id geçersiz");
  need(/^\d+\.\d+\.\d+$/.test(m.version || ""), "version semver olmalı");
  need(typeof m.name === "string" && m.name.length > 0 && m.name.length <= 40, "name geçersiz");
  need(typeof m.description === "string" && m.description.length > 0, "description yok");
  need(m.category in CATEGORIES, "category geçersiz");
  need(Number.isInteger(m.players?.min) && Number.isInteger(m.players?.max) && m.players.min >= 1 && m.players.min <= m.players.max && m.players.max <= 12, "players aralığı geçersiz");
  need(typeof m.engine === "function" && typeof m.view === "function", "engine/view yükleyicisi eksik");
  need(Array.isArray(m.howTo) && m.howTo.length > 0, "howTo boş");
  for (const c of m.config || []) {
    const ty = c.type || "select";
    const ok = ty === "select" ? Array.isArray(c.options) && c.options.includes(c.default) : ty === "toggle" ? typeof c.default === "boolean" : typeof c.default === "string" && c.max > 0;
    need(typeof c.key === "string" && ok, `config ${c.key} geçersiz`);
  }
  return errs;
}

/** Ağdan gelen konfigürasyonu manifest şemasına göre temizler (yalnızca bilinen anahtar ve izinli değerler) */
export function cleanConfig(manifest, cfg) {
  const out = {};
  for (const c of manifest.config || []) {
    const v = cfg?.[c.key];
    if (c.type === "toggle") out[c.key] = typeof v === "boolean" ? v : c.default;
    else if (c.type === "text" || c.type === "area") out[c.key] = typeof v === "string" ? v.replace(/[\u0000-\u0009\u000b-\u001f<>]/g, " ").slice(0, c.max) : c.default;
    else out[c.key] = c.options.includes(v) ? v : c.default;
  }
  return out;
}

GAMES.forEach((g) => {
  const e = validateManifest(g);
  if (e.length && typeof console !== "undefined") console.error(`[games] ${g.id} manifest hatası:`, e);
});
