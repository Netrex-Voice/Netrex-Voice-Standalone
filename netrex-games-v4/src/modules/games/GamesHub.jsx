"use client";

import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import {
  Gamepad2, X, Search, Star, Users, Bot, Play, ArrowLeft, Plus, UserMinus, Wifi, WifiOff, Zap, Dumbbell,
  MessageCircleQuestion, LayoutGrid, Circle, Building2, Clock, Info, LogOut, Palette, Check, Lock, Globe, UserPlus, Smile,
} from "lucide-react";
import { useGamesStore, useGamesLibrary, useGamesStats } from "./store";
import { GAMES, CATEGORIES, getGame } from "./registry";
import { REACTIONS } from "./runtime";
import { gamesActions } from "./GamesHandler";
import { Btn, Chip } from "./ui";
import Appearance from "./Appearance";
import Profile from "./Profile";

const ICONS = { Zap, Dumbbell, MessageCircleQuestion, LayoutGrid, Circle, Building2 };
const GameIcon = ({ g, size = 20 }) => {
  const I = ICONS[g.icon] || Gamepad2;
  return <I size={size} style={{ color: g.accent }} />;
};
const Tile = ({ g, size = "md" }) => (
  <span className={`${size === "lg" ? "w-14 h-14" : "w-10 h-10"} shrink-0 rounded-lg bg-white/5 flex items-center justify-center`}><GameIcon g={g} size={size === "lg" ? 26 : 20} /></span>
);
const playersLabel = (g) => (g.players.min === g.players.max ? `${g.players.max} kişi` : `${g.players.min}–${g.players.max} kişi`);

const VIEWS = {};
const viewFor = (g) => (VIEWS[g.id] ||= lazy(g.view));

