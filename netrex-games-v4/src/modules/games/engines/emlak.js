/**
 * 🏙️ Emlak — özgün emlak ticaret oyunu (Monopoly türü; tahta, isimler, fiyatlar ve kart metinleri özgündür).
 *
 * Tahta: 32 kare, İstanbul semtleri. 7 renk grubunda 18 arsa, 4 ulaşım hattı, 2 idare, 3 Şans karesi, 1 vergi, 4 köşe.
 * Kurallar (bu dosyanın uyguladığı):
 *  • Sıra: zar at → ilerle → kareyi çöz. Çift atınca tekrar atarsın; üst üste 3 çift = gözaltı.
 *  • Başlangıçtan geçince +200. Sahipsiz arsa: satın al ya da ihaleye çıkar (tüm oyuncular açık artırma).
 *  • Kira: sahibine otomatik ödenir; renk grubunun tamamı aynı kişideyse ve evsizse iki kat; ipotekli arsadan kira alınmaz.
 *  • Ev/otel: grubun tamamı sende ve ipoteksizse; gruptaki arsalar arası en fazla 1 ev farkı (eşit kurma);
 *    banka stoğu 32 ev / 12 otel. Ev satışı yarı fiyatına.
 *  • İpotek: arsa fiyatının yarısı; kaldırmak %10 fazlasına. Üzerinde ev olan grupta ipotek yok.
 *  • Gözaltı: Polis karesi, 3 çift ya da kart. Çıkış: 50 öde, çift at (3 hak; 3. denemede ödersin) ya da kart.
 *  • Borç: nakit eksiye düşerse ev satıp/ipotek ederek kapatmalısın; kapatamazsan iflas (varlıklar alacaklıya / bankaya).
 *  • Bitiş: tek oyuncu kalınca ya da tur sınırında (15/25/40/60) net değeri en yüksek olan — her oyun mutlaka biter.
 * Gizli bilgi: kart destesinin sırası yalnızca host'ta.
 */
import { clamp, fin, shuffle } from "./util.js";

export const START_MONEY = 1500;
export const PASS_GO = 200;
export const JAIL = 8;
export const POLICE = 24;
export const JAIL_FINE = 50;
export const HOUSES = 32;
export const HOTELS = 12;

export const GROUPS = [
  { name: "Tarihi Yarımada", color: "#8b5a3c", house: 50 },
  { name: "Boğaz Köyleri", color: "#7dd3fc", house: 50 },
  { name: "Kadıköy", color: "#e879f9", house: 100 },
  { name: "Beyoğlu", color: "#fb923c", house: 100 },
  { name: "Sahil", color: "#ef4444", house: 150 },
  { name: "İş Merkezi", color: "#facc15", house: 150 },
  { name: "Yalılar", color: "#2563eb", house: 200 },
];

const P = (name, g, price) => ({ kind: "prop", name, g, price });
export const BOARD = [
  { kind: "start", name: "Başlangıç" },
  P("Balat", 0, 60),
  { kind: "card", name: "Şans" },
  P("Fener", 0, 80),
  { kind: "transit", name: "Vapur İskelesi", price: 200 },
  P("Kuzguncuk", 1, 100),
  { kind: "util", name: "Elektrik İdaresi", price: 150 },
  P("Çengelköy", 1, 120),
  { kind: "jail", name: "Gözaltı" },
  P("Moda", 2, 140),
  P("Caferağa", 2, 140),
  { kind: "card", name: "Şans" },
  { kind: "transit", name: "Metro Hattı", price: 200 },
  P("Yeldeğirmeni", 2, 160),
  P("Cihangir", 3, 180),
  P("Galata", 3, 180),
  { kind: "park", name: "Park" },
  P("Karaköy", 3, 200),
  { kind: "card", name: "Şans" },
  P("Nişantaşı", 4, 220),
  { kind: "transit", name: "Teleferik", price: 200 },
  P("Bebek", 4, 220),
  { kind: "util", name: "Su İdaresi", price: 150 },
  P("Arnavutköy", 4, 240),
  { kind: "police", name: "Polis" },
  P("Levent", 5, 260),
  P("Maslak", 5, 260),
  { kind: "transit", name: "Marmaray", price: 200 },
  { kind: "tax", name: "Lüks Vergisi", amount: 100 },
  P("Etiler", 5, 280),
  P("Yeniköy", 6, 320),
  P("Tarabya", 6, 360),
];
export const N = BOARD.length;
const RENT_MUL = [1, 5, 15, 40, 55, 70]; // 0 ev (taban), 1–4 ev, otel (5)
export const baseRent = (sq) => Math.max(2, Math.round(sq.price * 0.08));
export const groupSquares = (g) => BOARD.map((s, i) => (s.kind === "prop" && s.g === g ? i : -1)).filter((i) => i >= 0);

