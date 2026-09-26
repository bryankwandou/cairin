import { createPublicClient, http, defineChain, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * The on-chain half of a payout.
 *
 * Cairin never holds a key and never moves tokens on anyone's behalf. The user's
 * own wallet calls burn on the IDRX contract; everything here exists to read
 * chain state and to describe that call accurately enough that a wallet can
 * show the user what they are about to sign.
 */

export const IDRX_BASE_ADDRESS: Address =
  "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22";

/** IDRX carries two decimals on Base, so one rupiah is 100 base units. */
export const IDRX_DECIMALS = 2;

export { base, baseSepolia };

/** Chains we are prepared to settle from, keyed by id. */
export const SUPPORTED_CHAINS = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

export function isSupportedChain(id: number): id is SupportedChainId {
  return id in SUPPORTED_CHAINS;
}

/**
 * The slice of the IDRX contract we actually touch.
 *
 * burnWithAccountNumber is the redemption entry point: it destroys the caller's
 * tokens and records a hash of the destination, which is what the issuer later
 * matches a payout against. Everything else here is read-only.
 */
export const IDRX_ABI = [
  {
    type: "function",
    name: "burnWithAccountNumber",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "hashedAccountNumber", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "BurnWithAccountNumber",
    inputs: [
      { name: "burner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "hashedAccountNumber", type: "string", indexed: false },
    ],
  },
] as const;

/** A read-only client for the given chain. */
export function publicClientFor(chainId: SupportedChainId) {
  const chain = SUPPORTED_CHAINS[chainId];
  const rpcUrl =
    chainId === base.id
      ? process.env.NEXT_PUBLIC_BASE_RPC_URL
      : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;

  return createPublicClient({
    chain,
    transport: http(rpcUrl || undefined),
  });
}

/** Converts whole rupiah into IDRX base units. */
export function idrToUnits(amountIdr: number): bigint {
  if (!Number.isInteger(amountIdr) || amountIdr < 0) {
    throw new Error("Nominal rupiah harus bilangan bulat yang tidak negatif.");
  }
  return BigInt(amountIdr) * 10n ** BigInt(IDRX_DECIMALS);
}

/** Converts IDRX base units back into whole rupiah, rounding down. */
export function unitsToIdr(units: bigint): number {
  return Number(units / 10n ** BigInt(IDRX_DECIMALS));
}

/** Where to send someone to inspect a transaction themselves. */
export function explorerTxUrl(chainId: SupportedChainId, txHash: string): string {
  const base_ = SUPPORTED_CHAINS[chainId].blockExplorers?.default.url;
  return `${base_}/tx/${txHash}`;
}

export function explorerAddressUrl(
  chainId: SupportedChainId,
  address: string,
): string {
  const base_ = SUPPORTED_CHAINS[chainId].blockExplorers?.default.url;
  return `${base_}/address/${address}`;
}

/** A local Base fork, handy when developing without spending testnet funds. */
export const baseLocal = defineChain({
  id: 31337,
  name: "Base Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});
