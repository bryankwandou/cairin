import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FeeCalculator } from "@/components/landing/FeeCalculator";

export const metadata: Metadata = {
  title: "Biaya",
  description:
    "Biaya pencairan Rp5.000 tetap sampai Rp250 juta, dan perbandingannya dengan model persentase.",
};

export default function BiayaPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Biaya</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
          Satu angka tetap, bukan persentase. Di bawah sekitar Rp430.000 model
          persentase memang lebih murah, dan kami menuliskannya di sini alih
          alih menyembunyikannya.
        </p>

        <div className="mt-10">
          <FeeCalculator />
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Daftar lengkapnya
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Pencairan sampai Rp250 juta", "Rp5.000", "Seketika, termasuk akhir pekan"],
                  ["Pencairan di atas Rp250 juta", "Rp35.000", "RTGS, Senin sampai Jumat 08.00 hingga 15.00 WIB"],
                  ["Pencairan di atas Rp1 miliar", "Rp35.000", "Ditinjau manual oleh penerbit"],
                  ["Biaya Cairin sendiri", "Rp0", "Kami belum memungut apa pun"],
                  ["Gas di jaringan Base", "Beberapa rupiah", "Dibayar dompet Anda, bukan kepada kami"],
                ].map(([label, fee, note]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-left font-medium">
                      {label}
                    </th>
                    <td className="tabular px-5 py-3.5 text-right font-semibold">{fee}</td>
                    <td className="px-5 py-3.5 text-right text-xs text-ink-muted">
                      {note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Seluruh biaya di tabel ini dipungut penerbit IDRX, bukan Cairin.
            Angkanya diambil dari daftar biaya yang mereka umumkan terbuka.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