const Panel = ({ title, icon, children, className = "" }) => (
  <section className={`rounded-lg bg-[#25272a] p-4 ${className}`}>
    {title && <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-3 flex items-center gap-1.5">{icon}{title}</h2>}
    {children}
  </section>
);

// ───────────────────────────── Mağaza ─────────────────────────────
function GameCard({ g, onOpen }) {
  const fav = useGamesLibrary((s) => s.favorites.includes(g.id));
  const toggleFav = useGamesLibrary((s) => s.toggleFav);
  const played = useGamesStats((s) => s.byGame[g.id]?.played || 0);
  return (
    <div className="rounded-lg bg-[#25272a] hover:bg-[#2b2d31] p-4 flex flex-col gap-3 transition">
      <div className="flex items-start gap-3">
        <Tile g={g} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white leading-tight">{g.name}</div>
          <div className="text-xs text-[#949ba4] mt-0.5">{CATEGORIES[g.category]}</div>
        </div>
        <button type="button" onClick={() => toggleFav(g.id)} className="p-1 -m-1 text-[#6b7280] hover:text-[#faa61a] transition" aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={fav}>
          <Star size={16} className={fav ? "fill-[#faa61a] text-[#faa61a]" : ""} />
        </button>
      </div>
      <p className="text-sm text-[#b5bac1] leading-snug flex-1">{g.tagline}</p>
      <div className="flex items-center gap-3 text-xs text-[#949ba4]">
        <span className="inline-flex items-center gap-1"><Users size={12} />{playersLabel(g)}</span>
        {g.bots && <span className="inline-flex items-center gap-1"><Bot size={12} />Bot</span>}
        {played > 0 && <span className="ml-auto">{played} maç</span>}
      </div>
      <Btn onClick={() => onOpen(g.id)} className="w-full">Oyna</Btn>
    </div>
  );
}

function StoreScreen() {
  const go = useGamesStore((s) => s.go);
  const { favorites, recent } = useGamesLibrary();
  const plays = useGamesStats((s) => s.byGame);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState("name");

  const list = useMemo(() => {
    const l = GAMES.filter((g) => (cat === "all" || g.category === cat) && (!onlyFav || favorites.includes(g.id)) && (g.name + g.tagline).toLowerCase().includes(q.trim().toLowerCase()));
    return l.slice().sort((a, b) => (sort === "played" ? (plays[b.id]?.played || 0) - (plays[a.id]?.played || 0) : a.name.localeCompare(b.name, "tr")));
  }, [q, cat, onlyFav, sort, favorites, plays]);
  const recents = recent.map((r) => getGame(r.id)).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-5">
      {recents.length > 0 && (
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-2 flex items-center gap-1.5"><Clock size={12} />Son oynadıkların</h2>
          <div className="flex gap-2 overflow-x-auto">
            {recents.map((g) => (
              <button key={g.id} type="button" onClick={() => go("detail", g.id)} className="shrink-0 flex items-center gap-2.5 rounded-lg bg-[#25272a] hover:bg-[#2b2d31] pl-2.5 pr-4 py-2 transition">
                <Tile g={g} /><span className="text-sm font-semibold text-white">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Oyun ara" aria-label="Oyun ara" className="w-full bg-[#1e1f22] border border-white/5 focus:border-[#6366f1] outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-[#6b7280]" />
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Kategoriler">
          {[["all", "Tümü"], ...Object.entries(CATEGORIES)].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${cat === k ? "bg-[#6366f1] text-white" : "text-[#b5bac1] hover:bg-white/5"}`}>{label}</button>
          ))}
        </div>
        <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${onlyFav ? "bg-[#faa61a] text-black" : "text-[#b5bac1] hover:bg-white/5"}`}><Star size={12} />Favoriler</button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sırala" className="ml-auto bg-[#1e1f22] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#dbdee1]">
          <option value="name">A–Z</option><option value="played">En çok oynadıklarım</option>
        </select>
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-10 text-center">
          <Gamepad2 size={24} className="mx-auto text-[#6b7280] mb-2" />
          <div className="text-sm font-semibold text-white">{onlyFav ? "Henüz favorin yok" : "Aramayla eşleşen oyun yok"}</div>
          <p className="text-xs text-[#949ba4] mt-1">{onlyFav ? "Bir oyunun yıldızına dokun." : "Filtreleri temizle."}</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">{list.map((g) => <GameCard key={g.id} g={g} onOpen={(id) => go("detail", id)} />)}</div>
      )}
    </div>
  );
}

// ───────────────────────────── Detay ─────────────────────────────
function DetailScreen({ id }) {
  const g = getGame(id);
  const go = useGamesStore((s) => s.go);
  const session = useGamesStore((s) => s.session);
  const fav = useGamesLibrary((s) => s.favorites.includes(id));
  const toggleFav = useGamesLibrary((s) => s.toggleFav);
  const st = useGamesStats((s) => s.byGame[id]);
  const [busy, setBusy] = useState(false);
  if (!g) return <div className="p-8 text-[#949ba4]">Oyun bulunamadı.</div>;
  const act = async (solo) => {
    setBusy(true);
    await gamesActions.create(id, { solo });
    setBusy(false);
  };
  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-4">
      <button type="button" onClick={() => go("store")} className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-[#949ba4] hover:text-white transition"><ArrowLeft size={14} />Mağaza</button>
      <Panel>
        <div className="flex items-start gap-4">
          <Tile g={g} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#949ba4]">{CATEGORIES[g.category]} · {playersLabel(g)}{g.bots ? " · botlara karşı oynanabilir" : ""}</div>
            <h1 className="text-2xl font-bold text-white">{g.name}</h1>
            <p className="text-sm text-[#b5bac1] mt-1">{g.tagline}</p>
            {st && <p className="text-xs text-[#949ba4] mt-2">{st.played} maç · {st.wins} galibiyet{st.streak > 1 ? ` · ${st.streak} seri` : ""}</p>}
          </div>
          <button type="button" onClick={() => toggleFav(id)} aria-pressed={fav} aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"} className="p-1.5 text-[#6b7280] hover:text-[#faa61a] transition"><Star size={18} className={fav ? "fill-[#faa61a] text-[#faa61a]" : ""} /></button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {session ? (
            <Btn onClick={() => go("room")}>Odadaki oyuna dön</Btn>
          ) : (
            <>
              {g.bots && <Btn disabled={busy} onClick={() => act(true)}><Bot size={14} className="inline -mt-0.5 mr-1.5" />Botlara karşı oyna</Btn>}
              <Btn disabled={busy} tone={g.bots ? "ghost" : "primary"} onClick={() => act(false)}><Users size={14} className="inline -mt-0.5 mr-1.5" />Lobi aç, arkadaşlarını davet et</Btn>
            </>
          )}
        </div>
        {session && <p className="text-xs text-[#faa61a] mt-3">Bu odada zaten bir oyun oturumu var. Önce ondan çık ya da ona katıl.</p>}
      </Panel>
      <Panel title="Hakkında" icon={<Info size={12} />}><p className="text-sm text-[#dbdee1] leading-relaxed">{g.description}</p></Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Nasıl oynanır"><ol className="space-y-1.5 text-sm text-[#dbdee1] list-decimal list-inside marker:text-[#6b7280]">{g.howTo.map((h) => <li key={h}>{h}</li>)}</ol></Panel>
        <Panel title="Kontroller"><ul className="space-y-1.5 text-sm text-[#dbdee1]">{g.controls.map((c) => <li key={c} className="flex gap-2"><span className="text-[#6b7280]">•</span>{c}</li>)}</ul></Panel>
      </div>
      <Panel title="Ayarlanabilir kurallar">
        <div className="flex flex-wrap gap-1.5">{g.config.map((c) => <span key={c.key} className="px-2 py-1 rounded-md bg-white/5 text-xs text-[#b5bac1]">{c.label}</span>)}</div>
      </Panel>
    </div>
  );
}

// ───────────────────────────── Lobi ─────────────────────────────
const field = "bg-[#1e1f22] border border-white/5 focus:border-[#6366f1] outline-none rounded-lg px-2.5 py-1.5 text-sm text-white disabled:opacity-60";

function ConfigField({ c, value, disabled, onChange }) {
  if (c.type === "toggle")
    return (
      <label className="flex items-center justify-between gap-3 text-sm text-[#dbdee1]">
        <span>{c.label}</span>
        <input type="checkbox" disabled={disabled} checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-[#6366f1] w-4 h-4" />
      </label>
    );
  if (c.type === "text")
    return (
      <label className="flex items-center justify-between gap-3 text-sm text-[#dbdee1]">
        <span className="shrink-0">{c.label}</span>
        <input disabled={disabled} maxLength={c.max} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} w-40`} />
      </label>
    );
  if (c.type === "area")
    return (
      <label className="flex flex-col gap-1.5 text-sm text-[#dbdee1]">
        <span>{c.label}</span>
        <textarea disabled={disabled} maxLength={c.max} rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder={c.hint} className={`${field} font-mono text-xs resize-y`} />
        <span className="text-[11px] text-[#6b7280]">{c.hint} · {String(value).length}/{c.max}</span>
      </label>
    );
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-[#dbdee1]">
      <span>{c.label}</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(typeof c.options[0] === "number" ? Number(e.target.value) : e.target.value)} className={field}>
        {c.options.map((o) => <option key={o} value={o}>{c.labels?.[o] || o}</option>)}
      </select>
    </label>
  );
}

function Config({ g, session, isHost }) {
  const [draft, setDraft] = useState(session.config);
  useEffect(() => setDraft(session.config), [session.config]);
  const groups = [...new Set(g.config.map((c) => c.group || "Ayarlar"))];
  // Metin alanları yazarken değil, alandan çıkınca gönderilir (ağı yormaz)
  const send = (cfg) => isHost && gamesActions.cmd({ k: "cfg", cfg });
  return (
    <div className="flex flex-col gap-3">
      {groups.map((gr) => (
        <Panel key={gr} title={gr}>
          <div className="flex flex-col gap-2.5" onBlur={(e) => e.target.tagName !== "SELECT" && send(draft)}>
            {g.config.filter((c) => (c.group || "Ayarlar") === gr).map((c) => (
              <ConfigField key={c.key} c={c} value={draft[c.key]} disabled={!isHost}
                onChange={(v) => { const n = { ...draft, [c.key]: v }; setDraft(n); if (c.type !== "text" && c.type !== "area") send(n); }} />
            ))}
          </div>
        </Panel>
      ))}
      {!isHost && <p className="text-[11px] text-[#6b7280]">Kuralları yalnızca lobiyi açan kişi değiştirebilir.</p>}
    </div>
  );
}

function InvitePanel({ session, myId }) {
  const remotes = useRemoteParticipants();
  const inLobby = new Set(session.players.map((p) => p.id));
  const invited = new Set(session.invited || []);
  const list = remotes.filter((p) => p.identity !== myId);
  return (
    <Panel title="Davet" icon={<UserPlus size={12} />}>
      <div className="flex gap-1.5 mb-3" role="radiogroup" aria-label="Lobi erişimi">
        {[["open", "Herkese açık", Globe], ["invite", "Sadece davetli", Lock]].map(([k, label, I]) => (
          <button key={k} type="button" role="radio" aria-checked={session.access === k} onClick={() => gamesActions.cmd({ k: "access", v: k })}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${session.access === k ? "bg-[#6366f1] text-white" : "bg-white/5 text-[#b5bac1] hover:bg-white/10"}`}><I size={13} />{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-[#949ba4]">Odada başka kimse yok. Birisi odaya katılınca burada görünür.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((p) => (
            <li key={p.identity} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <Chip name={p.name || p.identity} accent="#4b5563" />
              {inLobby.has(p.identity) ? <span className="ml-auto text-xs text-[#23a559] inline-flex items-center gap-1"><Check size={12} />Lobide</span>
                : invited.has(p.identity) ? <span className="ml-auto text-xs text-[#949ba4]">Davet edildi</span>
                : <Btn tone="ghost" className="ml-auto !py-1 !px-2.5 text-xs" onClick={() => gamesActions.cmd({ k: "invite", ids: [p.identity] })}>Davet et</Btn>}
            </li>
          ))}
        </ul>
      )}
      {list.length > 1 && <Btn tone="ghost" className="w-full mt-2 !py-1.5 text-xs" onClick={() => gamesActions.cmd({ k: "invite", ids: list.filter((p) => !inLobby.has(p.identity)).map((p) => p.identity) })}>Herkesi davet et</Btn>}
    </Panel>
  );
}

function Lobby({ session, g, myId, isHost, isMember }) {
  const players = session.players;
  const me = players.find((p) => p.id === myId);
  const notReady = players.filter((p) => !p.ready).map((p) => p.name);
  const startErr = (() => {
    if (!g.fillBots && players.length < g.players.min) return `${g.players.min - players.length} oyuncu daha gerekli`;
    if (g.teams && !(players.some((p) => p.team === 0) && players.some((p) => p.team === 1))) return "Her takımda en az bir oyuncu olmalı";
    if (notReady.length) return `Hazır değil: ${notReady.join(", ")}`;
    return "";
  })();
  // Çok koltuklu oyunlarda yalnızca ilk boş koltuk gösterilir (liste uzamasın)
  const slots = g.players.max > 4 ? [...players, ...(players.length < g.players.max ? [null] : [])] : Array.from({ length: g.players.max }, (_, i) => players[i] || null);
  const cfg = session.config;

  return (
    <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 grid gap-4 lg:grid-cols-[1fr_380px] items-start">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Tile g={g} size="lg" />
          <div><div className="text-xs text-[#949ba4]">Lobi · {session.access === "invite" ? "sadece davetli" : "herkese açık"}</div><h1 className="text-2xl font-bold text-white">{g.name}</h1></div>
        </div>
        <Panel title={`Oyuncular (${players.length}/${g.players.max})`}>
          <ul className="flex flex-col gap-1.5">
            {slots.map((p, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-[#1e1f22] px-3 py-2.5 min-h-[46px]">
                {p ? (
                  <>
                    <Chip name={p.name} host={p.id === session.hostId} bot={p.bot} you={p.id === myId} accent="#4b5563" />
                    {!p.bot && p.id !== session.hostId && <span className={`text-[11px] font-semibold ${p.ready ? "text-[#23a559]" : "text-[#6b7280]"}`}>{p.ready ? "Hazır" : "Bekleniyor"}</span>}
                    {g.teams && (
                      <div className="ml-auto flex gap-1">
                        {[0, 1].map((t) => (
                          <button key={t} type="button" disabled={!(isHost || p.id === myId)} onClick={() => gamesActions.cmd({ k: "team", team: t, id: p.id })} aria-pressed={p.team === t}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition disabled:cursor-default text-white"
                            style={p.team === t ? { background: cfg[`color${t}`] ? ({ red: "#ef4444", blue: "#6366f1", green: "#23a559", amber: "#faa61a", pink: "#ec4899", teal: "#14b8a6" })[cfg[`color${t}`]] : "#6366f1" } : { background: "rgba(255,255,255,.05)", color: "#6b7280" }}>
                            {cfg[`name${t}`] || `Takım ${t + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                    {isHost && p.id !== myId && (
                      <button type="button" className={`${g.teams ? "" : "ml-auto"} p-1.5 rounded-md text-[#6b7280] hover:text-[#da373c] hover:bg-white/5 transition`} aria-label={`${p.name} oyuncusunu çıkar`} onClick={() => gamesActions.cmd({ k: p.bot ? "rmbot" : "kick", id: p.id })}><UserMinus size={14} /></button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-sm text-[#6b7280]">{g.fillBots ? "Boş koltuk — başlayınca bot oturur" : g.players.max > 4 ? `Boş koltuk (${g.players.max - players.length} tane daha)` : "Boş koltuk"}</span>
                    {isHost && g.bots && <Btn tone="ghost" className="ml-auto !py-1 !px-2.5 text-xs" onClick={() => gamesActions.cmd({ k: "bot" })}><Plus size={12} className="inline -mt-0.5 mr-1" />Bot ekle</Btn>}
                  </>
                )}
              </li>
            ))}
          </ul>
          {session.watchers > 0 && <p className="text-[11px] text-[#6b7280] mt-2">{session.watchers} izleyici</p>}
        </Panel>
        {isHost && <InvitePanel session={session} myId={myId} />}
        <div className="flex flex-wrap items-center gap-2">
          {isHost ? (
            <>
              <Btn disabled={!!startErr} onClick={() => gamesActions.cmd({ k: "start" })} className="px-6"><Play size={14} className="inline -mt-0.5 mr-1.5" />Başlat</Btn>
              {startErr && <span className="text-xs text-[#faa61a]">{startErr}</span>}
            </>
          ) : isMember ? (
            <Btn tone={me?.ready ? "good" : "primary"} onClick={() => gamesActions.cmd({ k: "ready", v: !me?.ready })} className="px-6">{me?.ready ? <><Check size={14} className="inline -mt-0.5 mr-1.5" />Hazırsın</> : "Hazırım"}</Btn>
          ) : (
            <Btn onClick={() => gamesActions.join()} className="px-6"><Users size={14} className="inline -mt-0.5 mr-1.5" />{session.access === "invite" ? "İzleyici olarak gir" : "Lobiye katıl"}</Btn>
          )}
          <Btn tone="ghost" onClick={() => gamesActions.leave()}><LogOut size={14} className="inline -mt-0.5 mr-1.5" />{isHost ? "Oturumu kapat" : "Ayrıl"}</Btn>
        </div>
      </div>
      <Config g={g} session={session} isHost={isHost} />
    </div>
  );
}

// ───────────────────────────── Tepkiler ─────────────────────────────
function Reactions() {
  const list = useGamesStore((s) => s.reactions);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="absolute left-3 bottom-3 z-30 flex flex-col gap-1 pointer-events-none" aria-live="polite">
        {list.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg bg-[#1e1f22]/95 border border-white/10 px-2.5 py-1 animate-[gmPop_.2s_ease-out]"><span className="text-lg leading-none">{r.e}</span><span className="text-xs text-[#b5bac1]">{r.name}</span></div>
        ))}
      </div>
      <div className="absolute right-3 bottom-3 z-30 flex items-center gap-1">
        {open && <div className="flex gap-0.5 rounded-lg bg-[#1e1f22] border border-white/10 p-1">{REACTIONS.map((e) => <button key={e} type="button" onClick={() => (gamesActions.cmd({ k: "react", e }), setOpen(false))} className="w-8 h-8 rounded-md hover:bg-white/10 text-base" aria-label={`Tepki: ${e}`}>{e}</button>)}</div>}
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-9 h-9 rounded-lg bg-[#1e1f22] border border-white/10 text-[#b5bac1] hover:text-white flex items-center justify-center" aria-label="Tepki gönder" aria-expanded={open}><Smile size={17} /></button>
      </div>
    </>
  );
}

// ───────────────────────────── Oda ─────────────────────────────
function Room({ myId, onAppearance }) {
  const session = useGamesStore((s) => s.session);
  const view = useGamesStore((s) => s.view);
  const conn = useGamesStore((s) => s.conn);
  const go = useGamesStore((s) => s.go);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const g = session ? getGame(session.gameId) : null;
  useEffect(() => { if (!session) go("store"); }, [session, go]);
  if (!session || !g) return null;
  const isHost = session.hostId === myId;
  const isMember = session.players.some((p) => p.id === myId);
  if (session.status === "lobby") return <Lobby session={session} g={g} myId={myId} isHost={isHost} isMember={isMember} />;

  const View = viewFor(g);
  const send = (m, reliable = true) => gamesActions.input(m, reliable);
  const rematch = () => { gamesActions.cmd({ k: "lobby" }); setTimeout(() => gamesActions.cmd({ k: "start" }), 30); };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-3 px-4 h-11 border-b border-white/5 bg-[#1e1f22] shrink-0">
        <GameIcon g={g} size={16} />
        <div className="text-sm font-bold text-white">{g.name}</div>
        <div className="hidden md:flex items-center gap-3 ml-2">{session.players.slice(0, 6).map((p) => <Chip key={p.id} name={p.name} host={p.id === session.hostId} bot={p.bot} you={p.id === myId} accent="#4b5563" />)}</div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${conn === "ok" ? "text-[#23a559]" : "text-[#faa61a]"}`}>{conn === "ok" ? <Wifi size={13} /> : <WifiOff size={13} />}{conn === "ok" ? "Bağlı" : "Yeniden bağlanıyor"}</span>
          <button type="button" onClick={onAppearance} className="w-8 h-8 rounded-lg text-[#b5bac1] hover:bg-white/5 flex items-center justify-center" aria-label="Görünüm ve ses" title="Görünüm ve ses"><Palette size={16} /></button>
          <Btn tone="ghost" className="!py-1 !px-3 text-xs" onClick={() => setConfirmLeave(true)}><LogOut size={13} className="inline -mt-0.5 mr-1" />Çık</Btn>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {view ? (
          <Suspense fallback={<Loading text={`${g.name} yükleniyor`} />}>
            <View view={view} session={session} myId={myId} send={send} isHost={isHost} onRematch={rematch} onLobby={() => gamesActions.cmd({ k: "lobby" })} onLeave={() => gamesActions.leave()} />
          </Suspense>
        ) : <Loading text="Oyun durumu bekleniyor" />}
        {conn !== "ok" && <div className="absolute inset-x-0 top-0 bg-[#faa61a] text-black text-xs font-bold text-center py-1.5 z-30">Bağlantı kesildi — yeniden bağlanıyor</div>}
        <Reactions />
      </div>
      {confirmLeave && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="alertdialog" aria-label="Oyundan çık">
          <div className="max-w-sm w-full rounded-xl bg-[#25272a] border border-white/10 p-5 text-center">
            <div className="text-base font-bold text-white mb-1">Oyundan çıkılsın mı?</div>
            <p className="text-sm text-[#949ba4] mb-4">{isHost ? "Oturumu sen açtığın için kapanır ve herkes atılır." : "Oyun sensiz devam eder."}</p>
            <div className="flex gap-2 justify-center"><Btn tone="ghost" onClick={() => setConfirmLeave(false)}>Vazgeç</Btn><Btn tone="danger" onClick={() => { setConfirmLeave(false); gamesActions.leave(); }}>Çık</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

const Loading = ({ text }) => <div className="absolute inset-0 flex items-center justify-center text-[#949ba4] text-sm gap-2"><Gamepad2 size={16} className="animate-pulse" />{text}…</div>;

function useMyId() {
  const { localParticipant } = useLocalParticipant();
  return localParticipant?.identity;
}

// ───────────────────────────── Kabuk ─────────────────────────────
export default function GamesHub() {
  const { screen, detailId, session, go } = useGamesStore();
  const setOpen = useGamesStore((s) => s.setOpen);
  const myId = useMyId();
  const [showLook, setShowLook] = useState(false);
  const sg = session ? getGame(session.gameId) : null;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && !session && !showLook && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, showLook, setOpen]);
  useEffect(() => { if (session && screen === "store") go("room"); }, []); // eslint-disable-line

  const tab = (id, label) => (
    <button type="button" onClick={() => go(id)} aria-current={screen === id || (id === "store" && screen === "detail") ? "page" : undefined}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${screen === id || (id === "store" && screen === "detail") ? "bg-white/10 text-white" : "text-[#949ba4] hover:text-white hover:bg-white/5"}`}>{label}</button>
  );

  return (
    <div className="absolute inset-0 z-40 bg-[#1e1f22] flex flex-col" role="dialog" aria-label="Netrex Games">
      <header className="flex items-center gap-2 px-4 h-12 border-b border-white/5 shrink-0">
        <Gamepad2 size={18} className="text-[#6366f1] mr-1" />
        <span className="font-bold text-white mr-3 hidden sm:inline">Oyunlar</span>
        {tab("store", "Mağaza")}
        {tab("profile", "Profilim")}
        {session && sg && <button type="button" onClick={() => go("room")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1.5 ${screen === "room" ? "bg-white/10 text-white" : "text-[#23a559] hover:bg-white/5"}`}><span className="w-1.5 h-1.5 rounded-full bg-[#23a559]" />{sg.name}</button>}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setShowLook(true)} className="w-8 h-8 rounded-lg text-[#b5bac1] hover:bg-white/5 flex items-center justify-center" aria-label="Görünüm ve ses" title="Görünüm ve ses"><Palette size={16} /></button>
          <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg text-[#b5bac1] hover:bg-white/5 flex items-center justify-center" aria-label="Paneli kapat (oyun arka planda sürer)" title="Kapat — oyun arka planda sürer"><X size={16} /></button>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {screen === "store" && <StoreScreen />}
        {screen === "detail" && <DetailScreen id={detailId} />}
        {screen === "profile" && <Profile />}
        {screen === "room" && <Room myId={myId} onAppearance={() => setShowLook(true)} />}
      </main>
      {showLook && <Appearance onClose={() => setShowLook(false)} />}
    </div>
  );
}
