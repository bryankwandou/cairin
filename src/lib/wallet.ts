"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  type Address,
  type EIP1193Provider,
} from "viem";
import { base, SUPPORTED_CHAINS, isSupportedChain, type SupportedChainId } from "./chain";

/**
 * Wallet access, kept deliberately small.
 *
 * Cairin talks to whatever injected wallet the browser already has. There is no
 * connector registry, no project id, no third-party modal — fewer moving parts
 * between a user and a signature they are about to give, and nothing that
 * phones home about which addresses visited the site.
 */

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  hasProvider: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
    hasProvider: false,
  });

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;

    setState((s) => ({ ...s, hasProvider: true }));

    // Pick up an account the user has already granted, without prompting.
    void (async () => {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as Address[];
        const chainIdHex = (await provider.request({
          method: "eth_chainId",
        })) as string;
        if (accounts?.length) {
          setState((s) => ({
            ...s,
            address: accounts[0],
            chainId: Number.parseInt(chainIdHex, 16),
          }));
        }
      } catch {
        // A wallet that refuses to answer quietly is fine; the user can still
        // press connect.
      }
    })();

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as Address[];
      setState((s) => ({ ...s, address: accounts?.[0] ?? null }));
    };
    const onChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      setState((s) => ({ ...s, chainId: Number.parseInt(chainIdHex, 16) }));
    };

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      setState((s) => ({
        ...s,
        error:
          "Tidak ada dompet di peramban ini. Pasang dompet yang mendukung Base, lalu muat ulang halaman.",
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as Address[];
      const chainIdHex = (await provider.request({
        method: "eth_chainId",
      })) as string;
      setState((s) => ({
        ...s,
        address: accounts[0] ?? null,
        chainId: Number.parseInt(chainIdHex, 16),
        connecting: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        connecting: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : "Dompet menolak permintaan sambungan.",
      }));
    }
  }, []);

  /** Asks the wallet to move to Base, adding the network if it is unknown. */
  const switchToChain = useCallback(async (chainId: SupportedChainId) => {
    const provider = window.ethereum;
    if (!provider) return;

    const chain = SUPPORTED_CHAINS[chainId];
    const hexId = `0x${chainId.toString(16)}`;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId as `0x${string}` }],
      });
    } catch (error) {
      // 4902 means the wallet has never heard of this chain.
      const code = (error as { code?: number })?.code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId as `0x${string}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [...chain.rpcUrls.default.http],
              blockExplorerUrls: chain.blockExplorers
                ? [chain.blockExplorers.default.url]
                : undefined,
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }, []);

  return { ...state, connect, switchToChain };
}

/** A wallet client bound to the injected provider, for sending transactions. */
export function walletClientFor(chainId: SupportedChainId, account: Address) {
  const provider = window.ethereum;
  if (!provider) throw new Error("Tidak ada dompet di peramban ini.");
  return createWalletClient({
    account,
    chain: SUPPORTED_CHAINS[chainId] ?? base,
    transport: custom(provider),
  });
}

export { isSupportedChain };
