# Cairin

Cairkan aset kripto jadi rupiah, langsung ke rekening bank atau e-wallet mana
pun di Indonesia. Berjalan di atas IDRX di jaringan Base.

Selama ini mencairkan kripto di Indonesia berarti tiga antrean: jual di bursa,
tunggu penarikan, lalu pindahkan lagi ke dompet yang benar. Cairin memangkasnya
jadi satu kali menunggu, dan tidak ada titik di mana rupiah Anda dipegang oleh
kami.

---

## Bagaimana ini bekerja

```
Dompet Anda                     Server Cairin                 Penerbit IDRX
     |                                |                              |
     |  1. hitung SHA-256 tujuan      |                              |
     |     "{namaBank}_{nomor}"       |                              |
     |                                |                              |
     |  2. burnWithAccountNumber()    |                              |
     |---------> kontrak IDRX di Base |                              |
     |                                |                              |
     |  3. kirim hash transaksi ------>                              |
     |                                |                              |
     |                     4. baca struk transaksi                   |
     |                        langsung dari rantai                   |
     |                        (klien tidak dipercaya)                |
     |                                |                              |
     |                     5. teruskan bukti -----------------------> |
     |                                |                              |
     |                                |    6. rupiah dikirim ke bank |
     |                                |       atau e-wallet tujuan   |
```

Pembakaran token adalah izinnya. Tidak ada persetujuan token terpisah, tidak ada
kontrak perantara yang menahan dana, dan tidak ada kunci privat yang kami simpan.

### Yang diverifikasi sebelum penerbit dihubungi

Server tidak mempercayai apa pun yang dikirim peramban. Sebelum satu rupiah pun
diminta, `src/app/api/redeem/route.ts` membaca sendiri ke rantai:

1. transaksinya ada dan berhasil
2. log-nya berasal dari kontrak IDRX yang asli, bukan tiruan
3. pembakarnya memang dompet yang meminta pencairan
4. jumlah yang dibakar sama dengan yang diminta
5. sidik tujuan yang tercatat saat pembakaran sama persis dengan tujuan sekarang

Pemeriksaan kelima menutup celah paling berbahaya: membakar atas nama satu
rekening, lalu mengalihkan rupiahnya ke rekening lain.

---

## Yang belum bisa dilakukan

Ditulis di sini, di halaman `/legal`, dan di beranda — bukan disembunyikan.

- **Membayar kode QRIS merchant.** Itu kegiatan berizin di bawah Bank Indonesia
  dan Cairin tidak memilikinya. Yang sah dilakukan: mengirim rupiah ke e-wallet
  Anda, lalu Anda sendiri yang memindai kodenya. Kami tidak membayar kodenya;
  kami mengisi dompet yang membayarnya.
- **Pencairan di bawah Rp20.000.** Ditolak penerbit. Cairin menolaknya lebih
  dulu, sebelum token terbakar percuma.
- **Pencairan seketika di atas Rp250 juta.** Berpindah lewat RTGS, Senin sampai
  Jumat 08.00–15.00 WIB.
- **Berjalan tanpa kredensial penerbit.** Kalau server tidak memegang kunci yang
  sah, halaman pencairan menutup diri dan mengatakannya. Tidak akan ada layar
  bertulis "berhasil" untuk uang yang tidak pernah dikirim.

---

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi kalau punya kredensial penerbit
npm run dev
```

Situs berjalan penuh tanpa kredensial. Pembaca QRIS dan pembacaan rantai tidak
membutuhkannya; hanya pengajuan pencairan yang membutuhkan, dan bagian itu
menutup diri secara terbuka.

### Perintah

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm test` | Uji parser QRIS |
| `npm run typecheck` | Periksa tipe tanpa membangun |
| `npm run lint` | ESLint |

---

## Uji

Parser QRIS diuji terhadap payload yang tidak kami buat sendiri: satu stiker
merchant sungguhan yang dipublikasikan terbuka beserta hasil decode-nya,
termasuk checksum `04CB` miliknya.

```
node --test src/lib/qris.test.ts
# 15 pass, 0 fail
```

Yang diuji antara lain: vektor rujukan CRC-16/CCITT-FALSE, pembacaan kode statis
dan dinamis, dua template acquirer bersarang, penolakan kode yang dirusak,
penolakan panjang field yang melewati batas, dan penulisan nominal ke stiker
statis tanpa merusak identitas merchant.

---

## Susunan berkas

```
src/
  lib/
    qris.ts          pembaca EMVCo TLV, murni, tanpa dependensi
    qris-build.ts    penyusun payload + penulisan nominal ke kode statis
    qris.test.ts     15 uji, termasuk payload merchant sungguhan
    idrx.ts          klien penerbit, bertanda tangan HMAC-SHA256, server-only
    chain.ts         konstanta Base, ABI IDRX, konversi satuan
    wallet.ts        akses dompet injected, tanpa perantara pihak ketiga
  app/
    api/status       apakah rail benar-benar hidup
    api/methods      daftar bank dan e-wallet dari penerbit
    api/redeem       verifikasi rantai lalu teruskan ke penerbit
    cairkan          alur pencairan
    cara-kerja       jalur lengkap
    biaya            kalkulator biaya
    legal            batasan hukum
    status           keadaan rail saat ini
```

---

## Rujukan

Seluruh angka biaya, batas nominal, alamat kontrak, dan skema tanda tangan
diambil dari dokumentasi penerbit yang dipublikasikan terbuka di
[docs.idrx.co](https://docs.idrx.co), bukan dari perkiraan.

- Kontrak IDRX di Base: `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22`, dua desimal
- Tanda tangan API: HMAC-SHA256 atas timestamp, metode, URL, dan body

---

## Lisensi

MIT.