export const CARDS = [
  { t: "Kripto yatırımın tuttu.", money: 150 },
  { t: "Trafik cezası.", money: -40 },
  { t: "Başlangıca ilerle.", goto: 0 },
  { t: "3 kare geri git.", back: 3 },
  { t: "Herkese kahve ısmarladın: her oyuncuya 25 öde.", each: -25 },
  { t: "Ev arkadaşların kirayı paylaştı: her oyuncudan 20 al.", each: 20 },
  { t: "Bina bakımı: ev başına 25, otel başına 100 öde.", repair: [25, 100] },
  { t: "Kaldırımı kapattın — gözaltına!", jail: true },
  { t: "Gözaltından ücretsiz çık (sakla).", free: true },
  { t: "Moda'ya ilerle.", goto: 9 },
  { t: "Banka hatası lehine.", money: 100 },
  { t: "Veteriner masrafı.", money: -50 },
  { t: "Mahalle piyangosu çıktı.", money: 100 },
  { t: "Tarabya'ya ilerle.", goto: 31 },
  { t: "En yakın ulaşım hattına ilerle; sahibine iki kat öde.", transit: true },
  { t: "Vergi iadesi.", money: 40 },
];

export const meta = { seats: [2, 6], fillBots: false };
const TOKENS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6"];

export function create({ players, config = {}, rng = Math.random }) {
  const ps = players.slice(0, 6).map((p, i) => ({ id: p.id, name: p.name || `Oyuncu ${i + 1}`, bot: !!p.bot, color: TOKENS[i], cash: START_MONEY, pos: 0, jail: 0, free: 0, out: false, doubles: 0 }));
  return {
    t: "emlak",
    rng,
    players: ps,
    own: BOARD.map(() => null), // sahip indeksi
    houses: BOARD.map(() => 0), // 0–4 ev, 5 = otel
    mort: BOARD.map(() => false),
    bank: { houses: HOUSES, hotels: HOTELS },
    deck: shuffle([...CARDS.keys()], rng),
    deckPos: 0,
    turn: 0,
    round: 1,
    maxRounds: [15, 25, 40, 60].includes(config.rounds) ? config.rounds : 25, // her oyun biter (sınırsız seçenek yok)
    turnTime: [0, 45, 60, 90].includes(config.turnTime) ? config.turnTime : 0,
    auctionsOn: config.auctions !== false,
    phase: "roll", // roll | buy | auction | manage | debt | over
    dice: [0, 0],
    rolls: 0, // zar atış sayacı (istemci animasyonu için)
    canRollAgain: false,
    auction: null, // { sq, bid, by, endsIn, passed:Set }
    trade: null, // { from, to, give:{cash, props}, get:{cash, props}, id }
    debt: null, // { to: idx|-1, amount }
    log: [],
    winner: null,
    reason: "",
    botT: 1.2,
    turnLeft: 0,
    card: null, // son çekilen kart metni (herkese açık)
  };
}

const cur = (s) => s.players[s.turn];
const alive = (s) => s.players.filter((p) => !p.out);
function log(s, text) {
  s.log.push(text);
  if (s.log.length > 40) s.log.shift();
}

function ownsGroup(s, g, who) {
  return groupSquares(g).every((i) => s.own[i] === who);
}

