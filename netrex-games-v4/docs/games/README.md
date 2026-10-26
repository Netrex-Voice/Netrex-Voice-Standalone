# 🎮 Netrex Games

Ses odasının içinde oynanan, modüler çok oyunculu oyun katmanı. Kod: `src/modules/games/`. Ayarlar → Uygulama → **Netrex Games** ile kapatılabilir (kapalıyken hiçbir kod yüklenmez).

## Mimari (gerçekte uygulanan)

| Katman | Dosya | Not |
|---|---|---|
| Kayıt defteri | `registry.js` | Manifest + doğrulama; motor/arayüz dinamik import |
| Motorlar (saf mantık) | `engines/*.js` | `create / input / tick / view / playerLeft / isOver`; React/ağ yok, Node'da test edilir |
| Host çalışma zamanı | `runtime.js` | Lobi, yetki, hız/boyut sınırı, görünüm dağıtımı |
| Ağ köprüsü | `GamesHandler.jsx` | LiveKit data channel (`gm_*`), host döngüsü |
| Arayüz | `GamesHub.jsx`, `views/*`, `ui.jsx` | Mağaza, detay, lobi, oyun kabuğu |
| Durum | `store.js` | Oturum/görünüm + yerel kitaplık (favori, son oynanan) |

**Yetki modeli** (mevcut Tabletop modülüyle aynı): oturumu açan istemci (host) oyunun tek otoritesidir. Gönderen kimliği LiveKit'in imzaladığı Netrex kimliğidir; ayrı bir kimlik sistemi yoktur. İstemciler yalnızca niyet gönderir (`move`, `draw`, `discard`…); skor, kural, dağıtım ve zamanlayıcı host'ta hesaplanır.

