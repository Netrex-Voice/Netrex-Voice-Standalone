"use client";

import { useEffect, useRef, useState } from "react";
import { Dices, Home, Hammer, Landmark, Handshake, Gavel, LogOut as Exit, X } from "lucide-react";
import { BOARD, GROUPS, baseRent, groupSquares, canBuild, canSell, canMortgage, JAIL_FINE } from "../engines/emlak";
import { Btn, EndCard } from "../ui";
import { useGamesPrefs } from "../store";
import { EmlakScene } from "../three/emlakScene";
import { sfx } from "../three/sound";

const money = (n) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
const RENT_MUL = [1, 5, 15, 40, 55, 70];

function PropCard({ i, v, me, send, onClose }) {
  const sq = BOARD[i];
  const owner = v.own[i];
  const g = sq.kind === "prop" ? GROUPS[sq.g] : null;
  const mine = owner === me && me >= 0;
  const state = { own: v.own, houses: v.houses, mort: v.mort, bank: v.bank, players: v.players };
  return (
    <div className="absolute right-3 top-28 w-64 rounded-xl bg-[#25272a] border border-white/10 shadow-2xl overflow-hidden z-20">
      {g && <div className="h-9 flex items-center px-3 text-white font-bold text-sm" style={{ background: g.color }}>{sq.name}</div>}
      {!g && <div className="h-9 flex items-center px-3 text-white font-bold text-sm bg-[#1e1f22]">{sq.name}</div>}
      <button type="button" onClick={onClose} className="absolute right-2 top-2 p-1 rounded text-white/80 hover:bg-black/20" aria-label="Kapat"><X size={14} /></button>
      <div className="p-3 text-xs text-[#dbdee1] space-y-1">
        {sq.price ? <div className="flex justify-between"><span>Fiyat</span><span>{money(sq.price)}</span></div> : <div className="text-[#949ba4]">Satılık değil</div>}
        {sq.kind === "prop" && (
          <>
            {["Kira", "1 ev", "2 ev", "3 ev", "4 ev", "Otel"].map((l, k) => (
              <div key={l} className={`flex justify-between ${v.houses[i] === k && owner != null ? "text-white font-semibold" : "text-[#949ba4]"}`}><span>{l}{k === 0 ? " (grup tamamsa ×2)" : ""}</span><span>{money(baseRent(sq) * RENT_MUL[k])}</span></div>
            ))}
            <div className="flex justify-between text-[#949ba4]"><span>Ev/otel maliyeti</span><span>{money(g.house)}</span></div>
          </>
        )}
        {sq.kind === "transit" && <div className="text-[#949ba4]">Kira: 1 hat 25 · 2 hat 50 · 3 hat 100 · 4 hat 200</div>}
        {sq.kind === "util" && <div className="text-[#949ba4]">Kira: zar × 4 (ikisi birden sendeyse × 10)</div>}
        {owner != null && <div className="pt-1">Sahibi: <b style={{ color: v.players[owner].color }}>{v.players[owner].name}</b>{v.mort[i] ? " · ipotekli" : ""}</div>}
      </div>
      {mine && (
        <div className="p-3 pt-0 grid grid-cols-2 gap-1.5">
          {sq.kind === "prop" && <Btn className="!py-1.5 !px-2 text-xs" disabled={!canBuild(state, me, i) || v.turn !== me} onClick={() => send({ t: "build", sq: i })}><Hammer size={12} className="inline -mt-0.5 mr-1" />{v.houses[i] === 4 ? "Otel" : "Ev kur"}</Btn>}
          {sq.kind === "prop" && <Btn tone="ghost" className="!py-1.5 !px-2 text-xs" disabled={!canSell(state, me, i)} onClick={() => send({ t: "sell", sq: i })}>Ev sat</Btn>}
          {!v.mort[i] ? (
            <Btn tone="ghost" className="!py-1.5 !px-2 text-xs col-span-2" disabled={!canMortgage(state, me, i)} onClick={() => send({ t: "mortgage", sq: i })}><Landmark size={12} className="inline -mt-0.5 mr-1" />İpotek et (+{money(sq.price / 2)})</Btn>
          ) : (
            <Btn tone="ghost" className="!py-1.5 !px-2 text-xs col-span-2" onClick={() => send({ t: "unmortgage", sq: i })}>İpoteği kaldır ({money(Math.ceil((sq.price / 2) * 1.1))})</Btn>
          )}
        </div>
      )}
    </div>
  );
}

