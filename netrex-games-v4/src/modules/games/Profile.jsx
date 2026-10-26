"use client";

import { Trophy, Flame, Trash2, Target, Award, Lock } from "lucide-react";
import { useGamesStats, useGamesProgress } from "./store";
import { levelOf, CHALLENGES, dailyIds, ACHIEVEMENTS } from "./progress";
import { GAMES, getGame } from "./registry";
import { Btn } from "./ui";

const RES = { win: ["Galibiyet", "text-[#23a559]"], loss: ["Mağlubiyet", "text-[#da373c]"], draw: ["Berabere", "text-[#faa61a]"] };
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "az önce" : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} sa önce` : `${Math.round(m / 1440)} gün önce`;
};

/** Kişisel profil: bu cihazda oynanan gerçek maçlardan istatistikler */
export default function Profile() {
  const { byGame, history, reset } = useGamesStats();
  const total = Object.values(byGame).reduce((a, g) => ({ p: a.p + g.played, w: a.w + g.wins }), { p: 0, w: 0 });
  const rate = total.p ? Math.round((total.w / total.p) * 100) : 0;
  const prog = useGamesProgress((s) => s.prog);
  const resetProg = useGamesProgress((s) => s.reset);
  const lv = levelOf(prog?.xp || 0);
  const today = new Date().toISOString().slice(0, 10);
  const daily = prog?.daily?.date === today ? prog.daily : { ids: dailyIds(today), prog: {}, done: [] };
  const ach = new Set(prog?.ach || []);

  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-5">
      <section className="rounded-lg bg-[#25272a] p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-[#6366f1] flex flex-col items-center justify-center text-white shrink-0">
          <span className="text-[10px] font-semibold opacity-80 leading-none">SEVİYE</span>
          <span className="text-2xl font-bold leading-tight">{lv.level}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-[#949ba4] mb-1.5"><span>Sonraki seviyeye</span><span className="tabular-nums">{lv.into} / {lv.need} XP</span></div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-[#6366f1]" style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div>
          <div className="text-[11px] text-[#6b7280] mt-1.5">Seviye atladıkça yeni masa, raket rengi ve iz efektleri açılır.</div>
        </div>
      </section>

      <section className="rounded-lg bg-[#25272a] p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-3 flex items-center gap-1.5"><Target size={12} />Günlük görevler</h2>
        <ul className="flex flex-col gap-2.5">
          {daily.ids.map((id) => {
            const c = CHALLENGES.find((x) => x.id === id);
            const n = Math.min(c.goal, daily.prog[id] || 0);
            const done = daily.done.includes(id);
            return (
              <li key={id}>
                <div className="flex justify-between text-sm mb-1"><span className={done ? "text-[#23a559]" : "text-[#dbdee1]"}>{done ? "✓ " : ""}{c.text}</span><span className="text-xs text-[#949ba4] tabular-nums">{n}/{c.goal} · +60 XP</span></div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full ${done ? "bg-[#23a559]" : "bg-[#6366f1]"}`} style={{ width: `${(n / c.goal) * 100}%` }} /></div>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-[#6b7280] mt-3">Görevler her gün yenilenir.</p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[["Oynanan maç", total.p], ["Galibiyet", total.w], ["Kazanma oranı", total.p ? `%${rate}` : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#25272a] p-4">
            <div className="text-2xl font-bold text-white tabular-nums">{v}</div>
            <div className="text-xs text-[#949ba4] mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      <section className="rounded-lg bg-[#25272a] overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Oyunlara göre</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[#6b7280]"><th className="px-4 py-1.5 font-medium">Oyun</th><th className="px-2 font-medium">Maç</th><th className="px-2 font-medium">G</th><th className="px-2 font-medium">M</th><th className="px-2 font-medium">B</th><th className="px-2 font-medium">Seri</th><th className="px-2 pr-4 font-medium">En iyi seri</th></tr></thead>
            <tbody>
              {GAMES.map((g) => {
                const s = byGame[g.id];
                return (
                  <tr key={g.id} className="border-t border-white/5 text-[#dbdee1] tabular-nums">
                    <td className="px-4 py-2.5 font-semibold text-white">{g.name}</td>
                    <td className="px-2">{s?.played || 0}</td><td className="px-2 text-[#23a559]">{s?.wins || 0}</td><td className="px-2 text-[#da373c]">{s?.losses || 0}</td><td className="px-2">{s?.draws || 0}</td>
                    <td className="px-2">{s?.streak ? <span className="inline-flex items-center gap-1 text-[#faa61a]"><Flame size={12} />{s.streak}</span> : 0}</td>
                    <td className="px-2 pr-4">{s?.best || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-[#25272a]">
        <h2 className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Son maçlar</h2>
        {history.length === 0 ? (
          <div className="px-4 pb-6 pt-2 text-center text-sm text-[#949ba4]"><Trophy size={22} className="mx-auto mb-2 text-[#6b7280]" />Henüz maç oynamadın. İlk maçından sonra burada görünür.</div>
        ) : (
          <ul>
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-white/5 text-sm">
                <span className={`w-24 font-semibold ${RES[h.result][1]}`}>{RES[h.result][0]}</span>
                <span className="text-white font-medium">{getGame(h.game)?.name}</span>
                <span className="text-[#949ba4] tabular-nums">{h.detail}</span>
                {h.withWho && <span className="hidden sm:inline text-[#6b7280] truncate">· {h.withWho}</span>}
                <span className="ml-auto text-xs text-[#6b7280] shrink-0">{ago(h.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-[#25272a] p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-3 flex items-center gap-1.5"><Award size={12} />Başarımlar ({ach.size}/{ACHIEVEMENTS.length})</h2>
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={`rounded-lg p-3 flex gap-2.5 items-start ${ach.has(a.id) ? "bg-[#6366f1]/15" : "bg-[#1e1f22]"}`}>
              <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${ach.has(a.id) ? "bg-[#6366f1] text-white" : "bg-white/5 text-[#6b7280]"}`}>{ach.has(a.id) ? <Award size={14} /> : <Lock size={12} />}</span>
              <div className="min-w-0"><div className={`text-sm font-semibold ${ach.has(a.id) ? "text-white" : "text-[#949ba4]"}`}>{a.name}</div><div className="text-[11px] text-[#6b7280] leading-snug">{a.desc}</div></div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between text-xs text-[#6b7280]">
        <span>İstatistik, XP ve başarımlar yalnızca bu cihazda saklanır.</span>
        {(history.length > 0 || prog) && <Btn tone="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => confirm("Tüm istatistikler, XP ve başarımlar silinsin mi?") && (reset(), resetProg())}><Trash2 size={12} className="inline -mt-0.5 mr-1" />Sıfırla</Btn>}
      </div>
    </div>
  );
}
