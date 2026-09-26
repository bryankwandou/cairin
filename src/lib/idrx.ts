import { createHmac, createHash } from "node:crypto";

// The signing secret must never reach a browser bundle. Rather than depend on
// a package to enforce that, fail loudly the moment this module is evaluated
// anywhere with a window object.
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/idrx.ts is server-only: it holds the issuer signing secret. Import it from a route handler or server component, never from client code.",
  );
}

/**
 * Client for the IDRX API.
 *
 * IDRX is a rupiah-denominated token issued against a bank reserve. Burning it
 * on chain and posting the burn to this API instructs the issuer to pay the
 * matching rupiah into an Indonesian bank account or e-wallet. That is the
 * licensed leg of a payout — we do not hold or move rupiah ourselves.
 *
 * Every figure below comes from the published documentation at docs.idrx.co
 * rather than from assumption. Where a limit exists, we enforce it here so a
 * request that cannot succeed is refused before it costs the user a burn.
 */

/** Where the API lives. Signatures cover the full URL, so this must match exactly. */
const API_ROOT = "https://idrx.co/api";

/** Chain ids we are willing to settle from. */
export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * IDRX contract on Base. Two decimals, so one rupiah is 100 base units.
 * Source: docs.idrx.co/introduction/supported-chain-and-contract-address
 */
export const IDRX_BASE_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;
export const IDRX_DECIMALS = 2;

/**
 * Redemption bounds, in whole rupiah.
 * Below the floor the issuer rejects the request; above the ceiling it stops
 * being an API call and becomes a support conversation.
 */
export const MIN_REDEEM_IDR = 20_000;
export const MAX_REDEEM_IDR = 1_000_000_000;

/** Above this, settlement leaves the instant rail and waits for RTGS hours. */
export const REALTIME_CEILING_IDR = 250_000_000;

/** Issuer's redemption fee, in whole rupiah. */
export const REDEEM_FEE_IDR = 5_000;
export const REDEEM_FEE_RTGS_IDR = 35_000;

export type SettlementSpeed = "realtime" | "business-hours" | "manual-review";

/** How quickly a given amount can actually land, and what the issuer charges. */
export function settlementFor(amountIdr: number): {
  speed: SettlementSpeed;
  feeIdr: number;
  note: string;
} {
  if (amountIdr <= REALTIME_CEILING_IDR) {
    return {
      speed: "realtime",
      feeIdr: REDEEM_FEE_IDR,
      note: "Cair seketika, termasuk di luar jam kerja dan akhir pekan.",
    };
  }
  if (amountIdr < MAX_REDEEM_IDR) {
    return {
      speed: "business-hours",
      feeIdr: REDEEM_FEE_RTGS_IDR,
      note: "Lewat RTGS, hanya Senin sampai Jumat pukul 08.00 hingga 15.00 WIB.",
    };
  }
  return {
    speed: "manual-review",
    feeIdr: REDEEM_FEE_RTGS_IDR,
    note: "Di atas satu miliar rupiah, penerbit meninjau permintaan secara manual.",
  };
}

/* -------------------------------------------------------------------------- */
/* Credentials                                                                */
/* -------------------------------------------------------------------------- */

export interface IdrxCredentials {
  apiKey: string;
  /** Base64-encoded; decoded before use as the HMAC key. */
  secretKey: string;
}

/**
 * Why a payout cannot proceed. Each of these is surfaced to the user verbatim
 * rather than being smoothed into a generic failure — a payout that silently
 * reports success it did not achieve is worse than no payout at all.
 */
export type IdrxUnavailableReason =
  | "credentials-missing"
  | "credentials-rejected"
  | "amount-below-minimum"
  | "amount-above-maximum"
  | "issuer-unreachable";

export class IdrxUnavailable extends Error {
  readonly reason: IdrxUnavailableReason;
  readonly detail?: string;

  constructor(reason: IdrxUnavailableReason, message: string, detail?: string) {
    super(message);
    this.name = "IdrxUnavailable";
    this.reason = reason;
    this.detail = detail;
  }
}

/**
 * Reads credentials from the environment.
 *
 * Returns null rather than throwing, so a deployment without credentials still
 * builds and still serves every read-only page. What it must never do is let a
 * payout path believe it is configured when it is not.
 */
export function readCredentials(): IdrxCredentials | null {
  const apiKey = process.env.IDRX_API_KEY?.trim();
  const secretKey = process.env.IDRX_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) return null;
  return { apiKey, secretKey };
}

export function isConfigured(): boolean {
  return readCredentials() !== null;
}

/* -------------------------------------------------------------------------- */
/* Signing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Signs a request the way IDRX expects.
 *
 * HMAC-SHA256 over timestamp, method, full URL and body in that order. The
 * secret arrives base64-encoded and is decoded before it becomes the key; the
 * digest goes out base64url.
 *
 * Source: docs.idrx.co/api/generating-a-signature
 */
export function createSignature(
  method: string,
  url: string,
  body: unknown,
  timestamp: string,
  secretKey: string,
): string {
  const secret = Buffer.from(secretKey, "base64");
  const hmac = createHmac("sha256", secret);
  hmac.update(timestamp);
  hmac.update(method);
  hmac.update(url);
  if (body !== undefined && body !== null) {
    hmac.update(Buffer.from(JSON.stringify(body)));
  }
  return hmac.digest("base64url");
}

/**
 * Hashes a bank destination for the on-chain burn.
 *
 * The contract records only this digest, never the account number itself, so
 * the chain carries proof that a specific destination was intended without
 * publishing where the money went.
 *
 * Format is exactly `{bankName}_{accountNumber}`; any deviation produces a
 * digest the issuer will not match against.
 */
