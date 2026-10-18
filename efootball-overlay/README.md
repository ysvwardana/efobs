# eFootball TikTok LIVE Stream Overlay (9:16 Portrait)

Template overlay streaming eFootball resolusi **1080 × 1920 (9:16 portrait)** yang didesain khusus untuk **TikTok LIVE Studio**, **OBS Studio**, dan **Prism Live Studio**.

---

## Fitur Utama

1. **Resolusi Asli 1080 × 1920 (Portrait 9:16)**
   - Sesuai standar vertikal TikTok LIVE tanpa distorsi atau stretch.
2. **Area Gameplay 16:9 Transparan Penuh**
   - Area di tengah berukuran 16:9 dengan background transparan murni (`alpha = 0`) agar sumber tangkapan game (*Game Capture* / *Window Capture*) tampil jernih.
   - Frame esports futuristik dengan sudut chamfer, aksen neon cyan-biru, dan pelari geometris kuning elektrik.
3. **Desain Atmosfer Stadion eFootball**
   - **Header (Atas)**: Struktur atap stadion dengan lampu tembak (*floodlights*), sinar volumetrik (*volumetric light beams*), debu atmosfer (*atmospheric dust*), dan aksen grafis diagonal kuning (*volt yellow speed slashes*).
   - **Footer (Bawah)**: Tribun penonton dengan atmosfer biru stadion, lampu sorak penonton (*crowd sparkle lights*), dan area kosong gelap yang lapang agar chat asli TikTok LIVE terbaca jelas tanpa tabrakan visual.
4. **Ringan & Hemat GPU (Compositor-Only Animations)**
   - Menggunakan CSS3 hardware-accelerated animations (`transform`, `opacity`, `filter`).
   - Tidak membebani PC saat bermain game eFootball sambil live streaming.
5. **Konfigurasi Terpusat via URL Parameters & JavaScript**
   - Kustomisasi warna, intensitas cahaya, kecepatan animasi, ukuran frame, dan toggle efek secara instan.
6. **Bebas Elemen Mengganggu**
   - Tanpa watermark, tanpa teks placeholder, tanpa tombol atau panel kontrol palsu di layar streaming.

---

## Struktur Folder

```text
efootball-overlay/
├── index.html                 # File HTML utama (buka di browser atau jadikan Browser Source)
├── css/
│   └── style.css              # Styling tata letak, warna, frame, dan animasi keyframe
├── js/
│   └── main.js                # Engine konfigurasi dan partikel atmosfer debu stadion
├── assets/
│   ├── stadium/
│   │   ├── roof_lights.jpg    # Aset tekstur atap stadion & lampu sorot
│   │   └── crowd_stands.jpg   # Aset tekstur tribun penonton malam hari
│   └── decorations/
│       ├── slashes.svg        # Aksen grafis diagonal kuning elektrik
│       ├── frame_runner_top.svg
│       ├── frame_runner_bottom.svg
│       └── corner_bracket.svg
└── README.md
```

---

## Panduan Penggunaan di OBS Studio

### Metode 1: Menggunakan Local File (Direkomendasikan)
1. Buka **OBS Studio**.
2. Pastikan resolusi Canvas OBS Anda adalah **1080 × 1920** (Settings -> Video -> Base Canvas Resolution: `1080x1920`).
3. Pada panel **Sources (Sumber)**, klik tombol `+` lalu pilih **Browser**.
4. Beri nama sumber, misalnya `eFootball Overlay`.
5. Centang kotak **Local file**.
6. Klik **Browse** dan arahkan ke file `efootball-overlay/index.html`.
7. Masukkan pengaturan:
   - **Width**: `1080`
   - **Height**: `1920`
   - Centang **Shutdown source when not visible** dan **Refresh browser when scene becomes active**.
8. Klik **OK**.
9. Susun urutan sumber di OBS:
   ```text
   [Sources OBS]
   1. eFootball Overlay (Paling Atas)
   2. eFootball Game Capture / Window Capture (Tepat di Tengah)
   3. Kamera / Facecam (Opsional)
   ```