## Gecikme gizleme (Air Hockey, Ping Pong)
Model: host-otoriteli skor + istemci tahmini + doğrulanmış vuruş iddiası ("vurana öncelik"). Kod: `netcode.js`, motorlarda `simulate / claimHit / fromView`.
1. **Kendi raketin** işaretçiyi anında izler (yerel); host'a 30 Hz, tek yön gecikme kadar ileri tahminle gider.
2. **Disk/top** aynı motorla yerelde ilerler. Kendi raketinle vuruşun anında görünür ve host'a `hit` iddiası gider.
3. Host **uzak oyuncunun raketiyle çarpışma hesaplamaz**; vuruş yalnızca iddiadan gelir ve şu sınırlarla doğrulanır: raket kendi alanında ve host kopyasına ≤110–120 px, disk host'taki diske ≤70–80 px + hız×0,25 sn, temas var, yeni hız raketten dışarı ve hız sınırı içinde, ≥80 ms aralık (pong: aynı taraf üst üste vuramaz). Ret nedeni `s.claimReject`'te.
4. Sunucu anlık görüntüsü (30 Hz, kayıplı kanal; host'a her tik) tek yön gecikme kadar ileri sarılır; fark fiziğe hemen, ekrana ~60 ms'de sönen ofsetle yansır. Kendi vuruşun onaylanana kadar (RTT + 120 ms) disk düzeltmesi bekletilir.
5. RTT 1,5 sn'de bir `gm_ping/gm_pong` ile ölçülür; oyun başlığında ms olarak görünür.
6. Konumlar React dışındaki `live` kanalından okunur; React yalnızca skor/faz değişince yeniden çizer.

**Ölçüm** (`__tests__/netcode.test.js`, yapay gecikmeli ağ, host 60 Hz, misafir 60 fps, 90 sn; metrik: misafirin çizdiği disk ile host'taki gerçek disk arasındaki mesafe):

| Senaryo | Tahminli p50 / p95 | Tahminsiz p50 / p95 | Vuruş iddiası kabul |
|---|---|---|---|
| Hockey, RTT 60 ms | 15.7 / 65.4 px | 40.3 / 73.5 px | 62/62 |
| Hockey, RTT 150 ms | 11.9 / 142.1 px | 92.2 / 146.5 px | 61/61 |
| Pong, RTT 120 ms | 4.3 / 19.3 px | 28.9 / 81.8 px | 10/10 |

p95'teki tepeler rakibin vuruş anlarıdır: rakibin vuruşu fiziksel olarak tek yön gecikmeden önce bilinemez; ofset yumuşatması bunu görsel olarak dağıtır. Tarayıcıda (headless Chromium, önizleme) iki gerçek zamanlı oyun 60 fps çizildi. **Ölçülmedi:** gerçek LiveKit ağında jitter/paket kaybı, düşük donanım.

**Güven sınırı değişikliği:** misafir kendi vuruşunu tolerans içinde "iddia" edebilir; hileci bir istemci yalnızca bu dar pencere içinde açı/hız seçebilir. Gol ve skor yine yalnızca host'ta belirlenir.

## İlerleme (oynattıkça oynatan katman)
`progress.js` (saf, testli): XP (galibiyet 100 / beraberlik 60 / katılım 35, sayı başı +6, seri bonusu, günün ilk galibiyeti +50, bot maçlarında ×0,6), seviye eğrisi (100 + 60×(n−1)), tarihe göre deterministik 3 günlük görev (+60 XP), 9 başarım (+100 XP). Seviye atladıkça masa, raket/disk rengi, Okey örtü/taş seti ve iz efektleri açılır (`themes.js` → `lvl`). Maç sonu kartında XP satırları, animasyonlu seviye çubuğu ve açılanlar gösterilir. Yalnızca kozmetik ve cihaz-yerel.


## 3B oyunlar ve fizik (v3)

Tüm fizik motorları **deterministik, saf JS** (yalnızca + − × ÷ ve `Math.sqrt`): host ve istemci aynı kodu çalıştırır; Node testleriyle doğrulanır. Görüntü three.js (0.186) ile **prosedürel** modellenir; dış asset indirilmez (lisans/boyut riski yok), dokular kalite kademesine göre 1024–4096 px üretilir.

| Oyun | Fizik modeli | Ağ modeli |
|---|---|---|
| Air Hockey | 2,0×1,0 m; disk Ø82,5 mm/25 g; yuvarlatılmış köşeli raylar (e 0,8, μ 0,22) ve raket (e 0,72) çarpışmasında Coulomb sürtünmesi → disk spini, spin sekme açısını değiştirir; hava yastığı sürtünmesi; raket ≤7 m/s, ≤120 m/s²; 480 Hz alt adım; 7 sn kuralı | İstemci tahmini + doğrulanmış vuruş iddiası (vurana öncelik), 60 Hz |
| Masa tenisi | ITTF ölçüleri; top Ø40 mm/2,7 g; yerçekimi + karesel direnç + Magnus (ω×v); masa sekmesi e 0,9 + sürtünme (30 cm → ~23 cm sekme); file gövdesi/teli; destekli temas (raket hız vektörü + temas noktası → güç/falso/yön, dikey hız çözücüyle) | Tahmin + iddia; iddiada yalnızca raket durumu gelir, çıkışı host **kendisi** hesaplar |
| Bilardo | 8 ft masa; top Ø57,15 mm/170 g; kayma (μs 0,2) → yuvarlanma (μr 0,01); ıstaka ofsetinden takip/stop/geri çekme ve yan falso; bant sürtünmesi; çeneli cep ağızları; 960 Hz | Sıra tabanlı: vuruş parametreleri gönderilir, herkes aynı fiziği yerelde 60 fps oynatır (JSON çift duyarlıklıyı birebir taşır → bit bit aynı); bitişte host'un kesin konumları |
| Emlak | Zarlar Rapier ile gerçek fizik; sonuç host RNG'si; zarın yüz numaralandırması küpün 24 simetrisinden seçilir → üst yüz host'un sayısı (12 000 durumda doğrulandı) | Sıra tabanlı, durum olaylı |

**Bilardo kuralları:** WPA tarzı 8 top: açılış, açık masa, ilk geçerli sokuşla grup, faul (beyaz cebe, temas yok, yanlış ilk temas, temastan sonra bant yok) → rakibe elde top (açılışta baş çizgisi gerisi), 8'i grubu bitirmeden/faulle sokmak kaybettirir, açılışta 8 ayak noktasına döner. **Uygulanmayan:** cep söyleme, masse/zıplatma vuruşu.

**Emlak kuralları:** 32 kare özgün İstanbul tahtası; satın al/ihale; grup tamamsa iki kat kira; eşit ev kurma, 32 ev/12 otel stoğu; ipotek (%50, kaldırma %10 faiz); gözaltı (Polis karesi, 3 çift, kart; 50 ceza / çift / kart); takas (nakit + evsiz arsalar); borç → satış/ipotek ya da iflas (varlıklar alacaklıya); tur sınırı 15/25/40/60 (sınırsız yok — her oyun biter). Botlar alır, kurar, grup tamamlamak için takas teklif eder.

## Performans stratejisi (60 fps hedefi)
- **Uyarlanabilir kalite** (`three/kit.js`): GPU'dan başlangıç kademesi (Düşük/Orta/Yüksek/Ultra), sonra gerçek kare süresi: 2 sn ortalaması 17,2 ms'yi aşarsa önce piksel oranı, sonra gölge çözünürlüğü düşer; 6 sn boyunca <11 ms ise çıkar. Görünüm → Grafik ile sabitlenebilir; FPS göstergesi açılabilir.
- Sahne başına **tek gölgeli ışık**; statik parçalar malzemeye göre birleştirilir (bilardo 143 → ~55 çizim çağrısı); ev/otel/sahiplik işaretleri `InstancedMesh`; düşük kademede cilasız malzeme.
- Fizik maliyeti (Node ölçümü): hockey ~0,4 ms / oyun-saniyesi; masa tenisi ~2 ms; bilardo açılış vuruşunun tamamı 27 ms (bir kez).
- **Ölçülmedi:** gerçek GPU'larda kare hızı. Bu ortamın yazılım renderer'ı (SwiftShader) tutarsız değerler verdi; doğrulama oyun içi FPS göstergesiyle gerçek cihazda yapılmalı.

## Özelleştirme, lobi ve profil
- **Kurallar** (lobi, yalnızca host): manifest `config` şemasından üretilir (`select`, `toggle`, `text`, `area`); ağdan gelen değer `cleanConfig` ile süzülür. Hockey: hedef, kale genişliği, raket boyutu, disk hızı. Ping Pong: hedef, 2 fark şartı, servis sıklığı, top hızı. Tabu: süre, tur, pas, doğru/tabu puanı, takım adı/rengi, özel kart havuzu (satır başına `Kelime: yasak1, yasak2, yasak3`). Okey: hamle süresi (dolunca bot oynar), bitirme ipucu.
- **Lobi**: hazır durumu (host başlatmadan herkes hazır olmalı), herkese açık / sadece davetli erişim, odadaki kişilere davet (bildirim + Katıl), takım seçimi, emoji tepkileri (izinli liste, kişi başı 1/sn).
- **Görünüm** (cihazda saklanır, anında uygulanır): masa/raket/disk renkleri, Okey örtü ve taş seti, ses seviyesi.
- **Profil**: oyun başına maç/galibiyet/mağlubiyet/seri ve son 30 maç. Veriler yalnızca bu cihazdadır (localStorage); hesaba bağlı kalıcı istatistik için Firestore yazması ve kural değişikliği gerekir, yapılmadı.

## Oturum yaşam döngüsü
`lobby → playing → over → (rövanş: lobby → playing)`. Odada aynı anda tek oturum. Katılım: odadaki herkes lobiye katılabilir; koltuk dolu ya da oyun başlamışsa izleyici (görünüm alır, girdi gönderemez). Aynı kimlik ikinci kez katılamaz. Host ayrılırsa oturum kapanır; oyuncu ayrılırsa Okey'de yerini bot alır, Air Hockey/Ping Pong'da hükmen biter, Tabu'da tur biter/oyun biter. 30 dk hareketsiz oturum kapanır. Yeniden bağlanan istemci `gm_ask` ile lobi ve kendi durumunu geri alır (`HostSession.resync`).

## Güvenlik
- Gizli durum yalnızca host nesnesinde; `engine.view(state, pid)` kişiye özel: Okey'de yalnızca kendi eli (yığın/rakip elleri asla gitmez, bitince eller açılır), Tabu'da kart yalnızca anlatıcı + rakip takım. Hiçbir `gm_state` tüm odaya yayınlanmaz (testle doğrulanır).
- Her hamle motorda doğrulanır (sıra, sahiplik, permütasyon, bitirme `canWin`), istemci değerleri `clamp/finite` ile sınırlanır.
- Mesaj ≤ 2 KB, gönderen başına ≤ 90 mesaj/sn, izleyici ≤ 30, konfigürasyon manifest şemasına göre temizlenir.
- Lobi mesajı yalnızca `hostId === gönderen` ise kabul edilir. Sadece host başlat/ayar/bot/at yetkisine sahip.
- Üçüncü taraf kod YÜKLENMEZ. Mağazadaki her şey repodaki birinci taraf modüldür.
- **Güven sınırı:** host kötü niyetliyse kendi oyununu manipüle edebilir (host-otoriteli modelin doğası); gizli bilgi sunucuda değil host istemcisindedir. Bu, Tabletop modülüyle aynı modeldir; sunucu-otoriteli çalışma zamanı ancak ayrı bir oyun sunucusuyla mümkündür.

## Oyunlar ve kurallar
- **Air Hockey**: 800×440, 240 Hz alt adım, disk hızı ≤ 1500 (ayarlı), raket ≤ 1400 px/sn (bot ≤ 1050×seviye), duvar sekmesi %8 enerji kaybı, direkler, hedef skor ayarlı. Disk bir yarıda 7 sn'den uzun kalırsa rakibe geçer.
- **Ping Pong**: yandan 2B fizik. Servis önce kendi masana, sonra rakibe sekmeli; rakip tarafta 2. sekme vuranın sayısı; kendi tarafına dönen/dışarı giden top rakibe sayı; aynı taraf arka arkaya vuramaz; hedef + 2 fark; her 2 sayıda servis değişir (deuce'ta her sayıda).
- **Tabu**: iki takım, tur süresi/tur sayısı/pas hakkı ayarlı. Doğru +1, Tabu −1 (yalnızca rakip takım basar), Pas sınırlı. Kelime havuzu `tabletop/tabuGame.js` içindeki özgün Türkçe kartlardır (83 kart).
- **Okey (standart 4 kişilik)**: 106 taş (104 + 2 sahte), gösterge, okey = gösterge+1 (13→1), sahte okey okeyin yüzünü taşır, 15/14/14/14 dağıtım + 48 yığın, başlayan çekmeden atar, diğerleri yığından ya da solundaki atıktan çeker. Bitirme: 14 taş tamamen geçerli seri (≥3 ardışık, 12-13-1 geçerli, 13-1-2 geçersiz) / grup (3–4 farklı renk). **Uygulanmayan:** çifte gitme, el puanlaması, 101 varyantı (o ayrı Tabletop modülündedir).

## Yeni oyun ekleme (5 adım)
1. `engines/<id>.js`: `create({players, config, rng})`, `input(s,pid,m)→bool`, `tick(s,dt)`, `view(s,pid)`, `playerLeft(s,pid)`, `isOver(s)`; gizli bilgi yalnızca `view` içinde süzülür.
2. `views/<Id>View.jsx`: `{view, session, myId, send, isHost, onRematch, onLobby, onLeave}` alır; bitişte `EndCard` gösterir.
3. `registry.js`: manifest ekle (`validateManifest` testi otomatik kapsar).
4. `__tests__/`: kural, gizlilik ve bot-bot maç testleri.
5. `npm run test:games` ve `NEXT_PUBLIC_BUILD_TARGET=web npm run build`.

## Testler
`npm run test:games` (Node yerleşik test koşucusu, bağımlılık yok): fizik/skor kuralları, Okey taş korunumu ve `canWin`, Tabu gizliliği, lobi yetkisi, hız sınırı, kişiye özel görünüm, yeniden senkron, gönderim sıklığı.

## Performans notları (ölçülmüş / ölçülmemiş)
- Ölçülen: motor testleri 600 sn'lik bot maçını < 0,5 sn'de koşturur (CPU maliyeti ihmal edilebilir). Hockey durumu ≈ 150–200 B/kare, 20 Hz → oyuncu başına ≈ 4 KB/s.
- **Ölçülmedi:** gerçek ağda gecikme/jitter, tarayıcıda 60 fps çizim, çok sayıda eşzamanlı oturum. Host sekmesi arka plana alınırsa `setInterval` kısıtlanır ve simülasyon yavaşlar (dt 0,1 sn ile sınırlı).
- Ölçeklenme: oturumlar LiveKit odasına bağlı ve host belleğinde; veritabanı yazması yoktur. Yatay ölçek zaten oda başınadır; sunucu-otoriteli çalışma zamanı gerekirse ayrı bir oyun sunucusu ve oturum koordinasyonu (Redis vb.) gerekir.

## Bilinen sınırlar
- Oyunlar için maç sonucu kalıcı kaydedilmiyor (yalnızca yerel kitaplık sayaçları). "Popüler" sıralaması yok: gerçek kullanım verisi toplanmadığı için uydurulmadı.
- Oyun içi sesli sohbet Netrex'in mevcut LiveKit sesidir; oyun ayrı bir ses oturumu açmaz. Oyun sesleri (kısa bipler) kabuktaki düğmeyle kapatılır.
- Okey: yalnızca standart, çiftsiz, puansız tek el. Tabu'da bot yok.

## Tabletop Sandbox yol haritası
Mevcut `src/modules/tabletop` (Rapier + three.js) zaten nesne senkronizasyonuna sahip. Sonraki adım: onu bir `engines/tabletop.js` + `views/TabletopView.jsx` olarak bu manifest sistemine bağlamak (lobi, izleyici, bot dışı), kart/zar/token şemalarını `view(s,pid)` ile sahibine göre süzmek (özel eller), kaydet/yükle için mod formatını (`modFormat.js`) kullanmak. Üçüncü taraf paketler yalnızca *veri* (mod JSON) olarak ve şema doğrulamasıyla; çalıştırılabilir kod olarak asla.
