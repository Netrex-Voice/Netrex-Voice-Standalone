"use client";

import { useEffect, useRef } from "react";
import { Check, SkipForward, Siren, Play, ShieldAlert } from "lucide-react";
import { Btn, EndCard, beep } from "../ui";

export default function TabuView({ view, session, myId, send, isHost, onRematch, onLobby, onLeave }) {
  const nameOf = (id) => view.names[id] || session.players.find((p) => p.id === id)?.name || "Oyuncu";
  const me = view.me;
  const iDescribe = view.describer === myId;
  const judge = view.card?.judge;
  const lastRemain = useRef(view.remain);

  useEffect(() => {
    if (view.phase === "play" && view.remain <= 5 && view.remain > 0 && view.remain !== lastRemain.current) beep(880, 0.06, "square", 0.04);
    lastRemain.current = view.remain;
  }, [view.remain, view.phase]);

  const TEAM = [0, 1].map((i) => ({ name: view.teamNames[i], c: view.teamColors[i] }));
  const pct = view.phase === "play" ? (view.remain / view.secs) * 100 : 100;
  const col = TEAM[view.turn].c;

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        {/* Skor */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((t) => (
            <div key={t} className={`rounded-lg p-3 transition border-l-4 ${view.turn === t && view.phase !== "over" ? "bg-[#2b2d31]" : "bg-[#25272a]"}`} style={{ borderLeftColor: TEAM[t].c }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: TEAM[t].c }}>{TEAM[t].name}{me === t ? " · senin takımın" : ""}</span>
                <span className="text-3xl font-bold text-white tabular-nums">{view.score[t]}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-[#949ba4] leading-relaxed">{view.teams[t].map(nameOf).join(", ") || "—"}</div>
            </div>
          ))}
        </div>

        {/* Durum çubuğu */}
        <div className="rounded-lg bg-[#25272a] p-4">
          <div className="flex items-center justify-between text-xs text-[#949ba4] mb-2">
            <span>Tur {Math.min(view.turnsPlayed + 1, view.totalTurns)} / {view.totalTurns}</span>
            <span>{view.phase === "play" ? `${view.remain} sn` : `${view.secs} sn tur`}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden" role="progressbar" aria-valuenow={view.remain} aria-valuemax={view.secs}>
            <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: pct + "%", background: view.remain <= 10 && view.phase === "play" ? "#ef4444" : col }} />
          </div>
          <div className="mt-3 text-sm text-white">
            <span style={{ color: col }} className="font-bold">{TEAM[view.turn].name}</span> oynuyor · Anlatıcı: <b>{nameOf(view.describer)}</b>
            {iDescribe && <span className="text-sky-300"> (sen)</span>}
          </div>
          {view.last && <div className="mt-1 text-xs text-amber-300" aria-live="polite">{view.last}</div>}
        </div>

        {/* Hazır */}
        {view.phase === "ready" && (
          <div className="rounded-lg bg-[#25272a] p-8 text-center">
            {iDescribe ? (
              <>
                <div className="text-lg font-bold text-white mb-1">Sıra sende!</div>
                <p className="text-sm text-[#949ba4] mb-5">Kartı yalnızca sen ve rakip takım görecek. Hazır olunca başla, süre işler.</p>
                <Btn onClick={() => send({ t: "go" })} className="px-8 py-2.5 text-base"><Play size={16} className="inline -mt-0.5 mr-2" />Başla</Btn>
              </>
            ) : (
              <p className="text-sm text-[#b5bac1]">{nameOf(view.describer)} hazırlanıyor…</p>
            )}
          </div>
        )}

        {/* Oyun */}
        {view.phase === "play" && (
          <div className="rounded-lg p-6 text-center bg-[#25272a] border-t-4 animate-[gmPop_.2s_ease-out]" style={{ borderTopColor: col }}>
            {view.card ? (
              <>
                {judge && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 mb-2"><ShieldAlert size={13} />Denetçisin — yasaklı kelime söylenirse bas</div>
                )}
                <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">{view.card.word}</div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {view.card.taboo.map((w) => (
                    <div key={w} className="rounded-lg bg-[#da373c]/10 border border-[#da373c]/25 text-red-200 text-sm font-semibold py-2 px-2">{w}</div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {iDescribe && (
                    <>
                      <Btn tone="good" onClick={() => send({ t: "ok" })} className="px-6 py-2.5"><Check size={16} className="inline -mt-0.5 mr-1.5" />Doğru</Btn>
                      <Btn tone="ghost" disabled={view.passes <= 0} onClick={() => send({ t: "pass" })} className="px-6 py-2.5"><SkipForward size={16} className="inline -mt-0.5 mr-1.5" />Pas ({view.passes})</Btn>
                    </>
                  )}
                  {judge && <Btn tone="danger" onClick={() => send({ t: "taboo" })} className="px-8 py-2.5 text-base"><Siren size={16} className="inline -mt-0.5 mr-2" />TABU!</Btn>}
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-white mb-1">Takımın tahmin ediyor</div>
                <p className="text-sm text-[#949ba4]">Sesli sohbetten <b>{nameOf(view.describer)}</b> kişisini dinle ve kelimeyi bulmaya çalış. Kart sana gösterilmez.</p>
              </>
            )}
          </div>
        )}
      </div>

      {view.phase === "over" && (
        <EndCard
          win={view.winner === me}
          title={view.winner === -1 ? "Berabere!" : `${TEAM[view.winner].name} kazandı`}
          subtitle={`${view.score[0]} – ${view.score[1]}`}
          isHost={isHost}
          onRematch={onRematch}
          onLobby={onLobby}
          onLeave={onLeave}
          rkey={`${session.sid}-${session.round}`}
        >
          <div className="mt-4 text-xs text-[#949ba4]">Doğru {view.stats.ok} (+{view.okPts}) · Tabu {view.stats.taboo}{view.tabooPts ? ` (−${view.tabooPts})` : ""} · Pas {view.stats.pass}</div>
        </EndCard>
      )}
    </div>
  );
}