### Metode 2: Menggunakan URL Server / Web Hosted
Jika overlay di-host pada server lokal atau cloud:
1. URL: `http://localhost:3000/?stream=1` (atau alamat URL hosting Anda).
2. Width: `1080`, Height: `1920`.

---

## Panduan Penggunaan di TikTok LIVE Studio

1. Buka **TikTok LIVE Studio**.
2. Pilih format layout **Portrait (9:16)**.
3. Klik tombol **Add Source (+)** -> pilih **Link / Web (Browser Source)**.
4. Masukkan URL overlay atau arahkan ke file `index.html`.
5. Atur resolusi: **Width 1080**, **Height 1920**.
6. Tambahkan sumber **Game Capture** eFootball di lapisan tepat di bawah overlay.
7. Posisikan gameplay eFootball agar pas di dalam frame tengah 16:9.
8. Area chat bawaan TikTok LIVE otomatis akan menempati bagian bawah layar (area tribun stadion gelap), sehingga komentar penonton mudah dibaca.

---

## Parameter Konfigurasi URL (Kustomisasi Instan)

Anda dapat menambahkan parameter URL pada Browser Source OBS:

| Parameter | Default | Keterangan | Contoh |
| :--- | :--- | :--- | :--- |
| `primary` | `#0052ff` | Warna biru utama stadion | `?primary=%230040dd` |
| `accent` | `#ffe600` | Warna kuning aksen grafis | `?accent=%23ffea00` |
| `glow` | `#00d4ff` | Warna cyan neon rim | `?glow=%2300f0ff` |
| `light` | `1.0` | Intensitas efek cahaya stadion (0.0 s/d 1.5) | `?light=1.2` |
| `speed` | `1.0` | Kecepatan animasi (0.5 = lambat, 1.5 = cepat) | `?speed=0.8` |
| `beams` | `1` | Mengaktifkan/menonaktifkan sinar lampu stadion (1 / 0) | `?beams=0` |
| `slashes`| `1` | Mengaktifkan aksen diagonal kuning (1 / 0) | `?slashes=0` |
| `crowd` | `1` | Mengaktifkan kilau lampu penonton (1 / 0) | `?crowd=1` |
| `particles`| `1` | Mengaktifkan partikel debu stadion (1 / 0) | `?particles=1` |
| `simulator`| `0` | Menampilkan panduan lapangan hijau untuk kalibrasi posisi game | `?simulator=1` |

**Contoh URL Kustom Lengkap:**
```text
index.html?primary=%230052ff&accent=%23ffe600&light=1.2&speed=1.0
```

---

## Tombol Pintas Keyboard (Live Streamer Hotkeys)

Overlay ini mendukung kontrol langsung melalui keyboard (saat mode interaksi aktif di OBS atau browser):

| Tombol | Fungsi Efek | Keterangan |
| :---: | :--- | :--- |
| **`G`** | **Goal Celebration Strobe FX** | Gelombang kilau emas & strobo lampu stadion spektakuler saat mencetak gol (3.2 detik). |
| **`F`** | **Instant Stadium Flash** | Strobo kilat lampu sorot stadion instan (450ms). |
| **`L`** | **Toggle Lampu Stadion** | Menyalakan atau mematikan sinar lampu tembak stadion (*volumetric beams*). |
| **`[`** | **Redupkan Lampu (-10%)** | Menurunkan intensitas cahaya stadion secara bertahap. |
| **`]`** | **Terangkan Lampu (+10%)** | Menaikkan intensitas cahaya stadion secara bertahap. |
| **`B`** | **Toggle Frame Neon Glow** | Menghidupkan/mematikan efek bernapas (*breathing*) pada frame gameplay. |
| **`S`** | **Toggle Slashes Kuning** | Menampilkan/menyembunyikan aksen grafis diagonal kuning di pojok kanan atas. |
| **`P`** | **Toggle Panduan Lapangan** | Menampilkan visual lapangan 16:9 hijau untuk kalibrasi penempatan game eFootball. |
| **`1` - `4`**| **Preset Tema Warna** | `1`: Official Volt, `2`: Cyber Cobalt, `3`: Electric Cyan, `4`: Tournament Night. |
| **`C`** | **Toggle Panel Konfigurasi** | Membuka/menutup panel Studio (saat menggunakan web app). |

