"use client";

import { useState } from "react";
import { METAMASK_DOWNLOAD_URL, getNetworkName, shortenAddress } from "../lib/ethereum";

/**
 * Wallet section: MetaMask detection, connect/disconnect, network + balance
 * display and the wrong-network prompt. All logic lives in app/lib/ethereum.js.
 */
export default function WalletConnect({
  hasProvider,
  address,
  chainId,
  balance,
  isConnecting,
  error,
  isSepolia,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore.
    }
  }

  return (
    <section className="card" aria-labelledby="wallet-heading">
      <div className="card-header">
        <h2 id="wallet-heading">Wallet</h2>
        {address ? (
          <span className={`pill ${isSepolia ? "pill--ok" : "pill--warn"}`}>Connected</span>
        ) : (
          <span className="pill pill--muted">{isConnecting ? "Connecting…" : "Not connected"}</span>
        )}
      </div>

      {hasProvider === null && <p className="hint">Checking for MetaMask…</p>}

      {hasProvider === false && (
        <div className="banner banner--error" role="alert">
          <p>
            <strong>MetaMask was not detected in Microsoft Edge.</strong>
          </p>
          <p>
            Install the MetaMask extension from{" "}
            <a className="link" href={METAMASK_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              metamask.io/download
            </a>{" "}
            (choose Microsoft Edge), create or import a wallet, then refresh this page.
          </p>
        </div>
      )}

      {hasProvider && !address && (
        <div className="stack">
          <p className="hint">Connect your MetaMask wallet to sign transactions on Sepolia.</p>
          <button
            className="btn btn--primary"
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting…" : "Connect MetaMask"}
          </button>
        </div>
      )}

      {address && (
        <>
          <dl className="rows">
            <div className="row">
              <dt>Address</dt>
              <dd>
                <span title={address}>{shortenAddress(address)}</span>
                <button className="btn btn--ghost btn--xs" type="button" onClick={copyAddress}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </dd>
            </div>
            <div className="row">
              <dt>Network</dt>
              <dd>
                <span className={`dot ${isSepolia ? "dot--ok" : "dot--warn"}`} aria-hidden="true" />
                {getNetworkName(chainId)} <span className="muted">(chain ID {chainId ?? "—"})</span>
              </dd>
            </div>
            <div className="row">
              <dt>Balance</dt>
              <dd>{balance != null ? `${balance} ETH` : "—"}</dd>
            </div>
          </dl>

          {!isSepolia && (
            <div className="banner banner--warn">
              <p>
                This DApp runs on <strong>Sepolia</strong> (chain ID 11155111), but your wallet is
                on {getNetworkName(chainId)}.
              </p>
              <button className="btn btn--secondary" type="button" onClick={onSwitchNetwork}>
                Switch to Sepolia
              </button>
            </div>
          )}

          <button className="btn btn--secondary" type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        </>
      )}

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