export function rentOf(s, i, diceSum) {
  const sq = BOARD[i];
  const o = s.own[i];
  if (o == null || s.mort[i]) return 0;
  if (sq.kind === "prop") {
    const h = s.houses[i];
    const base = baseRent(sq);
    if (h > 0) return base * RENT_MUL[h];
    return ownsGroup(s, sq.g, o) ? base * 2 : base;
  }
  if (sq.kind === "transit") {
    const n = BOARD.filter((b, k) => b.kind === "transit" && s.own[k] === o && !s.mort[k]).length;
    return 25 * 2 ** (n - 1);
  }
  if (sq.kind === "util") {
    const n = BOARD.filter((b, k) => b.kind === "util" && s.own[k] === o && !s.mort[k]).length;
    return diceSum * (n === 2 ? 10 : 4);
  }
  return 0;
}

/** Ödeme: nakit yetmezse borç fazına geçer (oyuncu varlık satmalı ya da iflas) */
function pay(s, who, amount, to = -1) {
  const p = s.players[who];
  p.cash -= amount;
  if (to >= 0) s.players[to].cash += amount;
  if (p.cash < 0) {
    s.debt = { who, to, amount: -p.cash };
    // alacaklı tutarın tamamını aldı; açığı borçlu kapatana kadar oyun bekler (adil: alacaklıdan geri alınmaz)
    s.phase = "debt";
    log(s, `${p.name} nakit sıkıntısında: ${-p.cash} borç`);
  }
}

function move(s, steps) {
  const p = cur(s);
  const np = (p.pos + steps + N) % N;
  if (steps > 0 && np < p.pos) {
    p.cash += PASS_GO;
    log(s, `${p.name} başlangıçtan geçti: +${PASS_GO}`);
  }
  p.pos = np;
  land(s);
}

function goJail(s, who) {
  const p = s.players[who];
  p.pos = JAIL;
  p.jail = 1;
  p.doubles = 0;
  s.canRollAgain = false;
  log(s, `${p.name} gözaltına alındı`);
}

function land(s) {
  const p = cur(s);
  const i = p.pos;
  const sq = BOARD[i];
  if (sq.kind === "police") {
    goJail(s, s.turn);
    s.phase = "manage";
    return;
  }
  if (sq.kind === "tax") {
    log(s, `${p.name}: ${sq.name} −${sq.amount}`);
    pay(s, s.turn, sq.amount);
    if (s.phase !== "debt") s.phase = "manage";
    return;
  }
  if (sq.kind === "card") return drawCard(s);
  if (sq.kind === "prop" || sq.kind === "transit" || sq.kind === "util") {
    const o = s.own[i];
    if (o == null) {
      s.phase = "buy";
      return;
    }
    if (o !== s.turn && !s.mort[i] && !s.players[o].out) {
      const rent = rentOf(s, i, s.dice[0] + s.dice[1]) * (s.doubleRent ? 2 : 1);
      s.doubleRent = false;
      log(s, `${p.name} → ${s.players[o].name}: ${sq.name} kirası ${rent}`);
      pay(s, s.turn, rent, o);
      if (s.phase !== "debt") s.phase = "manage";
      return;
    }
  }
  s.doubleRent = false;
  s.phase = "manage";
}

function drawCard(s) {
  const p = cur(s);
  if (s.deckPos >= s.deck.length) {
    s.deck = shuffle([...CARDS.keys()], s.rng);
    s.deckPos = 0;
  }
  const c = CARDS[s.deck[s.deckPos++]];
  s.card = c.t;
  log(s, `Şans: ${c.t}`);
  s.phase = "manage";
  if (c.money) {
    if (c.money > 0) p.cash += c.money;
    else pay(s, s.turn, -c.money);
  } else if (c.each) {
    for (const [k, o] of s.players.entries())
      if (k !== s.turn && !o.out) {
        if (c.each < 0) pay(s, s.turn, -c.each, k);
        else pay(s, k, c.each, s.turn);
        if (s.phase === "debt") break;
      }
  } else if (c.repair) {
    let cost = 0;
    s.houses.forEach((h, k) => s.own[k] === s.turn && (cost += h === 5 ? c.repair[1] : h * c.repair[0]));
    if (cost) pay(s, s.turn, cost);
  } else if (c.jail) goJail(s, s.turn);
  else if (c.free) p.free++;
  else if (c.goto != null) {
    const steps = (c.goto - p.pos + N) % N;
    move(s, steps === 0 ? N : steps);
  } else if (c.back) move(s, -c.back);
  else if (c.transit) {
    let k = p.pos;
    do k = (k + 1) % N;
    while (BOARD[k].kind !== "transit");
    s.doubleRent = true;
    move(s, (k - p.pos + N) % N);
  }
}

