import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { isConfigured, IDRX_BASE_ADDRESS } from "@/lib/idrx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status rail",
  description: "Keadaan sebenarnya dari rail pencairan Cairin saat ini.",
};

export default function StatusPage() {
  const configured = isConfigured();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          Status rail
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
          Halaman ini membaca keadaan server yang sedang Anda buka, bukan halaman
          status yang ditulis tangan lalu dilupakan.
        </p>

        <div className="mt-10 space-y-px overflow-hidden rounded-2xl border border-line bg-line">
          <Row
            label="Pembacaan kode QRIS"
            state="on"
            note="Berjalan penuh di peramban Anda. Tidak bergantung pada server mana pun."
          />
          <Row
            label="Pembacaan rantai Base"
            state="on"
            note={`Kontrak IDRX ${IDRX_BASE_ADDRESS}, dua desimal.`}
          />
          <Row
            label="Kredensial penerbit IDRX"
            state={configured ? "on" : "off"}
            note={
              configured
                ? "Terpasang di server ini. Pencairan bisa diajukan."
                : "Belum terpasang. Halaman pencairan menutup diri dan tidak menerima nomor rekening."
            }
          />
          <Row
            label="Pembayaran langsung ke merchant QRIS"
            state="off"
            note="Butuh izin Bank Indonesia yang belum kami miliki. Tidak ada rencana menyiasatinya."
          />
        </div>

        <p className="mt-8 rounded-xl border border-line bg-surface-sunken p-5 text-xs leading-relaxed text-ink-muted">
          Baris yang mati tetap ditampilkan mati. Menyembunyikannya akan membuat
          halaman ini terlihat lebih baik dan sekaligus tidak berguna.
        </p>
      </main>
      <Footer />
    </>
  );
}

function Row({
  label,
  state,
  note,
}: {
  label: string;
  state: "on" | "off";
  note: string;
}) {
  return (
    <div className="flex items-start gap-4 bg-surface p-5">
      <span
        className={
          state === "on"
            ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
            : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-faint"
        }
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {label}
          <span className="sr-only">{state === "on" ? ": aktif" : ": tidak aktif"}</span>
        </p>
        <p className="tabular mt-1 break-all text-xs leading-relaxed text-ink-muted">
          {note}
        </p>
      </div>
    </div>
  );
}