function TradeDialog({ v, me, to, send, onClose }) {
  const [give, setGive] = useState({ cash: 0, props: [] });
  const [get, setGet] = useState({ cash: 0, props: [] });
  const tradable = (who) => BOARD.map((_, i) => i).filter((i) => v.own[i] === who && !(BOARD[i].kind === "prop" && groupSquares(BOARD[i].g).some((q) => v.houses[q] > 0)));
  const toggle = (set, st, i) => set({ ...st, props: st.props.includes(i) ? st.props.filter((x) => x !== i) : [...st.props, i] });
  const col = (who, st, set, title) => (
    <div className="flex-1 min-w-0">
      <div className="text-xs font-bold text-[#949ba4] mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
        {tradable(who).map((i) => (
          <button key={i} type="button" onClick={() => toggle(set, st, i)} className={`px-2 py-1 rounded text-[11px] font-semibold border ${st.props.includes(i) ? "bg-[#6366f1] border-[#6366f1] text-white" : "border-white/10 text-[#dbdee1] hover:bg-white/5"}`}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: BOARD[i].kind === "prop" ? GROUPS[BOARD[i].g].color : "#9ca3af" }} />{BOARD[i].name}
          </button>
        ))}
        {!tradable(who).length && <span className="text-[11px] text-[#6b7280]">Takaslık arsa yok</span>}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-[#dbdee1]">Nakit <input type="number" min={0} max={v.players[who].cash} step={10} value={st.cash} onChange={(e) => set({ ...st, cash: Math.max(0, Math.min(v.players[who].cash, Number(e.target.value) || 0)) })} className="w-24 bg-[#1e1f22] border border-white/10 rounded px-2 py-1 text-white" /></label>
    </div>
  );
  return (
    <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-label="Takas teklifi">
      <div className="w-full max-w-xl rounded-xl bg-[#25272a] border border-white/10 p-4">
        <div className="flex items-center mb-3"><Handshake size={16} className="text-[#6366f1] mr-2" /><span className="font-bold text-white">{v.players[to].name} ile takas</span><button type="button" onClick={onClose} className="ml-auto p-1 text-[#949ba4]" aria-label="Kapat"><X size={15} /></button></div>
        <div className="flex gap-4">{col(me, give, setGive, "Verdiklerin")}{col(to, get, setGet, "İstediklerin")}</div>
        <div className="mt-4 flex justify-end gap-2"><Btn tone="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={() => (send({ t: "offer", to, give, get }), onClose())}>Teklif gönder</Btn></div>
      </div>
    </div>
  );
}