function rollDice(s) {
  return [1 + Math.floor(s.rng() * 6), 1 + Math.floor(s.rng() * 6)];
}

function doRoll(s) {
  const p = cur(s);
  const d = rollDice(s);
  s.dice = d;
  s.rolls++;
  s.card = null;
  const dbl = d[0] === d[1];
  if (p.jail) {
    if (dbl) {
      p.jail = 0;
      log(s, `${p.name} çift attı, gözaltından çıktı`);
      s.canRollAgain = false;
      move(s, d[0] + d[1]);
      return;
    }
    p.jail++;
    if (p.jail > 3) {
      log(s, `${p.name} 3. denemede ceza ödedi`);
      p.jail = 0;
      pay(s, s.turn, JAIL_FINE);
      if (s.phase === "debt") return;
      move(s, d[0] + d[1]);
      return;
    }
    log(s, `${p.name} gözaltında kaldı (${p.jail - 1}/3)`);
    s.phase = "manage";
    s.canRollAgain = false;
    return;
  }
  if (dbl) {
    p.doubles++;
    if (p.doubles >= 3) {
      goJail(s, s.turn);
      s.phase = "manage";
      return;
    }
    s.canRollAgain = true;
  } else {
    p.doubles = 0;
    s.canRollAgain = false;
  }
  log(s, `${p.name} ${d[0]}+${d[1]} attı`);
  move(s, d[0] + d[1]);
}

function nextTurn(s) {
  const n = s.players.length;
  let k = s.turn;
  for (let i = 0; i < n; i++) {
    k = (k + 1) % n;
    if (!s.players[k].out) break;
  }
  if (k <= s.turn) s.round++;
  s.turn = k;
  s.players[k].doubles = 0;
  s.phase = "roll";
  s.canRollAgain = false;
  s.turnLeft = s.turnTime;
  s.botT = 1.1;
  if (s.maxRounds && s.round > s.maxRounds) endByWorth(s);
}

export function netWorth(s, k) {
  let w = s.players[k].cash;
  BOARD.forEach((sq, i) => {
    if (s.own[i] !== k) return;
    w += s.mort[i] ? sq.price / 2 : sq.price;
    if (sq.kind === "prop") w += (s.houses[i] * GROUPS[sq.g].house) / 2;
  });
  return w;
}

function endByWorth(s) {
  let best = -1;
  let bw = -Infinity;
  s.players.forEach((p, k) => {
    if (p.out) return;
    const w = netWorth(s, k);
    if (w > bw) (bw = w), (best = k);
  });
  s.phase = "over";
  s.winner = best;
  s.reason = "rounds";
  log(s, `Tur sınırı: ${s.players[best].name} en zengin (${bw})`);
}

function checkWinner(s) {
  const a = alive(s);
  if (a.length === 1) {
    s.phase = "over";
    s.winner = s.players.indexOf(a[0]);
    s.reason = "last";
    log(s, `${a[0].name} kazandı!`);
  }
}

/** İflas: varlıklar alacaklıya (oyuncuysa) ya da bankaya döner */
function bankrupt(s, who) {
  const p = s.players[who];
  const to = s.debt?.to ?? -1;
  BOARD.forEach((_, i) => {
    if (s.own[i] !== who) return;
    if (s.houses[i]) {
      if (s.houses[i] === 5) s.bank.hotels++;
      else s.bank.houses += s.houses[i];
      s.houses[i] = 0;
    }
    if (to >= 0) s.own[i] = to;
    else {
      s.own[i] = null;
      s.mort[i] = false;
    }
  });
  if (to >= 0) {
    s.players[to].cash += Math.max(0, p.cash);
    s.players[to].free += p.free;
  }
  p.cash = 0;
  p.free = 0;
  p.out = true;
  s.debt = null;
  log(s, `${p.name} iflas etti`);
  checkWinner(s);
  if (s.phase !== "over") {
    if (s.turn === who) nextTurn(s);
    else s.phase = "manage";
  }
}

