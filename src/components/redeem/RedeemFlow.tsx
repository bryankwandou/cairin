"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useWallet, walletClientFor } from "@/lib/wallet";
import {
  IDRX_ABI,
  IDRX_BASE_ADDRESS,
  base,
  explorerTxUrl,
  idrToUnits,
  isSupportedChain,
  publicClientFor,
  unitsToIdr,
  type SupportedChainId,
} from "@/lib/chain";
import { cn, formatIdr, truncateHash } from "@/lib/utils";

const MIN_REDEEM_IDR = 20_000;
const MAX_REDEEM_IDR = 1_000_000_000;
const REDEEM_FEE_IDR = 5_000;
const REALTIME_CEILING_IDR = 250_000_000;

/** Hashes the destination the same way the server and the issuer do. */
async function hashDestination(bankName: string, account: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${bankName}_${account}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface RailStatus {
  ready: boolean;
  reason?: string;
  message: string;
  detail?: string;
  destinationCount?: number;
}

interface TransferMethod {
  bankCode: string;
  bankName: string;
}

type Stage =
  | { name: "idle" }
  | { name: "burning" }
  | { name: "confirming"; txHash: string }
  | { name: "submitting"; txHash: string }
  | { name: "done"; txHash: string; amountIdr: number; reference: string | null }
  | {
      name: "failed";
      message: string;
      detail?: string;
      txHash?: string;
      burnedAlready?: boolean;
      recovery?: string;
    };

export function RedeemFlow() {
  const wallet = useWallet();
  const [rail, setRail] = useState<RailStatus | null>(null);
  const [methods, setMethods] = useState<TransferMethod[]>([]);

  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [balanceIdr, setBalanceIdr] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "idle" });

  // Ask the server whether payouts can run at all before offering any control.
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/status");
        setRail((await response.json()) as RailStatus);
      } catch {
        setRail({
          ready: false,
          reason: "issuer-unreachable",
          message: "Status rail tidak dapat dibaca.",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!rail?.ready) return;
    void (async () => {
      try {
        const response = await fetch("/api/methods");
        if (!response.ok) return;
        const data = (await response.json()) as { methods: TransferMethod[] };
        setMethods(data.methods ?? []);
      } catch {
        // The form still works with a typed bank name.
      }
    })();
  }, [rail?.ready]);

  const chainId: SupportedChainId | null =
    wallet.chainId && isSupportedChain(wallet.chainId) ? wallet.chainId : null;

  // Read the on-chain balance so nobody types an amount they cannot cover.
  useEffect(() => {
    if (!wallet.address || !chainId) {
      setBalanceIdr(null);
      return;
    }
    void (async () => {
      try {
        const client = publicClientFor(chainId);
        const units = await client.readContract({
          address: IDRX_BASE_ADDRESS,
          abi: IDRX_ABI,
          functionName: "balanceOf",
          args: [wallet.address!],
        });
        setBalanceIdr(unitsToIdr(units as bigint));
      } catch {
        setBalanceIdr(null);
      }
    })();
  }, [wallet.address, chainId, stage.name]);

  const amount = useMemo(() => {
    const digits = amountText.replace(/\D/g, "");
    const value = Number.parseInt(digits, 10);
    return Number.isFinite(value) ? value : 0;
  }, [amountText]);

  const totalBurn = amount > 0 ? amount + REDEEM_FEE_IDR : 0;
  const insufficient = balanceIdr !== null && totalBurn > balanceIdr;

  const problems = useMemo(() => {
    const list: string[] = [];
    if (amount > 0 && amount < MIN_REDEEM_IDR) {
      list.push(`Penerbit tidak melayani di bawah ${formatIdr(MIN_REDEEM_IDR)}.`);
    }
    if (amount > MAX_REDEEM_IDR) {
      list.push("Nominal itu melampaui batas jalur otomatis penerbit.");
    }
    if (insufficient) {
      list.push(
        `Saldo IDRX Anda ${formatIdr(balanceIdr ?? 0)}, kurang untuk membakar ${formatIdr(totalBurn)}.`,
      );
    }
    return list;
  }, [amount, insufficient, balanceIdr, totalBurn]);

  const formReady =
    rail?.ready === true &&
    wallet.address !== null &&
    chainId !== null &&
    bankName.trim().length > 0 &&
    bankCode.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    accountName.trim().length > 0 &&
    amount >= MIN_REDEEM_IDR &&
    amount <= MAX_REDEEM_IDR &&
    !insufficient;

  const busy =
    stage.name === "burning" || stage.name === "confirming" || stage.name === "submitting";

  const start = useCallback(async () => {
    if (!formReady || !wallet.address || !chainId) return;

    setStage({ name: "burning" });

    let txHash: string;
    try {
      const destinationHash = await hashDestination(
        bankName.trim(),
        accountNumber.trim(),
      );
      const client = walletClientFor(chainId, wallet.address);

      txHash = await client.writeContract({
        address: IDRX_BASE_ADDRESS,
        abi: IDRX_ABI,
        functionName: "burnWithAccountNumber",
        args: [idrToUnits(totalBurn), destinationHash],
      });
    } catch (error) {
      setStage({
        name: "failed",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Dompet membatalkan pembakaran.",
        detail: "Tidak ada token yang terbakar, jadi tidak ada yang perlu dipulihkan.",
      });
      return;
    }

    setStage({ name: "confirming", txHash });

    try {
      const publicClient = publicClientFor(chainId);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      if (receipt.status !== "success") {
        setStage({
          name: "failed",
          message: "Pembakaran gagal di jaringan.",
          txHash,
        });
        return;
      }
    } catch {
      setStage({
        name: "failed",
        message: "Konfirmasi jaringan tidak terbaca. Simpan hash ini dan periksa sendiri.",
        txHash,
      });
      return;
    }

    setStage({ name: "submitting", txHash });

    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          chainId,
          walletAddress: wallet.address,
          bankName: bankName.trim(),
          bankCode: bankCode.trim(),
          bankAccount: accountNumber.trim(),
          bankAccountName: accountName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStage({
          name: "failed",
          message: data.message ?? "Penerbit menolak permintaan.",
          detail: data.detail,
          txHash,
          burnedAlready: data.burnedAlready,
          recovery: data.recovery,
        });
        return;
      }

      setStage({
        name: "done",
        txHash,
        amountIdr: data.amountIdr,
        reference: data.issuerReference ?? null,
      });
    } catch {
      setStage({
        name: "failed",
        message: "Permintaan ke server gagal setelah pembakaran berhasil.",
        txHash,
        burnedAlready: true,
        recovery:
          "IDRX Anda sudah terbakar dan buktinya permanen. Simpan hash transaksi ini untuk mengajukan ulang tanpa membakar lagi.",
      });
    }
  }, [formReady, wallet.address, chainId, bankName, bankCode, accountNumber, accountName, totalBurn]);

  /* ---------------------------------------------------------------- render */

  if (rail && !rail.ready) {
    return <RailClosed rail={rail} />;
  }

  if (stage.name === "done") {
    return (
      <Settled
        stage={stage}
        chainId={chainId ?? base.id}
        onReset={() => {
          setStage({ name: "idle" });
          setAmountText("");
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Wallet */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-medium">Dompet</h2>
        {wallet.address ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tabular text-sm font-medium">
                {truncateHash(wallet.address, 8, 6)}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {chainId
                  ? `Terhubung ke ${chainId === base.id ? "Base" : "Base Sepolia"}`
                  : "Jaringan ini tidak didukung"}
              </p>
            </div>
            {balanceIdr !== null ? (
              <div className="text-right">
                <p className="text-xs text-ink-muted">Saldo IDRX</p>
                <p className="tabular text-lg font-semibold">{formatIdr(balanceIdr)}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void wallet.connect()}
              disabled={wallet.connecting}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {wallet.connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wallet className="h-4 w-4" aria-hidden />
              )}
              Sambungkan dompet
            </button>
            {wallet.error ? (
              <p className="mt-2 text-xs text-danger">{wallet.error}</p>
            ) : null}
          </div>
        )}

        {wallet.address && !chainId ? (
          <button
            type="button"
            onClick={() => void wallet.switchToChain(base.id)}
            className="mt-3 rounded-lg border border-line px-3 py-2 text-xs font-medium hover:bg-surface-sunken"
          >
            Pindah ke jaringan Base
          </button>
        ) : null}
      </section>

      {/* Destination */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-medium">Tujuan rupiah</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Untuk e-wallet, isi nomor telepon terdaftar dalam bentuk lokal seperti
          0812…, tanpa spasi atau tanda baca.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Bank atau e-wallet" htmlFor="bank">
            {methods.length > 0 ? (
              <select
                id="bank"
                value={bankCode}
                onChange={(event) => {
                  const found = methods.find((m) => m.bankCode === event.target.value);
                  setBankCode(event.target.value);
                  setBankName(found?.bankName ?? "");
                }}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">Pilih tujuan</option>
                {methods.map((method) => (
                  <option key={method.bankCode} value={method.bankCode}>
                    {method.bankName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="bank"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="BANK CENTRAL ASIA"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            )}
          </Field>

          {methods.length === 0 ? (
            <Field label="Kode bank" htmlFor="bankCode">
              <input
                id="bankCode"
                value={bankCode}
                onChange={(event) => setBankCode(event.target.value)}
                placeholder="014"
                className="tabular w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
          ) : null}

          <Field label="Nomor rekening atau telepon" htmlFor="account">
            <input
              id="account"
              inputMode="numeric"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="7255759001"
              className="tabular w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>

          <Field label="Nama pemilik rekening" htmlFor="accountName">
            <input
              id="accountName"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value.toUpperCase())}
              placeholder="NAMA SESUAI BUKU TABUNGAN"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>
        </div>
      </section>

      {/* Amount */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-medium">Nominal</h2>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg text-ink-muted">Rp</span>
          <input
            inputMode="numeric"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            placeholder="0"
            aria-label="Nominal rupiah yang diterima"
            className="tabular w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-2xl font-semibold outline-none focus:border-brand"
          />
        </div>

        {amount > 0 ? (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <li className="flex justify-between">
              <span className="text-ink-muted">Mendarat di tujuan</span>
              <span className="tabular font-medium">{formatIdr(amount)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink-muted">Biaya penerbit</span>
              <span className="tabular font-medium">{formatIdr(REDEEM_FEE_IDR)}</span>
            </li>
            <li className="flex justify-between border-t border-line pt-1.5">
              <span className="font-medium">IDRX yang dibakar</span>
              <span className="tabular font-semibold text-brand-ink">
                {formatIdr(totalBurn)}
              </span>
            </li>
            <li className="pt-2 text-xs text-ink-muted">
              {amount <= REALTIME_CEILING_IDR
                ? "Cair seketika, termasuk di luar jam kerja."
                : "Lewat RTGS: hanya Senin sampai Jumat, 08.00 hingga 15.00 WIB."}
            </li>
          </ul>
        ) : null}

        {problems.length > 0 ? (
          <ul className="mt-4 space-y-1.5 rounded-lg bg-warn-wash p-3 text-xs leading-relaxed text-warn">
            {problems.map((problem) => (
              <li key={problem} className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {problem}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {stage.name === "failed" ? <Failure stage={stage} chainId={chainId ?? base.id} /> : null}

      <button
        type="button"
        onClick={() => void start()}
        disabled={!formReady || busy}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-medium transition-opacity",
          formReady && !busy
            ? "bg-ink text-paper hover:opacity-90"
            : "cursor-not-allowed bg-surface-sunken text-ink-faint",
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {stage.name === "burning"
          ? "Menunggu tanda tangan dompet"
          : stage.name === "confirming"
            ? "Menunggu konfirmasi jaringan"
            : stage.name === "submitting"
              ? "Meneruskan bukti ke penerbit"
              : "Bakar IDRX dan cairkan"}
        {!busy ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Pembakaran tidak bisa dibatalkan. Periksa lagi nomor tujuannya sebelum
        menandatangani.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function RailClosed({ rail }: { rail: RailStatus }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warn-wash text-warn">
          <TriangleAlert className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold">Pencairan sedang tidak bisa dijalankan</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rail.message}</p>
          {rail.detail ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">{rail.detail}</p>
          ) : null}
          <p className="mt-4 rounded-lg bg-surface-sunken p-3 text-xs leading-relaxed">
            Formulir sengaja ditutup, bukan disamarkan. Mengumpulkan nomor
            rekening untuk pencairan yang tidak bisa berjalan hanya memindahkan
            kekecewaan ke belakang.
          </p>
        </div>
      </div>
    </div>
  );
}

function Settled({
  stage,
  chainId,
  onReset,
}: {
  stage: Extract<Stage, { name: "done" }>;
  chainId: SupportedChainId;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-wash text-brand-ink">
        <Check className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-semibold">Permintaan diterima penerbit</h2>
      <p className="tabular mt-2 text-3xl font-semibold">{formatIdr(stage.amountIdr)}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
        Penerbit sudah memegang bukti pembakaran Anda dan sedang mengirim
        rupiahnya. Yang bisa Cairin pastikan berhenti di sini; sisanya ada pada
        penerbit dan bank tujuan.
      </p>

      <dl className="mt-5 space-y-2 rounded-xl bg-surface-sunken p-4 text-left text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Hash pembakaran</dt>
          <dd>
            <a
              href={explorerTxUrl(chainId, stage.txHash)}
              target="_blank"
              rel="noreferrer"
              className="tabular inline-flex items-center gap-1 text-brand-ink underline underline-offset-2"
            >
              {truncateHash(stage.txHash)}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </dd>
        </div>
        {stage.reference ? (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Nomor rujukan penerbit</dt>
            <dd className="tabular">{stage.reference}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-sunken"
      >
        Cairkan lagi
      </button>
    </div>
  );
}

function Failure({
  stage,
  chainId,
}: {
  stage: Extract<Stage, { name: "failed" }>;
  chainId: SupportedChainId;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        stage.burnedAlready
          ? "border-danger/30 bg-danger-wash"
          : "border-line bg-surface-sunken",
      )}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          className={cn("mt-0.5 h-4 w-4 shrink-0", stage.burnedAlready ? "text-danger" : "text-ink-muted")}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{stage.message}</p>
          {stage.detail ? (
            <p className="mt-1.5 break-words text-xs leading-relaxed text-ink-muted">
              {stage.detail}
            </p>
          ) : null}
          {stage.recovery ? (
            <p className="mt-2 rounded-lg bg-surface p-3 text-xs leading-relaxed">
              {stage.recovery}
            </p>
          ) : null}
          {stage.txHash ? (
            <a
              href={explorerTxUrl(chainId, stage.txHash)}
              target="_blank"
              rel="noreferrer"
              className="tabular mt-2 inline-flex items-center gap-1 text-xs text-brand-ink underline underline-offset-2"
            >
              {truncateHash(stage.txHash)}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
