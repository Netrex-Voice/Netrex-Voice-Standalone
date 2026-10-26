import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../engines/emlak.js";
import { makeRng } from "../engines/util.js";

const mk = (n = 2, cfg = {}) => E.create({ players: Array.from({ length: n }, (_, i) => ({ id: "p" + i, name: "P" + i })), config: cfg, rng: makeRng(7) });
const fixedDice = (s, a, b) => { const r = [(a - 1) / 6 + 0.01, (b - 1) / 6 + 0.01]; let k = 0; s.rng = () => r[k++ % 2]; };

test("emlak: tahta 32 kare, 18 arsa, gruplar tutarlı", () => {
  assert.equal(E.N, 32);
  assert.equal(E.BOARD.filter((b) => b.kind === "prop").length, 18);
  for (let g = 0; g < 7; g++) assert.ok(E.groupSquares(g).length >= 2);
  assert.equal(E.BOARD[E.JAIL].kind, "jail");
  assert.equal(E.BOARD[E.POLICE].kind, "police");
});

test("emlak: sıra dışı hamle yok; başlangıçtan geçiş +200; satın alma", () => {
  const s = mk();
  assert.equal(E.input(s, "p1", { t: "roll" }), false);
  s.players[0].pos = 30;
  fixedDice(s, 1, 2); // 30 → 1 (Balat), başlangıçtan geçer
  assert.equal(E.input(s, "p0", { t: "roll" }), true);
  assert.equal(s.players[0].pos, 1);
  assert.equal(s.players[0].cash, 1500 + 200);
  assert.equal(s.phase, "buy");
  assert.equal(E.input(s, "p0", { t: "buy" }), true);
  assert.equal(s.own[1], 0);
  assert.equal(s.players[0].cash, 1700 - 60);
});

test("emlak: kira — grup tamamsa iki kat, ev ile çarpan, ipotekte kira yok", () => {
  const s = mk();
  s.own[1] = 1;
  const base = E.baseRent(E.BOARD[1]);
  assert.equal(E.rentOf(s, 1, 7), base);
  s.own[3] = 1;
  assert.equal(E.rentOf(s, 1, 7), base * 2);
  s.houses[1] = 2;
  assert.equal(E.rentOf(s, 1, 7), base * 15);
  s.houses[1] = 0;
  s.mort[1] = true;
  assert.equal(E.rentOf(s, 1, 7), 0);
});

test("emlak: eşit ev kurma, stok, ipotekte ev yok", () => {
  const s = mk();
  s.own[1] = s.own[3] = 0;
  s.phase = "manage";
  assert.equal(E.input(s, "p0", { t: "build", sq: 1 }), true);
  assert.equal(E.input(s, "p0", { t: "build", sq: 1 }), false, "eşit kurma: önce Fener");
  assert.equal(E.input(s, "p0", { t: "build", sq: 3 }), true);
  assert.equal(s.bank.houses, E.HOUSES - 2);
  assert.equal(E.input(s, "p0", { t: "mortgage", sq: 1 }), false, "grupta ev varken ipotek yok");
  assert.equal(E.input(s, "p0", { t: "sell", sq: 1 }), true);
  assert.equal(E.input(s, "p0", { t: "sell", sq: 1 }), false, "eşit satma");
});

test("emlak: 3 çift → gözaltı; gözaltında çift atınca çıkar; ceza ödeme", () => {
  const s = mk();
  fixedDice(s, 3, 3);
  E.input(s, "p0", { t: "roll" });
  if (s.phase === "buy") E.input(s, "p0", { t: "decline" });
  while (s.phase === "auction") E.tick(s, 1);
  E.input(s, "p0", { t: "roll" });
  if (s.phase === "buy") E.input(s, "p0", { t: "decline" });
  while (s.phase === "auction") E.tick(s, 1);
  E.input(s, "p0", { t: "roll" });
  assert.equal(s.players[0].pos, E.JAIL);
  assert.ok(s.players[0].jail > 0);
  E.input(s, "p0", { t: "end" });
  E.input(s, "p1", { t: "roll" }); // p1
  if (s.phase === "buy") E.input(s, "p1", { t: "decline" });
  while (s.phase === "auction") E.tick(s, 1);
  while (s.canRollAgain) { E.input(s, "p1", { t: "roll" }); if (s.phase === "buy") E.input(s, "p1", { t: "decline" }); while (s.phase === "auction") E.tick(s, 1); }
  E.input(s, "p1", { t: "end" });
  assert.equal(s.turn, 0);
  assert.equal(E.input(s, "p0", { t: "payFine" }), true);
  assert.equal(s.players[0].jail, 0);
});