// ───────── Ev / ipotek ─────────
export function canBuild(s, who, i) {
  const sq = BOARD[i];
  if (sq.kind !== "prop" || s.own[i] !== who || s.houses[i] >= 5) return false;
  if (!ownsGroup(s, sq.g, who)) return false;
  const gs = groupSquares(sq.g);
  if (gs.some((k) => s.mort[k])) return false;
  const min = Math.min(...gs.map((k) => s.houses[k]));
  if (s.houses[i] > min) return false; // eşit kurma
  if (s.houses[i] === 4 ? s.bank.hotels <= 0 : s.bank.houses <= 0) return false;
  return s.players[who].cash >= GROUPS[sq.g].house;
}

export function canSell(s, who, i) {
  const sq = BOARD[i];
  if (sq.kind !== "prop" || s.own[i] !== who || s.houses[i] <= 0) return false;
  const gs = groupSquares(sq.g);
  const max = Math.max(...gs.map((k) => s.houses[k]));
  if (s.houses[i] < max) return false; // eşit satma
  if (s.houses[i] === 5 && s.bank.houses < 4) return false; // oteli ev olarak geri vermek için stok gerek
  return true;
}

export function canMortgage(s, who, i) {
  const sq = BOARD[i];
  if (s.own[i] !== who || s.mort[i]) return false;
  if (sq.kind === "prop" && groupSquares(sq.g).some((k) => s.houses[k] > 0)) return false;
  return true;
}

// ───────── Girdi ─────────
export function input(s, pid, m) {
  if (!m || typeof m !== "object" || s.phase === "over") return false;
  const who = s.players.findIndex((p) => p.id === pid);
  if (who < 0 || s.players[who].out || s.players[who].bot) return false;
  return act(s, who, m);
}

function sqIndex(v) {
  const i = Math.round(fin(v, -1));
  return i >= 0 && i < N ? i : -1;
}

