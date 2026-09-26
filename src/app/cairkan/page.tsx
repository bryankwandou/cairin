import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RedeemFlow } from "@/components/redeem/RedeemFlow";

export const metadata: Metadata = {
  title: "Cairkan",
  description:
    "Bakar IDRX di Base dan kirim rupiahnya ke rekening atau e-wallet mana pun.",
};

export default function CairkanPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Cairkan</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Tiga hal yang perlu Anda isi: ke mana rupiahnya pergi, atas nama siapa,
          dan berapa. Sisanya dikerjakan dompet Anda sendiri — Cairin tidak
          pernah memegang kunci maupun uangnya.
        </p>

        <div className="mt-8">
          <RedeemFlow />
        </div>
      </main>
      <Footer />
    </>
  );
}
