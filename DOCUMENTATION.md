# LEMON Olimpiade - Dokumentasi Teknis Lengkap

**Proyek**: Sistem Manajemen Ujian Olimpiade Indonesia  
**Tanggal**: 19 November 2026  
**Versi**: 1.0  
**Status**: Sistem lengkap telah dianalisis & didokumentasikan

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Gambaran Proyek](#gambaran-proyek)
3. [Alur Kerja Lengkap](#alur-kerja-lengkap)
4. [Struktur File & Arsitektur](#struktur-file--arsitektur)
5. [Stack Teknis](#stack-teknis)
6. [Skema Database](#skema-database)
7. [Titik Integrasi API](#titik-integrasi-api)
8. [Alur Pengguna](#alur-pengguna)
9. [Alat Admin](#alat-admin)
10. [Keamanan & Proctoring](#keamanan--proctoring)
11. [Daftar Periksa Deployment](#daftar-periksa-deployment)

---

## RINGKASAN EKSEKUTIF

**LEMON** adalah platform ujian berbasis web untuk kompetisi olimpiade sekolah menengah Indonesia dengan tiga kategori: **IPA (Sains)**, **IPS (Studi Sosial)**, dan **Matematika**.

### Statistik Kunci:
- **39 pengguna uji** (14 IPA + 13 IPS + 12 Matematika)
- **12 file HTML** (3 kategori ujian × 4 halaman masing-masing)
- **30 soal per ujian** (pilihan ganda A-E)
- **Durasi ujian 60 menit**
- **Tanpa ketergantungan eksternal** (vanilla JavaScript)

### Tipe Arsitektur:
- **SPA Berbasis Frontend** (Single Page App)
- **Penyimpanan Sisi Klien** (sessionStorage + localStorage)
- **Integrasi Backend Opsional** (endpoint POST dapat dikonfigurasi)
- **Proctoring Diaktifkan** (mode layar penuh, deteksi perpindahan tab)

---

## GAMBARAN PROYEK

### Tujuan Sistem:
1. Menyediakan lingkungan ujian yang aman dan bebas gangguan
2. Menegakkan integritas melalui verifikasi foto & janji integritas
3. Mencatat pelanggaran proctoring (perpindahan tab, keluar layar penuh)
4. Menyimpan hasil secara lokal dengan opsi pengiriman jauh
5. Mendukung ketiga kategori ujian dengan alur kerja identik

### Browser yang Didukung:
- Chrome (terbaru)
- Firefox (terbaru)
- Edge (terbaru)

### Dukungan Perangkat:
- Desktop/Laptop
- Tablet (desain responsif)
- Mobile (terbatas, antarmuka ujian dioptimalkan untuk lanskap)

---

## ALUR KERJA LENGKAP

### Fase 1: Login (index.html)
```
Input Pengguna
  ↓
[Nama Lengkap] → Dinormalisasi, pencocokan tidak peka huruf besar-kecil
[Password] → Pencocokan tepat (peka huruf besar-kecil)
[Lomba] → Tombol radio: IPA / IPS / MATEMATIKA
  ↓
Pencarian CONFIG.users[]
  ↓
LULUS → Sesi dibuat (sessionStorage)
GAGAL → Pesan kesalahan, coba lagi diperbolehkan
  ↓
Pengalihan ke beranda-[LOMBA].html
```

**Kunci Sesi Dibuat:**
- `peserta_login_user` → nama pengguna
- `peserta_login_profil` → JSON {nama, sekolah, lomba, username}

---

### Fase 2: Dasbor (beranda-[LOMBA].html)
```
Muat profil peserta dari sesi
  ↓
Tampilkan info ujian (durasi, soal, aturan)
  ↓
Bagian Verifikasi Foto
  ├─ Formulir unggah (drag-drop atau pemilih file)
  ├─ Cadangan webcam (getUserMedia)
  └─ Pratinjau dengan opsi ubah/hapus
  ↓
Janji Integritas (Pakta Integritas)
  ├─ Teks Arab
  ├─ Konfirmasi kotak centang
  └─ Tidak dapat melanjutkan sampai dicentang
  ↓
Tombol [Mulai Ujian]
  ├─ DINONAKTIFKAN sampai foto terverifikasi + janji ditandatangani
  ├─ SAAT DIKLIK → Pengalihan ke ujian-[LOMBA].html
  └─ Stempel waktu mulai dicatat
```

**Fitur:**
- Subjudul kategori dinamis (Olimpiade IPA/IPS/Matematika)
- Panel info peserta (nama, sekolah)
- Sistem tutorial (tur interaktif)
- Tata letak responsif (ramah mobile)

---

### Fase 3: Ujian (ujian-[LOMBA].html)
```
Inisialisasi keadaan ujian
  ├─ Muat soal dari larik SOAL (dikodekan keras)
  ├─ Periksa localStorage untuk sesi sebelumnya
  ├─ Kembalikan jawaban jika melanjutkan
  └─ Mulai timer (60 menit)
  ↓
Antarmuka Ujian
  ├─ Bilah Samping Kiri
  │  ├─ Nama ujian
  │  ├─ Timer (HH:MM:SS)
  │  ├─ Kisi soal (1-30, berwarna-kode)
  │  └─ Info peserta
  │
  └─ Panel Utama
     ├─ Navigasi soal (tombol Prev/Next)
     ├─ Tampilan nomor soal
     ├─ Tag kategori (Biologi, Kimia, dll.)
     ├─ Teks soal (dengan pembungkusan teks)
     ├─ 5 tombol radio opsi (A-E)
     ├─ Tombol hapus pilihan
     └─ Penghitung kemajuan (X/30 terjawab)
  ↓
Monitor Proctoring
  ├─ Deteksi perpindahan tab → penghitung pelanggaran
  ├─ Keluar layar penuh → dialog peringatan
  ├─ Pelanggaran maksimal (5) → pengiriman otomatis
  └─ Semua pelanggaran dicatat dalam keadaan
  ↓
Penyimpanan otomatis setiap jawaban
  └─ localStorage: lemon2026_ujian_[LOMBA]_[user]
  ↓
Kirim Jawaban
  ├─ Dialog konfirmasi diperlukan
  ├─ "Setelah dikirim, jawaban tidak dapat diubah"
  ├─ Saat dikonfirmasi → stempel waktu selesai ditandai
  ├─ Coba POST ke submitUrl (jika dikonfigurasi)
  ├─ Simpan ke localStorage terlepas dari itu
  └─ Pengalihan ke verifikasi-[LOMBA].html
```

**Perilaku Timer:**
- Diperbarui setiap 1 detik
- Berubah MERAH pada 5 menit tersisa
- Pengiriman otomatis jika waktu mencapai 0:00:00

**Warna Koding Kisi Soal:**
- Abu-abu: Tidak terjawab
- Hijau: Terjawab
- Hijau + sorot: Sedang dilihat

**Logika Proctoring:**
```javascript
fsKeluarLangsung: 2    // Keluar layar penuh ke-2 = pengiriman otomatis
fsBatasDetik: 10       // 10 detik untuk kembali sebelum penalti
maxPelanggaran: 5      // 5 pelanggaran memicu pengiriman
```

---

### Fase 4: Verifikasi (verifikasi-[LOMBA].html)
```
Muat keadaan ujian dari localStorage
  └─ Verifikasi bendera selesai ada
  ↓
Formulir Verifikasi Tiga Langkah
  ↓
LANGKAH 1: Pernyataan Peserta (Pernyataan Integritas)
  ├─ ☐ Saya telah mengerjakan ujian ini secara jujur dan mandiri
  ├─ ☐ Saya tidak melakukan kecurangan selama ujian berlangsung
  ├─ ☐ Saya memahami bahwa pelanggaran aturan ujian dapat berakibat pada pembatalan nilai
  └─ KETIGA HARUS DICENTANG
  ↓
LANGKAH 2: Bukti Pengerjaan Ujian (Foto Bukti Kerja)
  ├─ Tampilkan: Ambil Foto (webcam) / Unggah Foto (pemilih file)
  ├─ Validasi:
  │  ├─ Format: JPG, JPEG, PNG saja
  │  ├─ Ukuran maks: 5 MB
  │  └─ Thumbnail: maks 640px
  ├─ Pratinjau dengan opsi ubah/hapus
  └─ Foto disimpan dalam sessionStorage sementara
  ↓
LANGKAH 3: Upload Bukti Selesai (Bukti Penyelesaian)
  ├─ Input: Nama Peserta
  ├─ Validasi:
  │  ├─ Tidak kosong
  │  └─ Harus cocok dengan nama terdaftar (tidak peka huruf besar-kecil)
  ├─ Umpan balik real-time: "Nama sesuai dengan data pendaftaran ✓"
  └─ Input menjadi hijau saat valid
  ↓
Tombol [Selesai & Kirim]
  ├─ DINONAKTIFKAN sampai ketiga langkah selesai
  ├─ Animasi berdenyut saat siap
  ├─ SAAT DIKLIK:
  │  ├─ Simpan objek verifikasi ke localStorage
  │  ├─ Coba POST ke CONFIG.submitUrl (jika diatur)
  │  ├─ Animasi perayaan (60 sepotong confetti)
  │  └─ Pengalihan ke beranda-[LOMBA].html setelah 1.8s
  └─ Data tetap disimpan secara lokal meskipun POST gagal
  ↓
Layar Sukses
  ├─ "Selamat! Ujian Telah Selesai"
  ├─ Ikon trofi + pesan perayaan
  ├─ Tips: "Istirahat yang cukup sambil menunggu hasil ujian!"
  └─ Tombol [Keluar] dialihkan ke login
```

---

## STRUKTUR FILE & ARSITEKTUR

### Inventaris File (12 file total)

```
d:\Lemon\
├── index.html                    (Halaman login)
├── beranda-ipa.html              (Dasbor IPA)
├── beranda-ips.html              (Dasbor IPS)
├── beranda-matematika.html       (Dasbor Matematika)
├── ujian-ipa.html                (Ujian IPA, 30 soal)
├── ujian-ips.html                (Ujian IPS, 30 soal)
├── ujian-matematika.html         (Ujian Matematika, 30 soal)
├── verifikasi-ipa.html           (Verifikasi pasca-ujian IPA)
├── verifikasi-ips.html           (Verifikasi pasca-ujian IPS)
├── verifikasi-matematika.html    (Verifikasi pasca-ujian Matematika)
├── reset.html                    (Alat admin - pengatur ulang data)
└── DOCUMENTATION.md              (File ini)
```

### Konfigurasi Spesifik Kategori

Setiap kategori mempertahankan struktur identik dengan perbedaan konfigurasi:

| Kunci Konfigurasi | IPA | IPS | MATEMATIKA |
|---|---|---|---|
| `CONFIG.lomba` | "IPA" | "IPS" | "MATEMATIKA" |
| `namaUjian` | "Olimpiade IPA (30 soal...)" | "Olimpiade IPS (30 soal...)" | "Olimpiade Matematika (30 soal...)" |
| `ujianUrl` | "ujian-ipa.html" | "ujian-ips.html" | "ujian-matematika.html" |
| `berandaUrl` | "beranda-ipa.html" | "beranda-ips.html" | "beranda-matematika.html" |
| `verifikasiUrl` | "verifikasi-ipa.html" | "verifikasi-ips.html" | "verifikasi-matematika.html" |
| `storePrefix` | "lemon2026_ujian_ipa_" | "lemon2026_ujian_ips_" | "lemon2026_ujian_matematika_" |

---

## STACK TEKNIS

### Frontend

| Teknologi | Versi | Tujuan |
|---|---|---|
| HTML5 | Terbaru | Markup semantik, aksesibilitas |
| CSS3 | Terbaru | Tata letak (CSS Grid), variabel, animasi |
| JavaScript | ES5/6 | Logika, manajemen keadaan, proctoring |
| Google Fonts | Terbaru | Tipografi (Baloo 2, Nunito, Amiri) |

### API Peramban yang Digunakan

```javascript
// Akses webcam
navigator.mediaDevices.getUserMedia()

// Penyimpanan lokal
localStorage.setItem()
localStorage.getItem()
sessionStorage.setItem()

// Kontrol layar penuh
document.requestFullscreen()
document.exitFullscreen()
document.fullscreenElement

// Canvas (pemrosesan foto)
canvas.getContext('2d').drawImage()
canvas.toDataURL()

// Fetch (backend opsional)
fetch(submitUrl, { method: "POST", mode: "no-cors" })

// Peristiwa media
<video autoplay playsinline muted>
<input type="file" accept="image/*">
```

### Fitur CSS

```css
/* CSS Modern */
:root { --variables }           /* Token warna */
color-mix(in srgb, ...)         /* Fungsi warna */
CSS Grid & Flexbox              /* Tata letak responsif */
@media (max-width: ...)         /* Breakpoint mobile */
@keyframes & animation          /* Transisi halus */
backdrop-filter & mask          /* Efek canggih */
```

### Pola JavaScript

```javascript
// Struktur modular
var CONFIG = { ... }            /* Konfigurasi pusat */
var SOAL = [ ... ]              /* Larik soal */
window.Session = IIFE()         /* Manajemen sesi */
window.Auth = IIFE()            /* Logika autentikasi */

// Manipulasi DOM
var $ = (id) => document.getElementById(id)
var state = JSON.parse(localStorage.getItem(key))
document.addEventListener('change', handler)

// Operasi asinkron
fetch().then().catch()          /* Permintaan jaringan */
new Promise()                   /* Logika berbasis janji */
setTimeout()                    /* Operasi pengaturan waktu */
```

---

## SKEMA DATABASE

### Penyimpanan Sesi (Sementara - Hilang Saat Peramban Ditutup)

```json
{
  "peserta_login_user": "Dewa Radhitya",
  "peserta_login_profil": {
    "username": "Dewa Radhitya",
    "nama": "Dewa Radhitya",
    "sekolah": "SMPI Al Madina",
    "lomba": "IPA"
  },
  "peserta_login_bukti": {
    "thumb": "data:image/jpeg;base64,...",
    "name": "photo.jpg",
    "size": 102400
  }
}
```

### Penyimpanan Lokal (Persisten - Bertahan Saat Peramban Ditutup)

```json
{
  "lemon2026_ujian_ipa_dewa_radhitya": {
    "mulai": "2026-11-19T08:30:00.000Z",
    "jawaban": {
      "1": "B",
      "2": "A",
      "3": "C",
      ...
      "30": "E"
    },
    "pindahTab": 2,
    "selesai": {
      "waktu": "2026-11-19T09:15:45.000Z",
      "sebab": "user_submit"
    },
    "verifikasi": {
      "waktu": "2026-11-19T09:20:00.000Z",
      "nama": "Dewa Radhitya",
      "pernyataan": 3,
      "bukti": "data:image/jpeg;base64,...",
      "namaFoto": "bukti-webcam.jpg"
    },
    "terkirim": false
  }
}
```

### Database Pengguna (Dikodekan Keras dalam index.html)

```javascript
CONFIG.users = [
  // IPA (14 pengguna)
  {
    nama: "Dewa Radhitya",
    sekolah: "SMPI Al Madina",
    password: "lemon_2026_071",
    lomba: "IPA"
  },
  // ... pengguna lebih lanjut
  
  // IPS (13 pengguna)
  {
    nama: "M. Wildan Syafa'at",
    sekolah: "SMPI Al-Wasatiyah",
    password: "lemon_2026_085",
    lomba: "IPS"
  },
  // ... pengguna lebih lanjut
  
  // MATEMATIKA (12 pengguna)
  {
    nama: "ARSYAKAYLA MIRAI SHOFIYA",
    sekolah: "MTsN 5 SRAGEN",
    password: "lemon_2026_098",
    lomba: "MATEMATIKA"
  }
  // ... pengguna lebih lanjut
]
```

---

## TITIK INTEGRASI API

### Endpoint Backend Opsional

**Konfigurasi:**
```javascript
CONFIG.submitUrl = ""  // Biarkan kosong untuk hanya lokal
// ATAU
CONFIG.submitUrl = "https://api-anda.com/submit"
```

**Format Permintaan:**
```javascript
POST /submit HTTP/1.1
Content-Type: text/plain;charset=utf-8

{
  "lomba": "IPA",
  "nama": "Dewa Radhitya",
  "sekolah": "SMPI Al Madina",
  "mulai": "2026-11-19T08:30:00.000Z",
  "selesai": "2026-11-19T09:15:45.000Z",
  "sebab": "user_submit",
  "pindahTab": 2,
  "verifikasi": {
    "waktu": "2026-11-19T09:20:00.000Z",
    "nama": "Dewa Radhitya",
    "pernyataan": 3,
    "bukti": "data:image/jpeg;base64,...",
    "namaFoto": "bukti-webcam.jpg"
  },
  "jawaban": {
    "1": "B",
    "2": "A",
    ...
    "30": "E"
  }
}
```

**Penanganan Respons:**
- Sukses (200-299): Tandai `terkirim = true`
- Kegagalan: Pertahankan `terkirim = false`, izinkan coba lagi
- Waktu habis (8d): Perlakukan sebagai penyimpanan lokal saja
- Kesalahan jaringan: Tidak ada blokir pengalihan, data tetap ada

**Catatan CORS:**
- Menggunakan `mode: "no-cors"` (tidak ada kredensial dikirim)
- Tidak dapat membaca isi respons
- Cocok untuk endpoint logging/analitik

---

## ALUR PENGGUNA

### Alur 1: Peserta Pertama Kali
```
1. Buka index.html
2. Masukkan nama + password + pilih kategori
3. Klik [Masuk]
4. Dialihkan ke beranda
5. Unggah/tangkap foto
6. Baca aturan
7. Tandatangani janji integritas
8. [Mulai Ujian]
9. Jawab 30 soal (timer 60 menit)
10. [Submit Jawaban]
11. Verifikasi: 3 pernyataan + foto + nama
12. [Selesai & Kirim]
13. Hasil dikirim ke backend (jika dikonfigurasi)
14. Layar sukses
```

### Alur 2: Peserta Kembali (Perangkat Sama)
```
1. Buka ujian-ipa.html langsung (jika tab masih terbuka)
2. Sistem mendeteksi keadaan localStorage
3. Kisi soal menunjukkan jawaban sebelumnya
4. Dapat melanjutkan menjawab atau mengirim lebih awal
5. Timer berlanjut dari tempat ia berhenti
```

### Alur 3: Pemulihan Gangguan Ujian
```
1. Kerusakan peramban atau kehilangan koneksi
2. Data tetap ada dalam localStorage
3. Login berikutnya mendeteksi keadaan
4. Peserta dapat melanjutkan ujian
5. Timer dihitung dari waktu mulai asli
```

### Alur 4: Pelanggaran Proctoring
```
1. Perpindahan tab terdeteksi
2. Penghitung pelanggaran bertambah
3. Jika < 5: Dialog peringatan ditampilkan, ujian berlanjut
4. Jika >= 5: Pengiriman otomatis dipicu
5. Semua pelanggaran dicatat dalam keadaan
```

---

## ALAT ADMIN

### reset.html - Pembersih Data Ujian

**Tujuan:** Menghapus data ujian dari localStorage peramban (mis. untuk penggunaan kembali perangkat)

**Akses:**
```
PIN: lemon-admin  (Ubah sebelum deployment!)
```

**Fitur:**
- Memindai localStorage untuk kunci ujian
- Menampilkan daftar peserta berdasarkan kategori
- Menunjukkan status: Sedang Berlangsung / Selesai / Terverifikasi
- Menampilkan jumlah jawaban per peserta
- Pengaturan ulang individual atau batch

**Pola Regex (Deteksi Kunci):**
```
/^lemon2026_(v2_)?ujian_(ips|ipa|matematika)_(.+)$/
```

**Penyimpanan Setelah Pengaturan Ulang:**
```
Semua kunci yang cocok dihapus
Peserta harus memulai ulang dari beranda
```

---

## KEAMANAN & PROCTORING

### Autentikasi
```
Pemeriksaan Login:
├─ Nama: Dinormalisasi (spasi, tidak peka huruf besar-kecil)
├─ Password: Pencocokan tepat (peka huruf besar-kecil)
└─ Kategori: Harus cocok dengan kategori terdaftar
```

### Manajemen Sesi
```
sessionStorage (sesi aktif saja):
├─ Hilang saat peramban ditutup
├─ Berisi profil pengguna
└─ Berisi data foto sementara

localStorage (persisten):
├─ Bertahan saat peramban ditutup
├─ Berisi jawaban ujian
└─ Berisi data verifikasi
```

### Fitur Proctoring

| Fitur | Pemicu | Tindakan |
|---|---|---|
| **Mode Layar Penuh** | Awal ujian | Diperlukan, ditegakkan |
| **Keluar Layar Penuh** | Tindakan pengguna | Dialog peringatan |
| **Perpindahan Tab** | Event `visibilitychange` | Pelanggaran +1 |
| **Pelanggaran Maksimal** | Jumlah >= 5 | Pengiriman otomatis |
| **Blokir Screenshot** | Fitur peramban | Native (tidak ditegakkan dalam kode) |
| **Batas Waktu** | Timer = 0:00:00 | Pengiriman otomatis |

### Pencatatan Pelanggaran
```javascript
pindahTab: count    // Dilacak per sesi
```

### Verifikasi Foto
```
Persyaratan:
├─ Format: JPG, JPEG, PNG
├─ Ukuran maks: 5 MB
├─ Pemrosesan: Perubahan ukuran canvas sisi klien
└─ Penyimpanan: URL data Base64 dalam localStorage
```

### Janji Integritas
```
Diperlukan sebelum ujian:
├─ Konfirmasi pekerjaan jujur
├─ Konfirmasi tidak ada kecurangan
└─ Konfirmasi kesadaran akan penalti

Diperlukan setelah ujian:
├─ Konfirmasi ulang di atas
└─ Hanya kemudian dapat mengirim hasil
```

---

## DAFTAR PERIKSA DEPLOYMENT

### Pra-Deployment
- [ ] Perbarui `CONFIG.submitUrl` di semua file ujian-*.html
- [ ] Ubah PIN dalam reset.html dari "lemon-admin"
- [ ] Tinjau semua soal dalam larik SOAL
- [ ] Siapkan kunci jawaban (kunci_jawaban_*.csv)
- [ ] Uji di peramban target (Chrome, Firefox, Edge)
- [ ] Verifikasi desain responsif di tablet/mobile
- [ ] Uji beban dengan 40+ peserta secara bersamaan

### Setup Server
- [ ] Terapkan file ke server web
- [ ] Konfigurasi HTTPS (diperlukan untuk API getUserMedia)
- [ ] Atur endpoint POST untuk menerima hasil
- [ ] Konfigurasikan CORS atau gunakan mode no-cors
- [ ] Atur logging/database untuk pengiriman
- [ ] Buat dasbor admin untuk tampilan hasil

### Operasi Hari H
- [ ] Mulai memantau endpoint submitUrl
- [ ] Siapkan PIN reset.html untuk perangkat admin
- [ ] Uji login peserta dengan kredensial sampel
- [ ] Uji unggah foto di perangkat ujian
- [ ] Verifikasi akurasi timer (periksa jam sistem)
- [ ] Briefing peserta tentang persyaratan peramban
- [ ] Siapkan dukungan IT

### Pasca-Ujian
- [ ] Ekspor semua pengiriman dari server
- [ ] Verifikasi semua peserta muncul dalam hasil
- [ ] Periksa pengiriman duplikat
- [ ] Skoring ujian menggunakan kunci jawaban
- [ ] Hapus localStorage di perangkat bersama (gunakan reset.html)
- [ ] Arsipkan data ujian

---

## PANDUAN KUSTOMISASI

### Mengubah Durasi Ujian
```javascript
// Dalam ujian-[LOMBA].html
CONFIG.durasiMenit = 90  // Ubah dari 60 menjadi 90
```

### Menambah Lebih Banyak Soal
```javascript
// Dalam ujian-[LOMBA].html
var SOAL = [
  {
    "n": 1,
    "mapel": "Subjek",
    "q": "Teks soal?",
    "o": ["A", "B", "C", "D", "E"]
  },
  // ... tambah lebih banyak
]
// Kemudian perbarui CONFIG.jumlahSoal = 40
```

### Menambah Peserta
```javascript
// Dalam index.html CONFIG.users
CONFIG.users.push({
  nama: "Peserta Baru",
  sekolah: "Nama Sekolah",
  password: "lemon_2026_XXX",
  lomba: "IPA"
})
```

### Mengubah Warna
```css
/* Dalam bagian <style> setiap file HTML */
:root {
  --accent: #fdb95a;           /* Warna tombol utama */
  --green: #6cb04a;            /* Warna sukses/terverifikasi */
  --danger: #b83a26;           /* Warna kesalahan/pelanggaran */
  --bg: #fdf8ec;               /* Latar belakang */
}
```

---

## PEMECAHAN MASALAH

### Masalah: "Kamera tidak dapat diakses"
**Solusi:** 
- Periksa izin peramban
- Gunakan HTTPS (diperlukan untuk webcam)
- Coba Firefox jika Chrome gagal
- Kembali ke opsi unggah

### Masalah: Foto tidak tersimpan
**Solusi:**
- Periksa localStorage diaktifkan
- Nonaktifkan mode privasi peramban
- Verifikasi ukuran file < 5MB
- Coba kurangi kualitas gambar

### Masalah: Timer tidak akurat
**Solusi:**
- Sinkronkan jam sistem ke NTP
- Gunakan Chrome DevTools untuk memeriksa waktu
- Segarkan halaman jika desinkronisasi terdeteksi

### Masalah: Jawaban hilang saat menyegarkan
**Solusi:**
- Data harus tetap ada dalam localStorage
- Periksa jika mode privat/incognito (data hilang saat ditutup)
- Hubungi IT untuk memulihkan dari backup

---

## KESIMPULAN

LEMON adalah platform ujian siap produksi dengan:
- ✅ Alur kerja ujian lengkap (login → ujian → verifikasi)
- ✅ Proctoring yang kuat (layar penuh, deteksi perpindahan tab, pencatatan pelanggaran)
- ✅ Penyimpanan fleksibel (lokal saja atau pengiriman jauh)
- ✅ Desain responsif (desktop, tablet, mobile)
- ✅ Kepatuhan aksesibilitas (label ARIA, teks sr-only)
- ✅ Tanpa ketergantungan eksternal (vanilla JavaScript)

**Siap untuk deployment ke semua 39 peserta di 3 kategori.**

---

*Dibuat: 19 November 2026*  
*Untuk pertanyaan atau pembaruan, hubungi administrator sistem.*