function act(s, who, m) {
  const me = s.players[who];
  const myTurn = who === s.turn;
  switch (m.t) {
    case "roll":
      if (!myTurn || !(s.phase === "roll" || (s.phase === "manage" && s.canRollAgain))) return false;
      doRoll(s);
      return true;
    case "payFine":
      if (!myTurn || !me.jail || s.phase !== "roll" || me.cash < JAIL_FINE) return false;
      me.cash -= JAIL_FINE;
      me.jail = 0;
      log(s, `${me.name} ceza ödeyip çıktı`);
      return true;
    case "useCard":
      if (!myTurn || !me.jail || s.phase !== "roll" || me.free <= 0) return false;
      me.free--;
      me.jail = 0;
      log(s, `${me.name} kartla gözaltından çıktı`);
      return true;
    case "buy": {
      if (!myTurn || s.phase !== "buy") return false;
      const i = me.pos;
      const price = BOARD[i].price;
      if (me.cash < price) return false;
      me.cash -= price;
      s.own[i] = who;
      log(s, `${me.name} ${BOARD[i].name} aldı (${price})`);
      s.phase = "manage";
      return true;
    }
    case "decline":
      if (!myTurn || s.phase !== "buy") return false;
      if (s.auctionsOn) startAuction(s, me.pos);
      else s.phase = "manage";
      return true;
    case "bid": {
      const a = s.auction;
      if (s.phase !== "auction" || !a || a.passed.includes(who)) return false;
      const amt = Math.round(fin(m.amount));
      if (amt <= a.bid || amt > me.cash || amt - a.bid > 2000) return false;
      a.bid = amt;
      a.by = who;
      a.endsIn = 6;
      return true;
    }
    case "pass": {
      const a = s.auction;
      if (s.phase !== "auction" || !a || a.passed.includes(who)) return false;
      a.passed.push(who);
      maybeCloseAuction(s);
      return true;
    }
    case "build": {
      const i = sqIndex(m.sq);
      if (i < 0 || !canBuild(s, who, i) || !(s.phase === "manage" || s.phase === "roll") || !myTurn) return false;
      const g = GROUPS[BOARD[i].g];
      me.cash -= g.house;
      if (s.houses[i] === 4) {
        s.bank.hotels--;
        s.bank.houses += 4;
      } else s.bank.houses--;
      s.houses[i]++;
      log(s, `${me.name} ${BOARD[i].name}: ${s.houses[i] === 5 ? "otel" : s.houses[i] + ". ev"}`);
      return true;
    }
    case "sell": {
      const i = sqIndex(m.sq);
      if (i < 0 || !canSell(s, who, i)) return false;
      const g = GROUPS[BOARD[i].g];
      if (s.houses[i] === 5) {
        s.bank.hotels++;
        s.bank.houses -= 4;
      } else s.bank.houses++;
      s.houses[i]--;
      me.cash += g.house / 2;
      afterRaise(s, who);
      return true;
    }
    case "mortgage": {
      const i = sqIndex(m.sq);
      if (i < 0 || !canMortgage(s, who, i)) return false;
      s.mort[i] = true;
      me.cash += BOARD[i].price / 2;
      log(s, `${me.name} ${BOARD[i].name} ipotek etti`);
      afterRaise(s, who);
      return true;
    }
    case "unmortgage": {
      const i = sqIndex(m.sq);
      const cost = Math.ceil((BOARD[i]?.price / 2) * 1.1);
      if (i < 0 || s.own[i] !== who || !s.mort[i] || me.cash < cost || s.phase === "debt") return false;
      me.cash -= cost;
      s.mort[i] = false;
      return true;
    }
    case "bankrupt":
      if (s.phase !== "debt" || s.debt?.who !== who) return false;
      bankrupt(s, who);
      return true;
    case "end":
      if (!myTurn || s.phase !== "manage" || s.canRollAgain) return false;
      nextTurn(s);
      return true;
    case "offer": {
      // takas teklifi: { to, give:{cash, props[]}, get:{cash, props[]} }
      if (s.trade || s.phase === "auction" || s.phase === "debt") return false;
      const to = Math.round(fin(m.to, -1));
      if (to < 0 || to >= s.players.length || to === who || s.players[to].out) return false;
      const clean = (x, owner) => ({
        cash: clamp(Math.round(fin(x?.cash)), 0, s.players[owner].cash),
        props: (Array.isArray(x?.props) ? x.props : []).map(sqIndex).filter((i, k, arr) => i >= 0 && s.own[i] === owner && arr.indexOf(i) === k && !(BOARD[i].kind === "prop" && groupSquares(BOARD[i].g).some((q) => s.houses[q] > 0))).slice(0, 12),
      });
      const give = clean(m.give, who);
      const get = clean(m.get, to);
      if (!give.cash && !give.props.length && !get.cash && !get.props.length) return false;
      s.trade = { id: (s.tradeId = (s.tradeId || 0) + 1), from: who, to, give, get, ttl: 30 };
      log(s, `${me.name} → ${s.players[to].name}: takas teklifi`);
      return true;
    }
    case "accept":
    case "reject": {
      const t = s.trade;
      if (!t || t.to !== who) return false;
      if (m.t === "accept") return applyTrade(s);
      log(s, `${me.name} takası reddetti`);
      s.trade = null;
      return true;
    }
    case "cancel":
      if (!s.trade || s.trade.from !== who) return false;
      s.trade = null;
      return true;
    default:
      return false;
  }
}

function applyTrade(s) {
  const t = s.trade;
  const A = s.players[t.from];
  const B = s.players[t.to];
  // teklif yapıldıktan sonra durum değişmiş olabilir: yeniden doğrula
  const ok = (x, owner) => x.props.every((i) => s.own[i] === owner) && s.players[owner].cash >= x.cash;
  if (!ok(t.give, t.from) || !ok(t.get, t.to)) {
    s.trade = null;
    return false;
  }
  A.cash += t.get.cash - t.give.cash;
  B.cash += t.give.cash - t.get.cash;
  t.give.props.forEach((i) => (s.own[i] = t.to));
  t.get.props.forEach((i) => (s.own[i] = t.from));
  log(s, `Takas tamam: ${A.name} ⇄ ${B.name}`);
  s.trade = null;
  return true;
}