---

## Mengapa Hotkey Tidak Jalan di OBS? (Penyebab & Solusi)

Jika tombol seperti `G` (Goal FX) atau `F` (Flash) ditekan saat OBS terbuka tetapi tidak merespons, **itu bukan bug**, melainkan aturan keamanan bawaan OBS Studio:

> **Penyebab:**
> OBS **Browser Source** adalah peramban sandbox terisolasi. Sistem operasi dan OBS Studio **secara default TIDAK meneruskan tombol keyboard global** ke Browser Source saat Anda sedang aktif fokus pada game eFootball / emulator / aplikasi lain.

### 3 Solusi Praktis yang Dipakai Streamer:

1. **Solusi 1: Fitur "Interact" di OBS (Paling Cepat untuk Uji Coba)**
   - Di daftar *Sources* OBS, klik kanan pada source `Browser Source` overlay Anda.
   - Pilih **Interact** (atau **Berinteraksi**).
   - Jendela interaksi akan terbuka. Klik ke dalam jendela tersebut sekali, lalu tekan tombol keyboard (`G`, `F`, `L`, `1-4`). Semua efek lampu langsung berjalan!

2. **Solusi 2: Pasang Panel Sebagai Custom Browser Dock di OBS (Rekomendasi Utama)**
   - Di OBS Studio, buka menu atas: **Docks** &rarr; **Custom Browser Docks...**
   - Masukkan **Dock Name**: `eFootball Remote`
   - Masukkan **URL**: `http://localhost:3000/?view=panel` (atau link share aplikasi).
   - Klik **Apply**.
   - Jendela kontrol akan langsung disematkan di dalam OBS Studio Anda (seperti jendela Audio Mixer atau Scene Transitions). Anda dapat mengklik tombol **Goal Celebration**, **Strobe Flash**, slider kecerahan, atau ganti tema kapan saja menggunakan mouse tanpa takut bentrok hotkey dengan game!

3. **Solusi 3: Jadikan HP / Tablet Sebagai Remote Touchpad (Stream Deck Gratis)**
   - Buka browser Chrome/Safari di HP atau tablet Anda yang terhubung satu Wi-Fi dengan PC.
   - Buka URL panel: `http://[IP-KOMPUTER-ANDA]:3000/?view=panel` (atau link preview).
   - Layar HP Anda kini menjadi panel sentuh seperti Elgato Stream Deck! Saat Anda mencetak gol di eFootball, cukup sentuh tombol **[GOAL FX]** di layar HP dengan satu jari tanpa perlu alt-tab.

---

Overlay menyediakan objek global `window.eFootballOverlay`:

```javascript
// Membaca konfigurasi aktif
console.log(window.eFootballOverlay.getConfig());

// Memperbarui konfigurasi secara dinamis
window.eFootballOverlay.updateConfig({
  primaryColor: '#0033cc',
  accentColor: '#ffd700',
  lightIntensity: 1.2,
  animationSpeed: 1.0,
  enableStadiumLights: true,
  enableDiagonalSlashes: true
});

// Menampilkan/menyembunyikan panduan lapangan kalibrasi
window.eFootballOverlay.toggleSimulator();
```

---

## Tips Streaming eFootball Optimal

1. **Aspect Ratio 16:9**: Di dalam game eFootball PC, gunakan resolusi standar 16:9 (1920×1080 atau 2560×1440).
2. **Kesesuaian di OBS**: Di OBS Studio, klik kanan sumber Game Capture eFootball -> *Transform* -> *Center to Screen*. Sesuaikan ukuran agar tepat mengisi batas dalam frame neon eFootball overlay.
3. **Akselerasi Perangkat Keras**: Pastikan fitur hardware acceleration browser source di OBS aktif untuk performa render 60 FPS yang mulus.
