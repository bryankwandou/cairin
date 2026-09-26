"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, TriangleAlert, Store, MapPin, Hash } from "lucide-react";
import { parseQris, primaryAccount, MERCHANT_CRITERIA, type QrisPayload } from "@/lib/qris";
import { cn, formatIdr } from "@/lib/utils";

/**
 * The QRIS reader, running in the visitor's browser.
 *
 * This is the real parser the product uses, not a recording of one. Paste any
 * Indonesian merchant code and it decodes on the spot: no request leaves the
 * page, and the checksum is recomputed locally so a doctored code is caught
 * before anyone is asked for money.
 */

/** A genuine merchant sticker, published openly, used here as a starting point. */
const SAMPLE_CODE =
  "00020101021126680016ID.CO.TELKOM.WWW011893600898026635207502150001952663520750303UMI" +
  "51440014ID.CO.QRIS.WWW0215ID10211254059720303UMI5204549953033605502015802ID" +
  "5906BIOLBE6011KAB. MALANG610565168622005091147938120703A03630404CB";

const REDEEM_FEE_IDR = 5_000;
const MIN_REDEEM_IDR = 20_000;

type ReadResult =
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ok"; payload: QrisPayload };

export function QrisReader() {
  const [input, setInput] = useState(SAMPLE_CODE);
  const [amountText, setAmountText] = useState("45000");

  const result = useMemo<ReadResult>(() => {
    const trimmed = input.trim();
    if (!trimmed) return { status: "empty" };
    try {
      return { status: "ok", payload: parseQris(trimmed) };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Kode itu tidak terbaca.",
      };
    }
  }, [input]);

  const payload = result.status === "ok" ? result.payload : null;
  const account = payload ? primaryAccount(payload) : undefined;

  // A dynamic code already names its price; a static one leaves it to the payer.
  const amountFromCode = payload?.amount;
  const typedAmount = Number.parseInt(amountText.replace(/\D/g, ""), 10);
  const amount = amountFromCode ?? (Number.isFinite(typedAmount) ? typedAmount : 0);

  const belowFloor = amount > 0 && amount < MIN_REDEEM_IDR;
  const totalBurn = amount > 0 ? amount + REDEEM_FEE_IDR : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,13,14,0.04),0_12px_32px_-12px_rgba(11,13,14,0.12)]">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <p className="text-sm font-medium">Baca kode QRIS</p>
        <p className="text-xs text-ink-faint">Diproses di perangkat Anda</p>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
        {/* Input side */}
        <div className="border-b border-line p-5 md:border-b-0 md:border-r">
          <label
            htmlFor="qris-input"
            className="mb-2 block text-xs font-medium text-ink-muted"
          >
            Tempel isi kode QRIS
          </label>
          <textarea
            id="qris-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            rows={6}
            className="tabular w-full resize-none rounded-lg border border-line bg-surface-sunken p-3 text-[11px] leading-relaxed text-ink outline-none transition-colors focus:border-brand"
            placeholder="00020101021126…"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput(SAMPLE_CODE)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong hover:bg-surface-sunken"
            >
              Pakai contoh asli
            </button>
            <button
              type="button"
              onClick={() =>
                setInput(SAMPLE_CODE.replace("KAB. MALANG", "KAB. KEDIRI"))
              }
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong hover:bg-surface-sunken"
            >
              Coba kode yang diubah
            </button>
            <button
              type="button"
              onClick={() => setInput("")}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-sunken"
            >
              Kosongkan
            </button>
          </div>

          {payload && !payload.crcValid ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-danger-wash p-3 text-xs leading-relaxed text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Checksum tidak cocok. Kode ini sudah berubah sejak dicetak, jadi
                Cairin menolak meneruskannya. Seharusnya{" "}
                <span className="tabular">{payload.crcExpected}</span>, yang tertulis{" "}
                <span className="tabular">{payload.crcFound}</span>.
              </span>
            </p>
          ) : null}
        </div>

        {/* Output side */}
        <div className="p-5">
          {result.status === "empty" ? (
            <p className="text-sm text-ink-faint">
              Tempel sebuah kode untuk melihat isinya.
            </p>
          ) : result.status === "error" ? (
            <div className="flex items-start gap-2 rounded-lg bg-danger-wash p-3 text-xs leading-relaxed text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{result.message}</span>
            </div>
          ) : payload ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Store className="h-3.5 w-3.5" aria-hidden />
                    Merchant
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {payload.merchantName ?? "Tanpa nama"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {payload.merchantCity ?? "—"}
                    {payload.postalCode ? ` ${payload.postalCode}` : ""}
                  </p>
                </div>
                <ChecksumBadge valid={payload.crcValid} />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
                <Row label="Jenis kode">
                  {payload.initiationMethod === "static"
                    ? "Statis, nominal diisi pembayar"
                    : payload.initiationMethod === "dynamic"
                      ? "Dinamis, nominal sudah tertulis"
                      : "Tidak dikenali"}
                </Row>
                <Row label="Kategori usaha">
                  {account?.criteria
                    ? (MERCHANT_CRITERIA[account.criteria] ?? account.criteria)
                    : "—"}
                </Row>
                <Row label="Penyelenggara">{account?.guid ?? "—"}</Row>
                <Row label="Mata uang">
                  {payload.currencyCode === "360" ? "360 · Rupiah" : (payload.currencyCode ?? "—")}
                </Row>
              </dl>

              {account?.merchantId ? (
                <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                  <Hash className="h-3 w-3" aria-hidden />
                  <span className="tabular">{account.merchantId}</span>
                </p>
              ) : null}

              {/* Payout maths */}
              <div className="rounded-xl border border-line bg-surface-sunken p-4">
                <label
                  htmlFor="qris-amount"
                  className="mb-1.5 block text-xs font-medium text-ink-muted"
                >
                  {amountFromCode !== undefined
                    ? "Nominal dari kode"
                    : "Nominal yang dibayar"}
                </label>

                {amountFromCode !== undefined ? (
                  <p className="tabular text-2xl font-semibold">
                    {formatIdr(amountFromCode)}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted">Rp</span>
                    <input
                      id="qris-amount"
                      inputMode="numeric"
                      value={amountText}
                      onChange={(event) => setAmountText(event.target.value)}
                      className="tabular w-full rounded-lg border border-line bg-surface px-3 py-2 text-lg font-semibold outline-none transition-colors focus:border-brand"
                    />
                  </div>
                )}

                {belowFloor ? (
                  <p className="mt-2 rounded-lg bg-warn-wash p-2.5 text-[11px] leading-relaxed text-warn">
                    Penerbit tidak melayani pencairan di bawah{" "}
                    {formatIdr(MIN_REDEEM_IDR)}. Di bawah itu, membayar tunai lebih
                    masuk akal daripada membayar biaya.
                  </p>
                ) : amount > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                    <li className="flex justify-between">
                      <span className="text-ink-muted">Diterima merchant</span>
                      <span className="tabular font-medium">{formatIdr(amount)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-ink-muted">Biaya penerbit</span>
                      <span className="tabular font-medium">
                        {formatIdr(REDEEM_FEE_IDR)}
                      </span>
                    </li>
                    <li className="flex justify-between border-t border-line pt-1.5">
                      <span className="font-medium">IDRX yang dibakar</span>
                      <span className="tabular font-semibold text-brand-ink">
                        {formatIdr(totalBurn)}
                      </span>
                    </li>
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className="border-t border-line bg-surface-sunken px-5 py-3 text-[11px] leading-relaxed text-ink-muted">
        Membaca kode itu terbuka dan tidak butuh izin siapa pun. Membayar merchant
        QRIS butuh lisensi Bank Indonesia, dan Cairin tidak memilikinya — yang
        dilakukan Cairin adalah mengisi dompet yang membayar kode itu.{" "}
        <a href="/legal" className="text-brand-ink underline underline-offset-2">
          Batasannya kami tulis terbuka
          <ArrowRight className="ml-0.5 inline h-3 w-3" aria-hidden />
        </a>
      </p>
    </div>
  );
}

function ChecksumBadge({ valid }: { valid: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        valid ? "bg-brand-wash text-brand-ink" : "bg-danger-wash text-danger",
      )}
    >
      {valid ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <TriangleAlert className="h-3 w-3" aria-hidden />
      )}
      {valid ? "Checksum cocok" : "Checksum gagal"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </>
  );
}
