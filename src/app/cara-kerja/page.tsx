import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Cara kerja",
  description:
    "Jalur lengkap dari IDRX di Base sampai rupiah mendarat di rekening, termasuk apa yang diverifikasi di setiap langkah.",
};

const stages = [
  {
    label: "Di perangkat Anda",
    title: "Tujuan dikunci sebelum apa pun bergerak",
    body: "Anda menuliskan bank atau e-wallet, nomor, dan nama pemiliknya. Peramban menghitung sidik SHA-256 dari gabungan nama bank dan nomor rekening. Sidik itulah yang nanti dibawa ke rantai, bukan nomornya.",
    detail: "SHA-256 dari \"{namaBank}_{nomorRekening}\"",
  },
  {
    label: "Di dompet Anda",
    title: "Pembakaran adalah izinnya",
    body: "Dompet Anda memanggil burnWithAccountNumber di kontrak IDRX dan menghancurkan token sejumlah yang dicairkan ditambah biaya penerbit. Tidak ada persetujuan token terpisah, tidak ada kontrak perantara yang menahan dana Anda, dan tidak ada kunci milik kami yang terlibat.",
    detail: "burnWithAccountNumber(uint256 amount, string hashedAccountNumber)",
  },
  {
    label: "Di server kami",
    title: "Klaim dari peramban tidak dipercaya",
    body: "Sebelum penerbit dihubungi, server membaca sendiri struk transaksinya di rantai: transaksinya sukses, log-nya berasal dari kontrak IDRX yang asli, pembakarnya memang dompet yang meminta, jumlahnya cocok, dan sidik tujuan yang tercatat sama persis dengan tujuan yang diminta sekarang.",
    detail: "Pemeriksaan terakhir itu yang menutup celah paling berbahaya: membakar atas nama satu rekening, lalu mengalihkan rupiahnya ke rekening lain.",
  },
  {
    label: "Di penerbit",
    title: "Pihak berizin yang mengirim uangnya",
    body: "Bukti pembakaran diteruskan ke penerbit IDRX beserta rincian tujuan. Penerbit memegang izin, cadangan rupiah, dan hubungan dengan bank. Merekalah yang benar-benar memindahkan uang, dan itu memang seharusnya begitu.",
    detail: "POST /api/transaction/redeem-request, ditandatangani HMAC-SHA256",
  },
];

export default function CaraKerjaPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          Cara kerja
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
          Empat tahap, dan hanya satu di antaranya yang meminta waktu Anda.
          Sisanya berjalan tanpa Anda perlu menungguinya di layar.
        </p>

        <ol className="mt-12 space-y-px overflow-hidden rounded-2xl border border-line bg-line">
          {stages.map((stage, index) => (
            <li key={stage.title} className="bg-surface p-6">
              <div className="flex items-baseline gap-3">
                <span className="tabular text-xs text-ink-faint">0{index + 1}</span>
                <span className="rounded-full bg-brand-wash px-2.5 py-0.5 text-[11px] font-medium text-brand-ink">
                  {stage.label}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                {stage.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{stage.body}</p>
              <p className="tabular mt-3 rounded-lg bg-surface-sunken p-3 text-[11px] leading-relaxed text-ink-muted">
                {stage.detail}
              </p>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Apa yang tidak ada dalam alur ini
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>Tidak ada rekening penampungan milik Cairin.</li>
            <li>Tidak ada kontrak perantara yang menahan token Anda.</li>
            <li>Tidak ada kunci privat yang kami simpan atau minta.</li>
            <li>
              Tidak ada saat di mana dana Anda bisa kami tahan, bekukan, atau
              alihkan, karena secara teknis dana itu tidak pernah lewat tangan
              kami.
            </li>
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-brand-wash p-6">
          <p className="min-w-[15rem] flex-1 text-sm leading-relaxed">
            Batasan hukum dan nominalnya kami tulis terbuka di halaman terpisah.
          </p>
          <Link
            href="/legal"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:opacity-90"
          >
            Baca batasannya
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
