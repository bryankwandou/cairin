import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Batasan",
  description:
    "Apa yang Cairin bisa dan tidak bisa lakukan, beserta alasan hukumnya.",
};

const sections = [
  {
    heading: "Cairin bukan penyelenggara jasa pembayaran",
    body: [
      "Memindahkan rupiah antar pihak di Indonesia adalah kegiatan berizin di bawah Bank Indonesia. Cairin tidak memegang izin itu dan tidak berpura pura memilikinya.",
      "Yang Cairin lakukan adalah menyusun permintaan, memverifikasi bukti pembakaran di rantai, dan meneruskannya ke penerbit IDRX. Penerbitlah yang berizin, dan penerbit pula yang mengirim rupiahnya. Tidak ada satu pun titik dalam alur ini di mana rupiah Anda berada di rekening kami.",
    ],
  },
  {
    heading: "Kami tidak bisa membayar kode QRIS merchant",
    body: [
      "Membaca kode QRIS itu terbuka. Formatnya diterbitkan EMVCo, dan siapa pun boleh menguraikannya. Itulah sebabnya pembaca kode di beranda bekerja sepenuhnya di perangkat Anda.",
      "Menyelesaikan pembayaran ke merchant di balik kode itu adalah cerita lain: hanya penyelenggara berizin yang boleh melakukannya. Cairin tidak akan mengarang jalan pintas untuk itu.",
      "Yang bisa dilakukan secara sah adalah mengirim rupiah ke e-wallet Anda — GoPay, OVO, DANA, dan sejenisnya diterima penerbit sebagai tujuan pencairan lewat nomor telepon terdaftar. Setelah saldo itu masuk, Anda memindai kode QRIS memakai aplikasi dompet Anda sendiri, persis seperti biasa. Kami tidak membayar kodenya; kami mengisi dompet yang membayarnya.",
    ],
  },
  {
    heading: "Batas nominal ditentukan penerbit, bukan kami",
    body: [
      "Permintaan di bawah Rp20.000 ditolak penerbit. Cairin menolaknya lebih dulu, sebelum Anda membakar token, supaya tidak ada yang hangus sia sia.",
      "Sampai Rp250.000.000 pencairan berjalan seketika, termasuk malam hari dan akhir pekan, dengan biaya Rp5.000. Di atas angka itu dana berpindah lewat RTGS yang hanya buka Senin sampai Jumat pukul 08.00 hingga 15.00 WIB, dengan biaya Rp35.000. Di atas Rp1.000.000.000 permintaan ditinjau manual oleh penerbit.",
    ],
  },
  {
    heading: "Pembakaran bersifat permanen",
    body: [
      "Token yang sudah dibakar tidak bisa dikembalikan oleh siapa pun, termasuk oleh kami dan oleh penerbit. Pembakaran itulah yang menjadi izin Anda, dan sifat permanennya adalah alasan izin itu bisa dipercaya.",
      "Kalau permintaan gagal setelah pembakaran berhasil, Cairin menampilkan hash transaksinya dan mengatakan apa adanya bahwa token sudah terbakar. Bukti itu tetap sah dan bisa diajukan ulang tanpa membakar lagi.",
    ],
  },
  {
    heading: "Verifikasi identitas ada di penerbit",
    body: [
      "Kewajiban mengenali nasabah melekat pada pihak berizin. Kredensial yang dipakai Cairin untuk memanggil penerbit hanya diberikan kepada akun bisnis yang sudah lolos pemeriksaan penerbit.",
      "Kalau server tidak memegang kredensial yang sah, halaman pencairan menutup diri dan mengatakannya. Yang tidak akan pernah Anda lihat di Cairin adalah layar bertulis berhasil untuk uang yang tidak pernah dikirim.",
    ],
  },
  {
    heading: "Pajak",
    body: [
      "Transaksi aset kripto di Indonesia dikenai pajak sesuai ketentuan yang berlaku. Cairin tidak memotong dan tidak menyetorkan pajak atas nama Anda, dan tidak memberi nasihat perpajakan. Catatan transaksi Anda tersedia di block explorer untuk keperluan pelaporan.",
    ],
  },
];

export default function LegalPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          Yang belum bisa kami lakukan
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
          Halaman semacam ini biasanya ditulis untuk melindungi perusahaan. Yang
          ini ditulis supaya Anda tahu persis di mana tanggung jawab kami
          berhenti sebelum Anda menaruh uang.
        </p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 rounded-xl border border-line bg-surface-sunken p-5 text-xs leading-relaxed text-ink-muted">
          Angka biaya, batas nominal, dan jadwal penyelesaian di halaman ini
          diambil dari dokumentasi penerbit IDRX yang dipublikasikan terbuka.
          Kalau penerbit mengubahnya, halaman ini ikut berubah.
        </p>
      </main>
      <Footer />
    </>
  );
}