export function hashBankAccount(bankName: string, accountNumber: string): string {
  return createHash("sha256").update(`${bankName}_${accountNumber}`).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                  */
/* -------------------------------------------------------------------------- */

async function signedRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const credentials = readCredentials();
  if (!credentials) {
    throw new IdrxUnavailable(
      "credentials-missing",
      "Pencairan belum bisa dijalankan: kredensial penerbit belum dipasang di server ini.",
    );
  }

  const url = `${API_ROOT}${path}`;
  const timestamp = Date.now().toString();
  const signature = createSignature(method, url, body, timestamp, credentials.secretKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "idrx-api-key": credentials.apiKey,
        "idrx-api-sig": signature,
        "idrx-api-ts": timestamp,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    throw new IdrxUnavailable(
      "issuer-unreachable",
      "Penerbit IDRX tidak dapat dihubungi. Dana Anda tidak berpindah.",
      cause instanceof Error ? cause.message : undefined,
    );
  }

  const text = await response.text();

  if (response.status === 401 || response.status === 403) {
    throw new IdrxUnavailable(
      "credentials-rejected",
      "Penerbit menolak kredensial server ini. Pencairan dihentikan.",
      text.slice(0, 400),
    );
  }

  if (!response.ok) {
    throw new IdrxUnavailable(
      "issuer-unreachable",
      `Penerbit menjawab dengan status ${response.status}. Pencairan dihentikan.`,
      text.slice(0, 400),
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new IdrxUnavailable(
      "issuer-unreachable",
      "Jawaban penerbit tidak dapat dibaca. Pencairan dihentikan.",
      text.slice(0, 400),
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export interface PayoutDestination {
  /** Bank name exactly as the issuer spells it, e.g. "BANK CENTRAL ASIA". */
  bankName: string;
  /** Issuer's numeric code for that bank, e.g. "014". */
  bankCode: string;
  /**
   * Account number. For an e-wallet this is the registered phone number in
   * local form — 08xx, digits only.
   */
  bankAccount: string;
  /** Legal name on the account. */
  bankAccountName: string;
}

export interface TransferMethod {
  bankCode: string;
  bankName: string;
  [key: string]: unknown;
}

/** The issuer's list of destinations it will pay to, banks and e-wallets alike. */
export async function listTransferMethods(): Promise<TransferMethod[]> {
  const result = await signedRequest<{ data?: TransferMethod[] }>(
    "GET",
    "/transaction/method",
  );
  return result.data ?? [];
}

export interface RedeemRequest {
  /** Hash of the on-chain burn that funds this payout. */
  txHash: string;
  /** Chain the burn happened on, as a decimal string. */
  networkChainId: string;
  /** Whole rupiah to pay out. */
  amountIdr: number;
  /** Wallet that performed the burn. */
  walletAddress: string;
  destination: PayoutDestination;
  /** Required when the account holder is not the IDRX account holder. */
  notes?: string;
}

export interface RedeemResponse {
  id?: string | number;
  txHash?: string;
  amount?: string | number;
  burnStatus?: string;
  custRefNumber?: string;
  disburseId?: string;
  createdAt?: string;
  /** Set when this burn was already submitted; the payout is not duplicated. */
  alreadyExists?: boolean;
  redeemRequestId?: string | number;
  [key: string]: unknown;
}

/**
 * Asks the issuer to pay out against a burn that already happened on chain.
 *
 * Order matters and is not negotiable: the tokens must be burned first. The
 * burn is the authorisation. Calling this before the burn confirms produces a
 * request the issuer cannot honour.
 */
export async function requestRedeem(request: RedeemRequest): Promise<RedeemResponse> {
  const { amountIdr } = request;

  if (!Number.isInteger(amountIdr)) {
    throw new IdrxUnavailable(
      "amount-below-minimum",
      "Nominal pencairan harus bilangan bulat rupiah.",
    );
  }
  if (amountIdr < MIN_REDEEM_IDR) {
    throw new IdrxUnavailable(
      "amount-below-minimum",
      `Nominal terkecil yang diterima penerbit adalah Rp${MIN_REDEEM_IDR.toLocaleString("id-ID")}.`,
    );
  }
  if (amountIdr > MAX_REDEEM_IDR) {
    throw new IdrxUnavailable(
      "amount-above-maximum",
      `Nominal terbesar lewat jalur otomatis adalah Rp${MAX_REDEEM_IDR.toLocaleString("id-ID")}.`,
    );
  }

  return signedRequest<RedeemResponse>("POST", "/transaction/redeem-request", {
    txHash: request.txHash,
    networkChainId: request.networkChainId,
    amountTransfer: String(amountIdr),
    bankAccount: request.destination.bankAccount,
    bankCode: request.destination.bankCode,
    bankName: request.destination.bankName,
    bankAccountName: request.destination.bankAccountName,
    walletAddress: request.walletAddress,
    ...(request.notes ? { notes: request.notes } : {}),
  });
}

export interface TransactionRecord {
  id?: string | number;
  txHash?: string;
  burnStatus?: string;
  amount?: string | number;
  createdAt?: string;
  [key: string]: unknown;
}

/** Reads back what the issuer believes happened, which is the only source of truth. */
export async function transactionHistory(params?: {
  page?: number;
  take?: number;
}): Promise<TransactionRecord[]> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.take) search.set("take", String(params.take));
  const query = search.toString();
  const result = await signedRequest<{ data?: TransactionRecord[] }>(
    "GET",
    `/transaction/user-transaction-history${query ? `?${query}` : ""}`,
  );
  return result.data ?? [];
}
