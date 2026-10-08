# RelayFS

P2P gerçek zamanlı dosya senkronizasyon uygulaması. İki bilgisayar arasında oda kodu ile bağlanın, dosyalar karakter düzeyinde anlık senkronize olsun.

---

## İndir

**[RelayFS_0.1.0_x64-setup.exe — Windows Kurulum Dosyası](https://github.com/EmreYalavuc/RelayFS/releases/tag/v0.1.0)**

> Windows 10/11 x64 gerektirir.

---

## Mimari

### Genel Bakış

```
┌─────────────────────┐        WebRTC (P2P)        ┌─────────────────────┐
│       Host PC       │ ◄─────────────────────────► │      Guest PC       │
│                     │                              │                     │
│  Disk  →  Yjs Doc  │    y-webrtc / y-websocket   │  Yjs Doc  →  Disk  │
│  Watcher  (CRDT)   │ ◄─────────────────────────► │  (CRDT)   Observer  │
└─────────────────────┘                              └─────────────────────┘
         ▲                   Signaling                        ▲
         │            wss://signaling.yjs.dev                 │
         │            wss://y-webrtc-eu.fly.dev               │
         │                                                     │
         └──────── Relay Fallback: wss://demos.yjs.dev ───────┘
```

### Teknoloji Katmanları

| Katman | Teknoloji | Görev |
|--------|-----------|-------|
| **Masaüstü Kabuk** | Tauri v2 (Rust) | Pencere yönetimi, dosya sistemi erişimi, yerel komutlar |
| **Arayüz** | React + TypeScript + Tailwind CSS | UI bileşenleri, state yönetimi |
| **CRDT Senkronizasyon** | Yjs | Çakışmasız çift yönlü veri senkronizasyonu |
| **P2P Taşıma** | y-webrtc (WebRTC) | Doğrudan peer-to-peer veri aktarımı |
| **Relay Fallback** | y-websocket | NAT geçişi yapılamayan durumlarda WebSocket üzerinden senkronizasyon |
| **State Yönetimi** | Zustand | Uygulama geneli reaktif state |

---

### Bileşen Mimarisi

```
src/
├── App.tsx                    — Uygulama kök bileşeni, oturum yönetimi
│
├── hooks/
│   ├── useYjs.ts              — Yjs Doc + WebRTC/WebSocket provider yaşam döngüsü
│   ├── useFileSync.ts         — Disk ↔ Yjs CRDT köprüsü (çift yönlü)
│   └── useWatcher.ts          — Tauri dosya sistemi değişiklik dinleyici
│
├── store/
│   └── syncStore.ts           — Zustand global state (bağlantı, peers, log, peer kimliği)
│
├── components/
│   ├── SetupView.tsx          — Oturum başlatma ekranı (host / join)
│   ├── ConnectionPanel.tsx    — Ana kontrol paneli (host/guest oturumunda)
│   ├── GuestLobbyView.tsx     — Guest bağlanma lobisi, dosya indirme ilerleme barı
│   ├── FileExplorer.tsx       — Windows tarzı iki panelli dosya gezgini
│   ├── FilePreview.tsx        — Syntax-highlighted kod önizleme + SVG render
│   ├── ContextMenu.tsx        — Sağ tık bağlam menüsü
│   ├── HistoryPanel.tsx       — Kalıcı değişiklik geçmişi paneli
│   ├── ActivityTerminal.tsx   — Oturum içi canlı aktivite terminali
│   ├── ConflictPanel.tsx      — Çakışma çözüm arayüzü
│   └── ...diğer yardımcı bileşenler
│
└── types.ts                   — Ortak TypeScript tip tanımları
```

---

### Senkronizasyon Akışı

#### Yerel Değişiklik → Karşı Tarafa

```
1. Tauri FileWatcher  →  disk değişikliğini algılar
2. useFileSync        →  dosyayı okur, Y.Text üzerine karakter-diff uygular (applyTextDiff)
3. Yjs CRDT           →  değişikliği encode edip WebRTC data channel'a yazar
4. Karşı peer         →  Yjs update'i alır, observeDeep tetiklenir
5. useFileSync        →  Y.Text içeriğini okur, write_file_atomic ile diske yazar
```

#### Karakter Düzeyinde Diff (applyTextDiff)

Dosyanın tamamı yerine yalnızca değişen kısım gönderilir:

```
Eski: "Hello World"
Yeni: "Hello Rust"
        ↓
Ortak prefix: "Hello " (6 karakter)
Ortak suffix: "" 
Sadece "World" → "Rust" değişimi iletilir
```

Bu sayede büyük dosyalarda bile ağ üzerinden minimal veri aktarılır.

---

### Peer Kimliği ve Değişiklik Geçmişi

Her kurulumda `localStorage`'a kalıcı bir `peerId` (UUID) yazılır. Bağlantı kurulduğunda bu kimlik, makine adı ve yerel IP adresiyle birlikte y-webrtc **awareness** kanalı üzerinden karşı tarafa yayınlanır.

```typescript
// Awareness state (her peer yayınlar)
{
  user: {
    name: "Host" | "Guest",
    peerId: "a3f2b8c1...",       // localStorage UUID
    peerName: "DESKTOP-EMRE",    // COMPUTERNAME
    peerIp: "192.168.1.5"        // Birincil ağ arayüzü IP'si
  }
}
```

Her dosya değişikliği bu meta verilerle birlikte `%APPDATA%\RelayFS\history.jsonl` dosyasına eklenir (JSONL formatı — satır başına bir JSON kaydı). Uygulama kapatılıp açılsa bile geçmiş korunur.

---

### Rust Komutları (Tauri IPC)

| Komut | Açıklama |
|-------|----------|
| `start_watching` | Proje klasörünü izlemeye başlar, dosya sayısını döner |
| `stop_watching` | İzlemeyi durdurur |
| `list_project_files` | `.gitignore` / `.relayfsignore` dahil metin dosyalarını listeler |
| `read_file` | Dosya içeriğini string olarak okur |
| `write_file_atomic` | Geçici dosya → rename ile atomik yazma |
| `delete_file` | Dosyayı diskten siler |
| `ensure_dir` | Klasör ve ebeveynleri oluşturur |
| `reveal_in_explorer` | Dosya/klasörü Windows Explorer'da açar |
| `open_in_vscode` | Dosyayı VS Code'da açar |
| `open_file_default` | Sistemin varsayılan uygulamasıyla açar |
| `get_file_meta` | Dosya boyutu ve son değiştirilme zamanını döner |
| `get_local_info` | Makine adı ve yerel IP adresini döner |
| `load_history` | `history.jsonl` dosyasını satır satır okur |
| `append_history` | Geçmiş dosyasına yeni kayıt ekler |
| `clear_history` | Geçmiş dosyasını siler |

---

### Önemli Tasarım Kararları

**Neden sadece metin dosyaları?**
Yjs'in Y.Text yapısı UTF-8 string üzerine kuruludur. PNG, MP4 gibi binary dosyalar base64'e çevrilmeden taşınamaz. 512KB üzeri dosyalar da kasıtlı olarak dışlanmıştır — CRDT geçmişi bellekte tutulduğundan büyük dosyalar bellek sorununa yol açar. İki tarafta da proje zaten mevcutsa, sadece yapılan metin değişiklikleri senkronize edilir; bu da 700MB'lık bir projeyi birkaç KB/s ile güncel tutmayı mümkün kılar.

**Neden observeDeep?**
`Y.Map.observe` yalnızca anahtar ekleme/silme olaylarını tetikler. Bir `Y.Text`'in içeriği `applyTextDiff` ile değiştirildiğinde `observe` tetiklenmez, `observeDeep` tetiklenir. Bu farkı gözden kaçırmak konuk tarafında hiçbir içerik değişikliğinin diske yazılmamasına neden olur.

**Neden WebSocket relay?**
Farklı ağlardaki (farklı Wi-Fi, mobil bağlantı) iki bilgisayar STUN sunucularına rağmen doğrudan WebRTC bağlantısı kuramayabilir (simetrik NAT). `wss://demos.yjs.dev` relay sunucusu bu durumda devreye girer; WebRTC başarısız olsa bile senkronizasyon kesintisiz devam eder.

---

## Geliştirme Ortamı

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run tauri dev

# Production build al
npm run tauri build
```

**Gereksinimler:** Node.js 18+, Rust 1.75+, Tauri CLI v2

---

## Lisans

MIT