export default function EmlakView({ view: v, session, myId, send, isHost, onRematch, onLobby, onLeave }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const gfx = useGamesPrefs((s) => s.gfx);
  const showFps = useGamesPrefs((s) => s.showFps);
  const me = v.me;
  const myTurn = me >= 0 && v.turn === me;
  const [sel, setSel] = useState(-1);
  const [tradeTo, setTradeTo] = useState(-1);
  const [hud, setHud] = useState(null);
  const [failed, setFailed] = useState(false);
  const lastRolls = useRef(v.rolls);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    let scene;
    try {
      scene = new EmlakScene(cv, { gfx });
    } catch (e) {
      console.error("[emlak] WebGL başlatılamadı", e);
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(cv);
    const onClick = (e) => {
      const i = scene.pickSquare(e.clientX, e.clientY);
      setSel(i);
    };
    cv.addEventListener("click", onClick);
    let raf;
    let last = performance.now();
    let hudT = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const ms = t - last;
      last = t;
      scene.update(Math.min(0.05, ms / 1000), ms);
      hudT += ms;
      if (hudT > 500) (hudT = 0), setHud(scene.stats);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("click", onClick);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [gfx]);

  // durum → sahne (tahta, piyonlar); yeni zar atışı → fizikli zar
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    sc.setBoard(v.own, v.houses, v.mort, v.players);
    if (v.rolls !== lastRolls.current) {
      lastRolls.current = v.rolls;
      setRolling(true);
      sc.roll(v.dice, v.rolls * 2654435761, (k) => sfx("dice", k, 0)).then(() => setTimeout(() => (sc.setPlayers(v.players), setRolling(false)), 1300));
    } else if (!rolling) sc.setPlayers(v.players);
  }, [v]); // eslint-disable-line

  const p = me >= 0 ? v.players[me] : null;
  const sq = p ? BOARD[p.pos] : null;
  const a = v.auction;
  const t = v.trade;
  const nextBid = (k) => (a ? a.bid + k : 0);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label="Emlak tahtası. Bir kareye tıklayarak bilgisini gör." />
      {failed && <div className="absolute inset-0 flex items-center justify-center text-sm text-[#b5bac1]">Bu cihazda 3B grafik (WebGL) başlatılamadı.</div>}

      {/* Oyuncular */}
      <div className="absolute left-3 top-3 w-56 flex flex-col gap-1.5">
        {v.players.map((pl, k) => (
          <div key={pl.id} className={`rounded-lg px-3 py-2 bg-black/55 text-white ${v.turn === k && v.phase !== "over" ? "ring-2 ring-[#6366f1]" : ""} ${pl.out ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: pl.color }} />
              <span className="text-sm font-semibold truncate">{pl.name}{k === me ? " (sen)" : ""}</span>
              {me >= 0 && k !== me && !pl.out && !v.trade && <button type="button" onClick={() => setTradeTo(k)} className="ml-auto p-1 rounded text-[#b5bac1] hover:bg-white/10" title="Takas teklif et" aria-label={`${pl.name} ile takas`}><Handshake size={13} /></button>}
            </div>
            <div className="text-xs text-[#dbdee1] tabular-nums">{money(pl.cash)} <span className="text-[#949ba4]">· değer {money(v.worth[k])}</span></div>
            {(pl.jail > 0 || pl.free > 0) && <div className="text-[11px] text-[#faa61a]">{pl.jail > 0 ? "Gözaltında" : ""}{pl.free > 0 ? ` · ${pl.free} çıkış kartı` : ""}</div>}
          </div>
        ))}
        <div className="text-[11px] text-white/60 px-1">Tur {v.round}/{v.maxRounds} · banka: {v.bank.houses} ev, {v.bank.hotels} otel</div>
      </div>

      {/* Günlük */}
      <div className="absolute right-3 bottom-20 w-64 max-h-48 overflow-y-auto rounded-lg bg-black/45 p-2 text-[11px] text-[#dbdee1] space-y-0.5" aria-live="polite">
        {v.log.slice().reverse().map((l, k) => <div key={k} className={k === 0 ? "text-white" : "text-[#b5bac1]"}>{l}</div>)}
      </div>
      {showFps && hud && <div className="absolute top-3 right-3 text-[11px] tabular-nums text-[#b5bac1] bg-black/45 rounded px-2 py-1">{hud.fps} fps · {hud.tier} · {hud.calls} çizim</div>}

      {sel >= 0 && <PropCard i={sel} v={v} me={me} send={send} onClose={() => setSel(-1)} />}

      {/* Şans kartı */}
      {v.card && !rolling && (
        <div className="absolute left-1/2 top-24 -translate-x-1/2 w-72 rounded-xl bg-[#fff7e6] text-[#3b2a12] p-4 shadow-2xl border-4 border-[#f59e0b] text-center animate-[gmPop_.25s_ease-out] pointer-events-none">
          <div className="text-[11px] font-black tracking-widest text-[#b45309]">ŞANS</div>
          <div className="mt-1 text-sm font-semibold">{v.card}</div>
        </div>
      )}

      {/* İhale */}
      {a && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-80 rounded-xl bg-[#25272a] border border-white/10 p-4 shadow-2xl z-20">
          <div className="flex items-center gap-2 text-white font-bold"><Gavel size={15} className="text-[#faa61a]" />İhale: {BOARD[a.sq].name}</div>
          <div className="mt-2 text-sm text-[#dbdee1]">En yüksek: <b className="text-white">{money(a.bid)}</b>{a.by >= 0 ? ` (${v.players[a.by].name})` : ""} · {a.endsIn} sn</div>
          {me >= 0 && !v.players[me].out && !a.passed.includes(me) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[10, 50, 100].map((k) => <Btn key={k} className="!py-1.5 !px-3 text-xs" disabled={nextBid(k) > v.players[me].cash || a.by === me} onClick={() => send({ t: "bid", amount: nextBid(k) })}>+{k}</Btn>)}
              <Btn tone="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => send({ t: "pass" })}>Çekil</Btn>
            </div>
          ) : <div className="mt-2 text-xs text-[#949ba4]">İhaleden çekildin.</div>}
        </div>
      )}

      {/* Gelen takas */}
      {t && t.to === me && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-96 rounded-xl bg-[#25272a] border border-white/10 p-4 shadow-2xl z-20">
          <div className="font-bold text-white mb-2"><Handshake size={14} className="inline -mt-0.5 mr-1.5 text-[#6366f1]" />{v.players[t.from].name} takas teklif ediyor</div>
          <div className="grid grid-cols-2 gap-3 text-xs text-[#dbdee1]">
            <div><div className="text-[#949ba4] mb-1">Sana verir</div>{t.give.props.map((i) => <div key={i}>{BOARD[i].name}</div>)}{t.give.cash > 0 && <div>{money(t.give.cash)}</div>}</div>
            <div><div className="text-[#949ba4] mb-1">Senden ister</div>{t.get.props.map((i) => <div key={i}>{BOARD[i].name}</div>)}{t.get.cash > 0 && <div>{money(t.get.cash)}</div>}</div>
          </div>
          <div className="mt-3 flex justify-end gap-2"><Btn tone="ghost" onClick={() => send({ t: "reject" })}>Reddet</Btn><Btn tone="good" onClick={() => send({ t: "accept" })}>Kabul et</Btn></div>
        </div>
      )}
      {t && t.from === me && <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">Takas teklifin {v.players[t.to].name} kişisinde… <button type="button" className="underline ml-1" onClick={() => send({ t: "cancel" })}>geri çek</button></div>}
      {tradeTo >= 0 && <TradeDialog v={v} me={me} to={tradeTo} send={send} onClose={() => setTradeTo(-1)} />}

      {/* Eylem çubuğu */}
      {me >= 0 && v.phase !== "over" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-black/55 px-3 py-2">
          {v.phase === "debt" && v.debt?.who === me ? (
            <>
              <span className="text-sm text-[#faa61a] font-semibold">Borç: {money(v.debt.amount > 0 ? -p.cash : 0)} — arsa kartından ev sat / ipotek et</span>
              <Btn tone="danger" onClick={() => send({ t: "bankrupt" })}>İflas et</Btn>
            </>
          ) : myTurn ? (
            <>
              {v.phase === "roll" && p.jail > 0 && <Btn tone="ghost" disabled={p.cash < JAIL_FINE} onClick={() => send({ t: "payFine" })}>Ceza öde ({money(JAIL_FINE)})</Btn>}
              {v.phase === "roll" && p.jail > 0 && p.free > 0 && <Btn tone="ghost" onClick={() => send({ t: "useCard" })}>Çıkış kartı</Btn>}
              {(v.phase === "roll" || (v.phase === "manage" && v.canRollAgain)) && <Btn disabled={rolling} onClick={() => send({ t: "roll" })}><Dices size={15} className="inline -mt-0.5 mr-1.5" />{v.canRollAgain ? "Tekrar at (çift)" : p.jail > 0 ? "Çift dene" : "Zar at"}</Btn>}
              {v.phase === "buy" && !rolling && (
                <>
                  <Btn tone="good" disabled={p.cash < sq.price} onClick={() => send({ t: "buy" })}><Home size={14} className="inline -mt-0.5 mr-1.5" />{sq.name} al ({money(sq.price)})</Btn>
                  <Btn tone="ghost" onClick={() => send({ t: "decline" })}>İhaleye çıkar</Btn>
                </>
              )}
              {v.phase === "manage" && !v.canRollAgain && <Btn onClick={() => send({ t: "end" })}><Exit size={14} className="inline -mt-0.5 mr-1.5" />Turu bitir</Btn>}
              {v.turnTime > 0 && <span className="text-xs text-[#faa61a] tabular-nums">{v.turnLeft} sn</span>}
            </>
          ) : (
            <span className="text-sm text-[#dbdee1]">{v.players[v.turn].name} oynuyor…</span>
          )}
        </div>
      )}

      {v.phase === "over" && (
        <EndCard
          win={v.winner === me}
          title={v.winner === me ? "Emlak kralı sensin!" : `${v.players[v.winner]?.name} kazandı`}
          subtitle={v.reason === "last" ? "Rakiplerin iflas etti" : `Tur sınırında en yüksek değer: ${money(v.worth[v.winner])}`}
          isHost={isHost}
          onRematch={onRematch}
          onLobby={onLobby}
          onLeave={onLeave}
          rkey={`${session.sid}-${session.round}`}
        />
      )}
    </div>
  );
}