function afterRaise(s, who) {
  if (s.phase === "debt" && s.debt?.who === who && s.players[who].cash >= 0) {
    s.debt = null;
    s.phase = who === s.turn ? "manage" : s.prevPhase || "manage";
    log(s, `${s.players[who].name} borcunu kapattı`);
  }
}

function startAuction(s, sq) {
  s.auction = { sq, bid: 0, by: -1, endsIn: 10, passed: [] };
  s.phase = "auction";
  log(s, `${BOARD[sq].name} ihalede`);
}

function maybeCloseAuction(s) {
  const a = s.auction;
  const active = s.players.map((p, k) => k).filter((k) => !s.players[k].out && !a.passed.includes(k));
  if (active.length === 0 || (active.length === 1 && a.by === active[0]) || a.endsIn <= 0) closeAuction(s);
}

function closeAuction(s) {
  const a = s.auction;
  if (a.by >= 0) {
    s.players[a.by].cash -= a.bid;
    s.own[a.sq] = a.by;
    log(s, `${s.players[a.by].name} ihaleyi ${a.bid} ile kazandı`);
  } else log(s, "İhalede teklif çıkmadı");
  s.auction = null;
  s.phase = "manage";
}

// ───────── Bot ─────────
function botAct(s, who) {
  const me = s.players[who];
  const reserve = 150;
  if (s.phase === "debt" && s.debt?.who === who) {
    // ev sat → ipotek → iflas
    for (const i of BOARD.keys()) if (canSell(s, who, i)) return act(s, who, { t: "sell", sq: i });
    for (const i of BOARD.keys()) if (canMortgage(s, who, i)) return act(s, who, { t: "mortgage", sq: i });
    return act(s, who, { t: "bankrupt" });
  }
  if (s.trade && s.trade.to === who) {
    const t = s.trade;
    const val = (x) => x.cash + x.props.reduce((a, i) => a + BOARD[i].price * (BOARD[i].kind === "prop" && completes(s, i, who) ? 2.2 : 1), 0);
    return act(s, who, { t: val(t.give) >= val(t.get) * 1.15 ? "accept" : "reject" });
  }
  if (who !== s.turn) return false;
  if (s.phase === "roll") {
    if (me.jail && me.free) return act(s, who, { t: "useCard" });
    if (me.jail && me.cash > 400 && s.round < 12) return act(s, who, { t: "payFine" });
    return act(s, who, { t: "roll" });
  }
  if (s.phase === "buy") {
    const price = BOARD[me.pos].price;
    return act(s, who, { t: me.cash - price >= reserve * (s.level || 1) ? "buy" : "decline" });
  }
  if (s.phase === "manage") {
    // ipotek kaldır, sonra eşit ev kur
    for (const i of BOARD.keys()) if (s.own[i] === who && s.mort[i] && me.cash > Math.ceil((BOARD[i].price / 2) * 1.1) + reserve * 2) return act(s, who, { t: "unmortgage", sq: i });
    for (const i of BOARD.keys()) if (canBuild(s, who, i) && me.cash - GROUPS[BOARD[i].g].house >= reserve) return act(s, who, { t: "build", sq: i });
    // takas: grubumu tamamlayacak tek arsayı nakitle (ve gerekirse karşı tarafın işine yarayan arsayla) iste
    if (!s.trade && (s.lastBotTrade?.[who] ?? -9) < s.round - 2) {
      for (const i of BOARD.keys()) {
        const o = s.own[i];
        if (BOARD[i].kind !== "prop" || o == null || o === who || !completes(s, i, who) || s.houses[i] > 0) continue;
        const price = BOARD[i].price;
        const cash = Math.min(me.cash - reserve, Math.round(price * 1.6));
        // karşı tarafın grubunu tamamlayan bir arsam varsa onu da ver
        const sweet = [...BOARD.keys()].find((k) => s.own[k] === who && BOARD[k].kind === "prop" && completes(s, k, o) && s.houses[k] === 0);
        if (cash < price * 1.2 && sweet == null) continue;
        s.lastBotTrade = { ...(s.lastBotTrade || {}), [who]: s.round };
        return act(s, who, { t: "offer", to: o, give: { cash: Math.max(0, cash), props: sweet != null ? [sweet] : [] }, get: { cash: 0, props: [i] } });
      }
    }
    if (s.canRollAgain) return act(s, who, { t: "roll" });
    return act(s, who, { t: "end" });
  }
  return false;
}

