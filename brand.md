# Cairin — sistem brand

Berkas ini adalah sumber kebenaran untuk warna, tipografi, dan nada bahasa.
Kalau ada yang berbeda antara berkas ini dan kode, kode yang salah.

---

## Nama

**Cairin.** Dari kata kerja sehari-hari "cairkan" — mengubah sesuatu yang
tersimpan menjadi uang yang bisa dipakai. Orang Indonesia memakai kata ini tanpa
perlu dijelaskan: *cairin duitnya*.

Tiga alasan nama ini dipilih setelah menguji puluhan kandidat:

1. **Kata kerja, bukan kata benda.** Pola yang menang di Gojek, Grab, Flip. Nama
   yang menyebut tindakan lebih cepat melekat daripada nama yang menyebut benda.
2. **Nol unsur kripto.** Tidak ada "coin", "chain", "pay", "Q", atau "X". Orang
   yang belum pernah menyentuh kripto tetap paham ini layanan apa.
3. **Aman secara merek.** Kandidat sebelumnya bertabrakan dengan dua merek
   terdaftar: "Base" milik Coinbase, dan "QRIS" milik Bank Indonesia. Keduanya
   aman untuk hackathon, keduanya ranjau saat penggalangan dana. Cairin bersih.

Selalu ditulis huruf kecil dalam wordmark: `cairin`. Dalam kalimat, huruf besar
di awal: Cairin.

---

## Mark

Cincin terbuka yang mulutnya menghadap ke kanan bawah, memeluk satu tetes.

Cincinnya adalah huruf C; ia juga sebuah bejana. Tetesnya adalah uang — masih di
dalam, masih milik Anda, sedang dalam perjalanan keluar. Tidak ada yang
dekoratif: mulut cincin menunjuk arah nilai itu pergi, dan tetes adalah satu
satunya bentuk pejal supaya mata jatuh ke sana lebih dulu.

Detail teknis:

- Kanvas 48×48, cincin berjari-jari 15 dari titik pusat (24, 24)
- Busur 275 derajat, dari sudut 75° ke 350°, menyisakan mulut 85 derajat
- Tebal goresan 6,5 dengan ujung membulat
- Tetes setinggi 15 satuan, bulbnya berjari-jari 4,6

Berkas: `public/brand/cairin-mark.svg`, komponen `src/components/brand/Logo.tsx`.
Komponen memakai variabel CSS, jadi mark ikut berubah di mode gelap tanpa berkas
kedua.

### Yang tidak boleh

- Menutup mulut cincin menjadi lingkaran penuh
- Memutar mark; arah mulut membawa makna
- Mengganti tetes dengan ikon lain
- Memakai mark tanpa ruang kosong minimal seukuran jari-jari tetes di semua sisi

---

## Warna

Dua gagasan menahan sistem ini. Uang ditulis hampir hitam di atas kertas hangat,
karena angka yang akan dikirim seseorang sebaiknya terlihat mantap, bukan meriah.
Hijau disimpan untuk tindakan — tombol, kemajuan, konfirmasi — supaya warna
selalu berarti sesuatu terjadi, bukan menghias sesuatu yang sudah terjadi.

### Terang

| Peran | Nilai | Catatan |
| --- | --- | --- |
| `--paper` | `#fbfaf7` | Kertas hangat, bukan putih murni |
| `--surface` | `#ffffff` | Kartu dan panel |
| `--surface-sunken` | `#f4f2ed` | Bidang yang masuk ke dalam |
| `--ink` | `#0b0d0e` | Teks utama |
| `--ink-muted` | `#5d6265` | Teks pendukung |
| `--line` | `#e6e2da` | Garis pemisah |
| `--brand` | `#00a67e` | Aksi, indikator |
| `--brand-ink` | `#00674e` | Hijau yang aman untuk teks |
| `--brand-bright` | `#00c48c` | Isian, jangan untuk teks di kertas |
| `--gold` | `#a06f0a` | Hanya untuk nominal yang sudah benar-benar cair |

### Gelap

Peran yang sama, nilai ditukar. Yang berubah arah: `--brand-ink` menjadi
`#6ff0bf`, karena di atas bidang gelap justru nada terang yang terbaca.

### Aturan kontras

Setiap pasangan sudah diuji terhadap WCAG AA. Hijau muda hanya untuk isian.
Di mana pun hijau membawa teks, ia turun ke `--brand-ink`.

---

## Tipografi

**Geist Sans** untuk antarmuka. **Geist Mono** untuk angka.

Setiap nominal, saldo, biaya, hash, dan nomor rekening memakai kelas `.tabular`:
muka mono dengan `font-variant-numeric: tabular-nums`. Kolom rupiah yang
digitnya tidak lurus adalah kolom yang tidak dipercaya orang.

Track keseluruhan sedikit lebih rapat dari bawaan (`-0.011em`). Judul lebih
rapat lagi (`-0.03em` sampai `-0.045em`).

---

## Gerak

Gerak dipakai untuk menandai perubahan keadaan, bukan untuk menyambut.

- `animate-drip` — tetes jatuh ke tempatnya saat mark muncul
- `animate-pulse-ring` — denyut pada indikator rail yang hidup
- `animate-sheen` — kilau selama menunggu

Semuanya dimatikan di bawah `prefers-reduced-motion`. Halaman sudah bekerja
dalam keadaan diam; animasi hanya lapisan di atasnya.

---

## Nada bahasa

Bahasa Indonesia, kalimat penuh, tanpa emoji.

**Yang dilakukan:**

- Menyebut angka apa adanya. "Rp5.000", bukan "biaya rendah".
- Menyebut jadwal sebenarnya. "Senin sampai Jumat 08.00–15.00 WIB", bukan "segera".
- Menyebut batas sendiri lebih dulu, sebelum pengguna menemukannya.
- Memakai kata kerja aktif dan subjek yang jelas: siapa melakukan apa.

**Yang tidak dilakukan:**

- Kata pemasaran kosong: revolusioner, mulus, seamless, game changer
- Menjanjikan hal yang bergantung pada pihak lain seolah kami yang menjamin
- Menyembunyikan kegagalan di balik kalimat pasif
- Menampilkan "berhasil" untuk sesuatu yang belum tentu berhasil

Halaman `/legal` adalah patokan nadanya. Kalau sebuah kalimat baru terasa lebih
membanggakan daripada kalimat di sana, kalimat itu kemungkinan besar terlalu
jauh.
