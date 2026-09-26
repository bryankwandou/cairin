import Link from "next/link";
import { CairinMark } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <CairinMark className="h-6 w-6" idSuffix="-footer" />
            <span className="text-lg font-semibold tracking-[-0.045em]">cairin</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            Pencairan aset kripto ke rupiah lewat IDRX di jaringan Base. Dana tidak
            pernah singgah di tangan kami.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-ink-faint">Produk</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/cairkan" className="text-ink-muted hover:text-ink">
                Cairkan
              </Link>
            </li>
            <li>
              <Link href="/cara-kerja" className="text-ink-muted hover:text-ink">
                Cara kerja
              </Link>
            </li>
            <li>
              <Link href="/biaya" className="text-ink-muted hover:text-ink">
                Biaya
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium text-ink-faint">Keterbukaan</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/legal" className="text-ink-muted hover:text-ink">
                Yang belum bisa kami lakukan
              </Link>
            </li>
            <li>
              <Link href="/status" className="text-ink-muted hover:text-ink">
                Status rail
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/bryankwandou/cairin"
                className="text-ink-muted hover:text-ink"
                target="_blank"
                rel="noreferrer"
              >
                Kode sumber
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>
            Cairin bukan penyelenggara jasa pembayaran berizin. Pencairan rupiah
            dijalankan oleh penerbit IDRX.
          </p>
          <p className="tabular">IDRX di Base · 0x18Bc…3C22</p>
        </div>
      </div>
    </footer>
  );
}