function completes(s, i, who) {
  const g = BOARD[i].g;
  return groupSquares(g).every((k) => k === i || s.own[k] === who);
}

function botsInAuction(s, dt) {
  const a = s.auction;
  for (const [k, p] of s.players.entries()) {
    if (!p.bot || p.out || a.passed.includes(k) || a.by === k) continue;
    const sq = BOARD[a.sq];
    const want = sq.price * (sq.kind === "prop" && completes(s, a.sq, k) ? 1.6 : 0.9);
    const next = a.bid + (a.bid < 100 ? 10 : 25);
    if (next <= want && next <= p.cash - 100) {
      a.bid = next;
      a.by = k;
      a.endsIn = 6;
      return;
    }
    a.passed.push(k);
  }
}

export function tick(s, dt) {
  if (s.phase === "over") return;
  if (s.phase === "auction") {
    s.auction.endsIn -= dt;
    s.botT -= dt;
    if (s.botT <= 0) {
      s.botT = 0.9;
      botsInAuction(s, dt);
      maybeCloseAuction(s);
    }
    if (s.auction && s.auction.endsIn <= 0) closeAuction(s);
    return;
  }
  if (s.trade) {
    s.trade.ttl -= dt;
    if (s.trade.ttl <= 0) s.trade = null;
  }
  // botlar: sıradaki bot ya da borçlu/teklif alan bot
  const actor = s.phase === "debt" ? s.debt.who : s.trade && s.players[s.trade.to].bot ? s.trade.to : s.turn;
  if (s.players[actor]?.bot) {
    s.botT -= dt;
    if (s.botT <= 0) {
      s.botT = 0.8;
      botAct(s, actor);
    }
    return;
  }
  if (s.turnTime && s.players[s.turn] && !s.players[s.turn].bot) {
    s.turnLeft -= dt;
    if (s.turnLeft <= 0) {
      // süre doldu: oyuncu adına güvenli hamle (bot mantığı)
      s.turnLeft = s.turnTime;
      const was = s.players[s.turn].bot;
      s.players[s.turn].bot = true;
      botAct(s, s.turn);
      s.players[s.turn].bot = was;
    }
  }
}

export function playerLeft(s, pid) {
  const k = s.players.findIndex((p) => p.id === pid);
  if (k < 0 || s.players[k].out) return;
  s.players[k].bot = true; // ayrılanın yerine bot oynar
  s.players[k].name += " (bot)";
}

export const isOver = (s) => s.phase === "over";

export function view(s, pid) {
  return {
    t: "emlak",
    me: s.players.findIndex((p) => p.id === pid),
    players: s.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color, cash: p.cash, pos: p.pos, jail: p.jail, free: p.free, out: p.out })),
    own: s.own,
    houses: s.houses,
    mort: s.mort,
    bank: s.bank,
    turn: s.turn,
    round: s.round,
    maxRounds: s.maxRounds,
    phase: s.phase,
    dice: s.dice,
    rolls: s.rolls,
    canRollAgain: s.canRollAgain,
    auction: s.auction && { sq: s.auction.sq, bid: s.auction.bid, by: s.auction.by, endsIn: Math.ceil(s.auction.endsIn), passed: s.auction.passed },
    trade: s.trade,
    debt: s.debt,
    card: s.card,
    log: s.log.slice(-12),
    winner: s.winner,
    reason: s.reason,
    turnTime: s.turnTime,
    turnLeft: Math.ceil(Math.max(0, s.turnLeft)),
    worth: s.players.map((_, k) => netWorth(s, k)),
  };
}
