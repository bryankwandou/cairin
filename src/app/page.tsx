import Link from "next/link";
import { ArrowRight, Flame, Landmark, ScanLine } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { QrisReader } from "@/components/landing/QrisReader";
import { CairinMark } from "@/components/brand/Logo";
import { formatIdr } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Steps />
        <Numbers />
        <Limits />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* A single soft wash behind the headline. No mesh, no orbs — the page is
          about money, and money copy reads better on quiet ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-[0.07]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, var(--brand-bright), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-brand-bright" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              Berjalan di IDRX, jaringan Base
            </p>

            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] md:text-6xl">
              Kripto masuk.
              <br />
              Rupiah keluar.
              <br />
              <span className="text-brand-ink">Sekali menunggu.</span>
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-ink-muted md:text-lg">
              Selama ini mencairkan aset kripto di Indonesia berarti tiga
              antrean: jual di bursa, tunggu penarikan, lalu pindahkan lagi ke
              dompet yang benar. Cairin memangkasnya jadi satu. Anda membakar
              IDRX di Base, rupiahnya mendarat di rekening atau e-wallet yang Anda
              tulis, dan tidak ada saat di mana uang itu dipegang oleh kami.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/cairkan"
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
              >
                Cairkan sekarang
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/cara-kerja"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-line-strong"
              >
                Lihat jalurnya
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              <Stat value={formatIdr(5000)} label="Biaya tetap, berapa pun nominalnya" />
              <Stat value="Seketika" label="Sampai Rp250 juta, termasuk akhir pekan" />
              <Stat value="Nol" label="Rupiah yang kami pegang" />
            </dl>
          </div>

          <div className="lg:pt-6">
            <QrisReader />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="tabular text-xl font-semibold">{value}</dt>
      <dd className="mt-1 text-xs leading-relaxed text-ink-muted">{label}</dd>
    </div>
  );
}

const steps = [
  {
    icon: ScanLine,
    title: "Tentukan tujuannya",
    body: "Pilih rekening bank atau nomor e-wallet yang akan menerima. Kalau Anda memindai kode QRIS, Cairin membacanya di perangkat Anda untuk memastikan nama merchant dan nominalnya sebelum apa pun bergerak.",
  },
  {
    icon: Flame,
    title: "Bakar IDRX-nya",
    body: "Dompet Anda memanggil burnWithAccountNumber di kontrak IDRX. Yang tercatat di rantai hanyalah sidik SHA-256 dari tujuan, bukan nomor rekeningnya. Pembakaran inilah izin Anda — tanpa itu tidak ada yang bisa menagih apa pun atas nama Anda.",
  },
  {
    icon: Landmark,
    title: "Rupiahnya mendarat",
    body: "Bukti pembakaran diteruskan ke penerbit IDRX, dan penerbit yang berizin itulah yang mengirim rupiahnya. Sampai Rp250 juta prosesnya seketika, tidak menunggu jam kerja bank.",
  },
];

function Steps() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
          Tiga hal terjadi. Anda hanya menunggu satu kali.
        </h2>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-wash text-brand-ink">
                  <step.icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="tabular text-xs text-ink-faint">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Fee comparison. Figures come from each provider's own published schedule. */
const comparisonRows = [
  { amount: 100_000, cairin: 5_000, percentRail: 1_240 },
  { amount: 500_000, cairin: 5_000, percentRail: 6_200 },
  { amount: 2_000_000, cairin: 5_000, percentRail: 24_800 },
  { amount: 10_000_000, cairin: 5_000, percentRail: 124_000 },
];

function Numbers() {
  return (
    <section className="border-b border-line bg-surface-sunken">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              Biaya tetap mengalahkan persentase, dan bedanya melebar
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
              Layanan pencairan di Indonesia umumnya memungut satu persen
              ditambah pajak 0,24 persen. Penerbit IDRX memungut Rp5.000, tidak
              peduli Anda mencairkan seratus ribu atau sepuluh juta. Di bawah
              sekitar Rp430.000 model persentase lebih murah, dan kami tidak
              menyembunyikan itu. Di atasnya, selisihnya berhenti jadi soal
              sepele.
            </p>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-faint">
              Angka pembanding dihitung dari daftar biaya yang diumumkan masing
              masing penyedia, bukan dari perkiraan kami.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Perbandingan biaya pencairan pada beberapa nominal
              </caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Nominal
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Cairin
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Model persentase
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Selisih
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => {
                  const saving = row.percentRail - row.cairin;
                  return (
                    <tr key={row.amount} className="border-b border-line last:border-0">
                      <th
                        scope="row"
                        className="tabular px-5 py-3 text-left font-medium"
                      >
                        {formatIdr(row.amount)}
                      </th>
                      <td className="tabular px-5 py-3 text-right">
                        {formatIdr(row.cairin)}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-muted">
                        {formatIdr(row.percentRail)}
                      </td>
                      <td
                        className={
                          saving > 0
                            ? "tabular px-5 py-3 text-right font-medium text-brand-ink"
                            : "tabular px-5 py-3 text-right text-ink-muted"
                        }
                      >
                        {saving > 0 ? `hemat ${formatIdr(saving)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

const limits = [
  {
    title: "Kami tidak bisa membayar kode QRIS merchant",
    body: "Menyelesaikan pembayaran ke merchant QRIS adalah kegiatan berizin di bawah Bank Indonesia, dan Cairin belum memilikinya. Yang bisa kami lakukan legal: mengirim rupiah ke e-wallet Anda, lalu Anda yang memindai kodenya. Satu langkah lebih panjang, nol klaim palsu.",
  },
  {
    title: "Di bawah Rp20.000 permintaan ditolak",
    body: "Penerbit menetapkan lantai itu. Cairin menolaknya lebih awal, sebelum Anda membakar token, supaya tidak ada yang hangus percuma.",
  },
  {
    title: "Di atas Rp250 juta tidak lagi seketika",
    body: "Nominal sebesar itu berpindah lewat RTGS, yang hanya buka Senin sampai Jumat pukul 08.00 hingga 15.00 WIB. Kami tampilkan jadwal sebenarnya, bukan kata segera.",
  },
  {
    title: "Tanpa kredensial penerbit, tombolnya mati",
    body: "Kalau server tidak punya kunci penerbit yang sah, Cairin menolak memulai pencairan dan mengatakannya apa adanya. Yang tidak akan pernah terjadi: layar bertulis berhasil untuk uang yang tidak pernah dikirim.",
  },
];

function Limits() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="flex items-start gap-4">
          <CairinMark className="mt-1 h-7 w-7 shrink-0" idSuffix="-limits" />
          <div>
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              Yang belum bisa kami lakukan
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Bagian ini biasanya dihapus dari halaman produk. Kami menaruhnya di
              beranda karena satu satunya alasan orang menyerahkan uang kepada
              sebuah layanan baru adalah karena layanan itu terdengar jujur soal
              batasnya sendiri.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
          {limits.map((limit) => (
            <div key={limit.title} className="bg-surface p-6">
              <h3 className="text-base font-semibold">{limit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {limit.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-brand-wash p-6">
          <p className="min-w-[16rem] flex-1 text-sm leading-relaxed">
            Kalau batasan di atas sudah Anda pahami, sisanya tinggal mencoba.
            Halaman pencairan menunjukkan status rail yang sebenarnya sebelum
            Anda menyentuh apa pun.
          </p>
          <Link
            href="/cairkan"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Buka halaman pencairan
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