test("emlak: ihale — artan teklif, pas, kazanan öder", () => {
  const s = mk(3);
  fixedDice(s, 1, 2);
  E.input(s, "p0", { t: "roll" }); // 3 = Fener
  assert.equal(s.phase, "buy");
  E.input(s, "p0", { t: "decline" });
  assert.equal(s.phase, "auction");
  assert.equal(E.input(s, "p1", { t: "bid", amount: 50 }), true);
  assert.equal(E.input(s, "p2", { t: "bid", amount: 40 }), false, "düşük teklif");
  assert.equal(E.input(s, "p2", { t: "bid", amount: 99999 }), false, "nakitten fazla");
  E.input(s, "p0", { t: "pass" });
  E.input(s, "p2", { t: "pass" });
  assert.equal(s.own[3], 1);
  assert.equal(s.players[1].cash, 1450);
});

test("emlak: takas — geçersiz teklifler reddedilir, kabul el değiştirir", () => {
  const s = mk();
  s.own[1] = 0;
  s.own[3] = 1;
  s.houses[3] = 0;
  assert.equal(E.input(s, "p0", { t: "offer", to: 1, give: { props: [3] }, get: {} }), false, "başkasının arsasını veremez");
  assert.equal(E.input(s, "p0", { t: "offer", to: 1, give: { cash: 100, props: [1] }, get: { props: [3] } }), true);
  assert.equal(E.input(s, "p0", { t: "accept" }), false, "teklif sahibi kabul edemez");
  assert.equal(E.input(s, "p1", { t: "accept" }), true);
  assert.equal(s.own[1], 1);
  assert.equal(s.own[3], 0);
  assert.equal(s.players[0].cash, 1400);
  assert.equal(s.players[1].cash, 1600);
});

test("emlak: borç → varlık satışı ya da iflas; varlıklar alacaklıya", () => {
  const s = mk();
  s.own[31] = 1;
  s.houses[31] = 0;
  s.own[30] = 1;
  s.houses[31] = 5;
  s.bank.hotels--;
  s.players[0].cash = 100;
  s.own[1] = 0;
  s.players[0].pos = 29;
  fixedDice(s, 1, 1); // 29 → 31 Tarabya (otel)
  E.input(s, "p0", { t: "roll" });
  assert.equal(s.phase, "debt");
  assert.equal(E.input(s, "p0", { t: "end" }), false, "borçluyken tur bitmez");
  E.input(s, "p0", { t: "mortgage", sq: 1 });
  assert.equal(s.phase, "debt", "ipotek yetmedi");
  assert.equal(E.input(s, "p0", { t: "bankrupt" }), true);
  assert.equal(s.phase, "over");
  assert.equal(s.winner, 1);
  assert.equal(s.own[1], 1, "varlık alacaklıya");
});

test("emlak: 2–6 botlu oyunlar biter; tur sınırında en zengin kazanır; stok korunur", () => {
  for (const [n, rounds] of [[2, 60], [4, 60], [6, 60], [3, 15]]) {
    const s = E.create({ players: Array.from({ length: n }, (_, i) => ({ id: "b" + i, bot: true })), config: { rounds }, rng: makeRng(n * 3 + rounds) });
    let t = 0;
    while (!E.isOver(s) && t < 30000) {
      E.tick(s, 0.5);
      t += 0.5;
      const used = s.houses.reduce((a, h) => a + (h === 5 ? 0 : h), 0);
      assert.equal(used + s.bank.houses, E.HOUSES);
    }
    assert.ok(E.isOver(s), `${n} bot bitmedi`);
  }
});

test("emlak: görünüm desteyi sızdırmaz", () => {
  const s = mk();
  const v = JSON.stringify(E.view(s, "p0"));
  assert.ok(!v.includes('"deck"'));
});
