"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Bot, Trophy, RotateCcw, LogOut } from "lucide-react";
import { useGamesPrefs, useGamesProgress } from "./store";
import { unlocksBetween } from "./themes";

/** Oyun arayüzlerinin ortak küçük parçaları */

export function Btn({ children, onClick, disabled, tone = "primary", className = "", ...rest }) {
  const tones = {
    primary: "bg-[#6366f1] hover:bg-[#5558eb] text-white",
    ghost: "bg-white/5 hover:bg-white/10 text-[#dbdee1]",
    danger: "bg-[#da373c] hover:bg-[#c4292f] text-white",
    good: "bg-[#23a559] hover:bg-[#1a8047] text-white",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({ name, host, bot, you, accent = "#64748b" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#dbdee1]">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ background: accent }}>
        {(name || "?").trim().charAt(0).toUpperCase()}
      </span>
      <span className="truncate max-w-[110px]">{name}</span>
      {host && <Crown size={12} className="text-amber-400" aria-label="Host" />}
      {bot && <Bot size={12} className="text-[#949ba4]" aria-label="Bot" />}
      {you && <span className="text-[10px] text-sky-300">(sen)</span>}
    </span>
  );
}

/** Maç sonu kartı: kazanan, rövanş ve çıkış */
export function EndCard({ title, subtitle, win, isHost, onRematch, onLobby, onLeave, children, rkey }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Maç sonucu">
      <div className="w-full max-w-sm rounded-xl bg-[#25272a] border border-white/10 p-6 text-center shadow-2xl animate-[gmPop_.25s_ease-out]">
        <div className={`mx-auto mb-3 w-12 h-12 rounded-lg flex items-center justify-center ${win ? "bg-[#faa61a]/15 text-[#faa61a]" : "bg-white/5 text-[#949ba4]"}`}>
          <Trophy size={24} />
        </div>
        <div className="text-lg font-bold text-white">{title}</div>
        {subtitle && <div className="text-sm text-[#949ba4] mt-1">{subtitle}</div>}
        {children}
        {rkey && <RewardPanel rkey={rkey} />}
        <div className="mt-5 flex flex-col gap-2">
          {isHost ? (
            <Btn onClick={onRematch}>
              <RotateCcw size={14} className="inline -mt-0.5 mr-1.5" />
              Rövanş
            </Btn>
          ) : (
            <div className="text-xs text-[#949ba4] py-2">Rövanşı host başlatır…</div>
          )}
          {isHost && (
            <Btn tone="ghost" onClick={onLobby}>
              Lobiye dön
            </Btn>
          )}
          <Btn tone="ghost" onClick={onLeave}>
            <LogOut size={14} className="inline -mt-0.5 mr-1.5" />
            Oyundan çık
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ───────── Ses (tercihler store'dan: sessiz + ses seviyesi) ─────────
let actx = null;
export function beep(freq = 440, dur = 0.08, type = "sine", gain = 0.05) {
  const { muted, vol } = useGamesPrefs.getState();
  if (muted || vol <= 0 || typeof window === "undefined") return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain * (vol / 70), actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch (e) {}
}

/** Canvas'ı kapsayıcıya sığdırır (DPR'lı); çizim mantıksal W×H koordinatlarında yapılır */
export function useFitCanvas(W, H) {
  const ref = useRef(null);
  const box = useRef(null);
  const scale = useRef({ k: 1, ox: 0, oy: 0 });
  useEffect(() => {
    const c = ref.current;
    const b = box.current;
    if (!c || !b) return;
    const fit = () => {
      const r = b.getBoundingClientRect();
      const k = Math.min(r.width / W, r.height / H);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.style.width = W * k + "px";
      c.style.height = H * k + "px";
      c.width = Math.round(W * k * dpr);
      c.height = Math.round(H * k * dpr);
      scale.current = { k: k * dpr, css: k };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [W, H]);
  /** İmleç olayını mantıksal koordinata çevirir */
  const toLogical = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  return { ref, box, scale, toLogical };
}

/** rAF döngüsü; bileşen sökülünce kesin durur */
export function useRaf(fn) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    let id;
    let last = performance.now();
    const loop = (t) => {
      f.current(t, Math.min(0.05, (t - last) / 1000));
      last = t;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
}

/** Maç sonu ödül özeti: XP satırları, animasyonlu seviye çubuğu, açılan kozmetikler, görev/başarım */
export function RewardPanel({ rkey }) {
  const lr = useGamesProgress((s) => s.lastReward);
  const [fill, setFill] = useState(null);
  const r = lr?.key === rkey ? lr.reward : null;
  useEffect(() => {
    if (!r) return;
    setFill(r.before.into / r.before.need);
    const t = setTimeout(() => setFill(r.after.level > r.before.level ? 1 : r.after.into / r.after.need), 80);
    const t2 = r.after.level > r.before.level ? setTimeout(() => (setFill(0), setTimeout(() => setFill(r.after.into / r.after.need), 60)), 900) : null;
    if (r.after.level > r.before.level) setTimeout(() => beep(880, 0.25, "triangle", 0.07), 900);
    return () => (clearTimeout(t), t2 && clearTimeout(t2));
  }, [r]);
  if (!r) return null;
  const up = r.after.level > r.before.level;
  const unlocks = unlocksBetween(r.before.level, r.after.level);
  return (
    <div className="mt-4 text-left rounded-lg bg-[#1e1f22] p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#949ba4]">Seviye {r.after.level}</span>
        <span className="text-sm font-bold text-[#6366f1]">+{r.total} XP</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-[#6366f1] transition-[width] duration-700 ease-out" style={{ width: `${Math.round((fill ?? 0) * 100)}%` }} />
      </div>
      {up && <div className="mt-2 text-sm font-bold text-[#faa61a] animate-[gmPop_.3s_ease-out]">Seviye atladın: {r.after.level}!</div>}
      <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
        {r.lines.map((l, i) => (
          <li key={i} className="flex justify-between text-xs text-[#b5bac1]"><span className="truncate">{l.label}</span><span className={`tabular-nums ${l.xp < 0 ? "text-[#949ba4]" : "text-[#dbdee1]"}`}>{l.xp > 0 ? "+" : ""}{l.xp}</span></li>
        ))}
      </ul>
      {unlocks.length > 0 && <div className="mt-2 text-xs text-[#23a559]">Açıldı: {unlocks.join(" · ")}</div>}
    </div>
  );
}
