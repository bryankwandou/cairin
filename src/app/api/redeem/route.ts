import { NextResponse } from "next/server";
import { decodeEventLog, isAddress, type Address } from "viem";
import {
  requestRedeem,
  hashBankAccount,
  IdrxUnavailable,
  MIN_REDEEM_IDR,
  MAX_REDEEM_IDR,
} from "@/lib/idrx";
import {
  IDRX_ABI,
  IDRX_BASE_ADDRESS,
  isSupportedChain,
  publicClientFor,
  unitsToIdr,
} from "@/lib/chain";

export const dynamic = "force-dynamic";

/**
 * Turns a confirmed burn into a rupiah payout.
 *
 * The important design decision here is that nothing the browser sends is
 * trusted. A caller could claim any amount, any destination, any transaction.
 * So before the issuer is asked for a single rupiah, this route goes to the
 * chain and reads what actually happened:
 *
 *   1. the transaction exists and succeeded
 *   2. it touched the IDRX contract, not some lookalike
 *   3. it emitted a burn, and the burn came from the wallet claiming it
 *   4. the burned amount equals the amount being requested
 *   5. the destination hash recorded on chain matches the bank details supplied
 *
 * Step five is what stops someone burning tokens against their own account and
 * then redirecting the rupiah to a different one.
 */

interface RedeemBody {
  txHash?: string;
  chainId?: number;
  walletAddress?: string;
  bankName?: string;
  bankCode?: string;
  bankAccount?: string;
  bankAccountName?: string;
  notes?: string;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: "invalid-request", message }, { status });
}

export async function POST(request: Request) {
  let body: RedeemBody;
  try {
    body = (await request.json()) as RedeemBody;
  } catch {
    return bad("Badan permintaan bukan JSON yang sah.");
  }

  const { txHash, chainId, walletAddress, bankName, bankCode, bankAccount, bankAccountName } =
    body;

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return bad("Hash transaksi tidak berbentuk hash yang sah.");
  }
  if (typeof chainId !== "number" || !isSupportedChain(chainId)) {
    return bad("Jaringan itu tidak didukung. Cairin menyelesaikan di Base.");
  }
  if (!walletAddress || !isAddress(walletAddress)) {
    return bad("Alamat dompet tidak sah.");
  }
  if (!bankName?.trim() || !bankCode?.trim() || !bankAccount?.trim() || !bankAccountName?.trim()) {
    return bad("Rincian tujuan belum lengkap.");
  }

  // --- Read what the chain actually says -----------------------------------

  const client = publicClientFor(chainId);

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return NextResponse.json(
      {
        error: "burn-not-found",
        message:
          "Transaksi itu belum terlihat di jaringan. Tunggu sampai terkonfirmasi, lalu coba lagi.",
      },
      { status: 409 },
    );
  }

  if (receipt.status !== "success") {
    return NextResponse.json(
      {
        error: "burn-failed",
        message: "Transaksi itu gagal di jaringan, jadi tidak ada yang bisa dicairkan.",
      },
      { status: 409 },
    );
  }

  // Find the burn event, and insist it came from the real IDRX contract.
  const idrxAddress = IDRX_BASE_ADDRESS.toLowerCase();
  let burnedUnits: bigint | null = null;
  let burner: Address | null = null;
  let onChainHash: string | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== idrxAddress) continue;
    try {
      const decoded = decodeEventLog({
        abi: IDRX_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "BurnWithAccountNumber") continue;
      const args = decoded.args as unknown as {
        burner: Address;
        amount: bigint;
        hashedAccountNumber: string;
      };
      burnedUnits = args.amount;
      burner = args.burner;
      onChainHash = args.hashedAccountNumber;
      break;
    } catch {
      // Not the event we are after; keep looking.
    }
  }

  if (burnedUnits === null || burner === null || onChainHash === null) {
    return NextResponse.json(
      {
        error: "not-a-burn",
        message:
          "Transaksi itu tidak memuat pembakaran IDRX. Pencairan hanya bisa dibangun di atas pembakaran yang nyata.",
      },
      { status: 409 },
    );
  }

  if (burner.toLowerCase() !== walletAddress.toLowerCase()) {
    return NextResponse.json(
      {
        error: "wrong-burner",
        message: "Pembakaran itu dilakukan dompet lain, bukan dompet yang meminta pencairan.",
      },
      { status: 403 },
    );
  }

  // The destination recorded on chain must be the destination being asked for.
  const expectedHash = hashBankAccount(bankName.trim(), bankAccount.trim());
  if (onChainHash.toLowerCase() !== expectedHash.toLowerCase()) {
    return NextResponse.json(
      {
        error: "destination-mismatch",
        message:
          "Tujuan yang tercatat saat pembakaran berbeda dengan tujuan yang diminta sekarang. Pencairan dihentikan.",
      },
      { status: 409 },
    );
  }

  const amountIdr = unitsToIdr(burnedUnits);

  if (amountIdr < MIN_REDEEM_IDR) {
    return bad(
      `Yang dibakar setara Rp${amountIdr.toLocaleString("id-ID")}, di bawah batas terendah penerbit.`,
      409,
    );
  }
  if (amountIdr > MAX_REDEEM_IDR) {
    return bad(
      "Nominal itu melampaui batas jalur otomatis penerbit.",
      409,
    );
  }

  // --- Only now do we ask the issuer to pay --------------------------------

  try {
    const result = await requestRedeem({
      txHash,
      networkChainId: String(chainId),
      amountIdr,
      walletAddress,
      destination: {
        bankName: bankName.trim(),
        bankCode: bankCode.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountName: bankAccountName.trim(),
      },
      notes: body.notes?.trim() || undefined,
    });

    return NextResponse.json({
      ok: true,
      amountIdr,
      alreadySubmitted: result.alreadyExists === true,
      issuerReference: result.custRefNumber ?? result.disburseId ?? null,
      burnStatus: result.burnStatus ?? null,
    });
  } catch (error) {
    if (error instanceof IdrxUnavailable) {
      // The tokens are already burned at this point. Say so, rather than
      // letting the user believe nothing happened.
      return NextResponse.json(
        {
          error: error.reason,
          message: error.message,
          detail: error.detail,
          burnedAlready: true,
          amountIdr,
          txHash,
          recovery:
            "IDRX Anda sudah terbakar dan bukti itu permanen di rantai. Simpan hash transaksi ini; permintaan pencairan bisa diajukan ulang dengan bukti yang sama tanpa membakar lagi.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "unknown", message: "Pencairan tidak dapat diselesaikan." },
      { status: 500 },
    );
  }
}
