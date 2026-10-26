"use client";

import { useEffect, useRef, useState } from "react";
import * as hockey from "../engines/airhockey";
import { Predictor } from "../netcode";
import { EndCard } from "../ui";
import { useGamesPrefs, live } from "../store";
import { HOCKEY_TABLES, PLAYER_COLORS, PUCK_COLORS, oppColor } from "../themes";
import { HockeyScene } from "../three/hockeyScene";
import { sfx, startHum, stopHum } from "../three/sound";

const KEY_SPEED = 1.6; // m/s (klavye ile raket hedefi)

export default function AirHockeyView({ view, session, myId, send, isHost, onRematch, onLobby, onLeave }) {
  const canvasRef = useRef(null);
  const mySeat = view.seats.indexOf(myId);
  const prefs = useGamesPrefs((s) => s.hockey);
  const gfx = useGamesPrefs((s) => s.gfx);
  const showFps = useGamesPrefs((s) => s.showFps);
  const mine = (PLAYER_COLORS[prefs.mine] || PLAYER_COLORS.indigo).c;
  const colors = mySeat === 1 ? [oppColor(prefs.mine), mine] : mySeat === 0 ? [mine, oppColor(prefs.mine)] : [PLAYER_COLORS.indigo.c, PLAYER_COLORS.amber.c];
  const nameOf = (id) => session.players.find((p) => p.id === id)?.name || "Oyuncu";
  const [ping, setPing] = useState(0);
  const [hud, setHud] = useState(null);
  const [failed, setFailed] = useState(false);
  const sceneRef = useRef(null);
  const lastScore = useRef(view.score.join("-"));

  // Sahne + tahmin + döngü (tek effect: kurulum ve tam temizlik)
  useEffect(() => {
    const cv = canvasRef.current;
    let scene;
    try {
      scene = new HockeyScene(cv, {
        seat: mySeat,
        gfx,
        colors,
        theme: HOCKEY_TABLES[prefs.table] || HOCKEY_TABLES.ice,
        puckColor: (PUCK_COLORS[prefs.puck] || PUCK_COLORS.black).c,
        goal: view.goal,
        padR: view.padR,
      });
    } catch (e) {
      console.error("[hockey] WebGL başlatılamadı", e);
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    scene.setScore(view.score[0], view.score[1]);
    const first = live.v?.t === "airhockey" ? live.v : view;
    const pred = new Predictor(hockey, mySeat, first, { claims: !isHost });
    let lastRail = first.rail || 0;
    const unsub = live.sub((v, now) => {
      pred.setRtt(isHost ? 0 : live.rtt);
      pred.snapshot(v, now);
      if ((v.rail || 0) > lastRail) {
        // ray sesi: sunucu sayacı (rakip tarafı dahil); şiddet disk hızından
        const sp = Math.hypot(v.puck[2], v.puck[3]);
        sfx("rail", sp / 10, panOf(v.puck[1]));
      }
      lastRail = v.rail || 0;
    });
    const panOf = (y) => (mySeat === 1 ? -y : y) / (hockey.WD / 2);
    // klavye
    const keys = new Set();
    const aim = { x: null, y: null };
    const map = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d" };
    const kd = (e) => map[e.code] && mySeat >= 0 && (keys.add(map[e.code]), e.preventDefault());
    const ku = (e) => map[e.code] && keys.delete(map[e.code]);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const onPointer = (e) => {
      if (mySeat < 0) return;
      const p = scene.pick(e.clientX, e.clientY);
      if (!p) return;
      aim.x = p.x;
      aim.y = p.y;
      pred.aim(p.x, p.y);
    };
    const onDown = (e) => (cv.setPointerCapture?.(e.pointerId), onPointer(e));
    cv.addEventListener("pointermove", onPointer);
    cv.addEventListener("pointerdown", onDown);
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(cv);
    if (mySeat >= 0) startHum(0.03);

    let raf;
    let last = performance.now();
    let hudT = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const ms = t - last;
      const dt = Math.min(0.05, ms / 1000);
      last = t;
      if (keys.size && mySeat >= 0) {
        // klavye: ileri = rakibe doğru (koltuğa göre)
        const me = pred.sim.pads[mySeat];
        const fwd = mySeat === 0 ? 1 : -1;
        if (aim.x == null) (aim.x = me.x), (aim.y = me.y);
        aim.x += ((keys.has("u") ? 1 : 0) - (keys.has("d") ? 1 : 0)) * fwd * KEY_SPEED * dt;
        aim.y += ((keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0)) * fwd * KEY_SPEED * dt;
        const b = hockey.bounds(pred.sim, mySeat);
        aim.x = Math.max(b.x0, Math.min(b.x1, aim.x));
        aim.y = Math.max(b.y0, Math.min(b.y1, aim.y));
        pred.aim(aim.x, aim.y);
      }
      const r = pred.frame(t / 1000, dt, send);
      for (const ev of pred.drainEvents()) if (ev.type === "hit") sfx("puck", ev.speed / 9, panOf(ev.y));
      scene.update({ ball: r.ball, pads: r.pads, spin: pred.sim.puck.w }, dt, ms);
      hudT += dt;
      if (hudT > 0.5) {
        hudT = 0;
        setHud(scene.stats);
        setPing(isHost ? 0 : Math.round(live.rtt * 1000));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      cv.removeEventListener("pointermove", onPointer);
      cv.removeEventListener("pointerdown", onDown);
      stopHum();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [mySeat, isHost, gfx, prefs.table, prefs.puck, prefs.mine, view.goal, view.padR]); // eslint-disable-line

  // Gol: skor paneli + LED + ses
  useEffect(() => {
    const sc = view.score.join("-");
    if (sc === lastScore.current) return;
    lastScore.current = sc;
    sceneRef.current?.setScore(view.score[0], view.score[1]);
    if (view.lastScorer >= 0) sceneRef.current?.goalFlash(view.lastScorer);
    sfx("goal", 1, 0);
  }, [view.score]); // eslint-disable-line

  const win = view.winner != null && view.winner === mySeat;
  const shots = view.shots || [0, 0];
  const countdown = view.phase === "countdown" ? Math.max(1, Math.ceil(live.v?.timer ?? view.timer)) : null;

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none cursor-none" aria-label="Air Hockey masası. Fare, dokunma ya da ok tuşlarıyla raketi sür." />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#b5bac1]">Bu cihazda 3B grafik (WebGL) başlatılamadı.</div>
      )}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-5 rounded-lg bg-black/45 px-4 py-1.5 text-white pointer-events-none">
        {[0, 1].map((i) => (
          <div key={i} className={`flex items-center gap-2.5 ${i === 1 ? "flex-row-reverse" : ""}`}>
            <span className="text-xs font-semibold text-[#dbdee1] truncate max-w-[120px]">{nameOf(view.seats[i])}{i === mySeat ? " (sen)" : ""}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color: colors[i] }}>{view.score[i]}</span>
          </div>
        ))}
        <span className="text-[11px] text-[#b5bac1]">hedef {view.target}</span>
        {!isHost && mySeat >= 0 && <span className={`text-[11px] tabular-nums ${ping > 150 ? "text-[#faa61a]" : "text-[#b5bac1]"}`}>{ping} ms</span>}
      </div>
      {showFps && hud && <div className="absolute top-3 right-3 text-[11px] tabular-nums text-[#b5bac1] bg-black/45 rounded px-2 py-1 pointer-events-none">{hud.fps} fps · {hud.tier} · {hud.dpr}x · {hud.calls} çizim</div>}
      {countdown && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-8xl font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,.6)]">{countdown}</span></div>}
      {view.phase === "goal" && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-7xl font-extrabold drop-shadow-[0_4px_24px_rgba(0,0,0,.6)]" style={{ color: colors[view.lastScorer] || "#fff" }}>GOL</span></div>}
      <div className="absolute bottom-2 inset-x-0 text-center text-[11px] text-white/60 pointer-events-none">{mySeat < 0 ? "İzliyorsun" : "Fare, dokunma ya da ok tuşları / WASD — raket yalnızca kendi yarında"}</div>
      {view.phase === "over" && (
        <EndCard
          win={win}
          title={mySeat < 0 ? `${nameOf(view.seats[view.winner])} kazandı` : win ? "Kazandın!" : "Kaybettin"}
          subtitle={`${view.score[0]} – ${view.score[1]}${view.reason === "forfeit" ? " · rakip ayrıldı" : ""}`}
          isHost={isHost}
          onRematch={onRematch}
          onLobby={onLobby}
          onLeave={onLeave}
          rkey={`${session.sid}-${session.round}`}
        >
          <div className="mt-2 text-xs text-[#949ba4]">Vuruş: {shots[0]} – {shots[1]} · En yüksek hız: {view.top ? `${Math.round(view.top * 3.6)} km/sa` : "—"}</div>
        </EndCard>
      )}
    </div>
  );
}
