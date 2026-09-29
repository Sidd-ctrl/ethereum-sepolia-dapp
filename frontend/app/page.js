"use client";

import { useCallback, useEffect, useState } from "react";
import ContractInteraction from "./components/ContractInteraction";
import WalletConnect from "./components/WalletConnect";
import { isContractConfigured } from "./lib/contract";
import {
  connectWallet,
  describeWalletError,
  getAuthorizedAccounts,
  getCurrentChainId,
  getInjectedProvider,
  getWalletBalance,
  hexToChainId,
  isSepoliaChain,
  subscribeToWalletEvents,
  switchToSepolia,
} from "./lib/ethereum";

/**
 * Page shell: owns the wallet state and wires the two feature sections
 * together. All blockchain interaction lives in app/lib/.
 */
export default function HomePage() {
  const [hasProvider, setHasProvider] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const refreshBalance = useCallback(async (account) => {
    try {
      setBalance(await getWalletBalance(account));
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    setHasProvider(Boolean(provider));
    if (!provider) return undefined;

    // Silent reconnect: if this site was connected before, MetaMask exposes
    // the account again without showing a prompt.
    (async () => {
      try {
        setChainId(await getCurrentChainId());
        const accounts = await getAuthorizedAccounts();
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          refreshBalance(accounts[0]);
        }
      } catch {
        // A failed silent probe is harmless — the user can still connect manually.
      }
    })();

    // Keep the UI in sync with everything the user does inside MetaMask.
    return subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          setAddress(null);
          setBalance(null);
        } else {
          setAddress(accounts[0]);
          refreshBalance(accounts[0]);
        }
      },
      onChainChanged: (chainIdHex) => {
        setChainId(hexToChainId(chainIdHex));
      },
    });
  }, [refreshBalance]);

  async function handleConnect() {
    setWalletError(null);
    if (!getInjectedProvider()) return;
    setIsConnecting(true);
    try {
      const accounts = await connectWallet();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setChainId(await getCurrentChainId());
        refreshBalance(accounts[0]);
      }
    } catch (error) {
      setWalletError(describeWalletError(error));
    } finally {
      setIsConnecting(false);
    }
  }

  function handleDisconnect() {
    // MetaMask has no "disconnect this site" RPC — resetting the local UI
    // state is the standard pattern (the user can also lock MetaMask).
    setAddress(null);
    setBalance(null);
    setWalletError(null);
  }

  async function handleSwitchNetwork() {
    setWalletError(null);
    try {
      await switchToSepolia();
    } catch (error) {
      setWalletError(describeWalletError(error));
    }
  }

  return (
    <main className="page">
      <header className="header">
        <svg className="logo" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 1.5 20 12l-8 10.5L4 12Z" fill="#8b7cf6" />
          <path d="M12 1.5 20 12l-8 3.2L4 12Z" fill="#c4b5fd" />
        </svg>
        <h1 className="title">SimpleStorage DApp</h1>
        <p className="subtitle">
          A minimal decentralized app on the <span className="network-badge">Sepolia testnet</span>{" "}
          — connect MetaMask in Microsoft Edge, then read and update a value stored in a smart
          contract.
        </p>
      </header>

      <WalletConnect
        hasProvider={hasProvider}
        address={address}
        chainId={chainId}
        balance={balance}
        isConnecting={isConnecting}
        error={walletError}
        isSepolia={isSepoliaChain(chainId)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSwitchNetwork={handleSwitchNetwork}
      />

      <ContractInteraction
        hasProvider={hasProvider === true}
        address={address}
        isSepolia={isSepoliaChain(chainId)}
        contractConfigured={isContractConfigured()}
      />

      <footer className="footer">
        <p>
          Test network only — transactions use Sepolia test ETH with no real value · built with
          Next.js, ethers v6 and Hardhat.
        </p>
      </footer>
    </main>
  );
}
