"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SEPOLIA_EXPLORER_URL,
  formatStoredValue,
  readStoredValue,
  submitValue,
  validateValueInput,
} from "../lib/contract";
import { describeWalletError, getInjectedProvider, shortenAddress } from "../lib/ethereum";
import TransactionStatus from "./TransactionStatus";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Contract section: reads the stored value through a read-only RPC provider
 * and submits setValue() transactions through MetaMask. All blockchain logic
 * lives in app/lib/contract.js and app/lib/ethereum.js.
 */
export default function ContractInteraction({
  hasProvider,
  address,
  isSepolia,
  contractConfigured,
}) {
  const [storedValue, setStoredValue] = useState(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isReading, setIsReading] = useState(true);
  const [readError, setReadError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(null);
  const [txStatus, setTxStatus] = useState({ phase: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadValue = useCallback(async () => {
    if (!contractConfigured) {
      setIsReading(false);
      return;
    }
    setIsReading(true);
    setReadError(null);
    try {
      const info = await readStoredValue();
      setStoredValue(info.value);
      setLastUpdatedBy(info.lastUpdatedBy);
      setLastUpdatedAt(info.lastUpdatedAt);
    } catch (error) {
      console.error("Failed to read the contract:", error);
      setReadError(
        "Could not read the contract — the Sepolia RPC endpoint may be unreachable. Check your connection and try again.",
      );
    } finally {
      setIsReading(false);
    }
  }, [contractConfigured]);

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  const canWrite = hasProvider && Boolean(address) && isSepolia && contractConfigured;
  const writeHint = !contractConfigured
    ? "Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local to enable updates."
    : !hasProvider
      ? "Install MetaMask to update the value."
      : !address
        ? "Connect your wallet to update the value."
        : !isSepolia
          ? "Switch to the Sepolia network to update the value."
          : null;

  async function handleUpdate(event) {
    event.preventDefault();
    setInputError(null);

    const validation = validateValueInput(inputValue);
    if (!validation.ok) {
      setInputError(validation.error);
      return;
    }
    const walletProvider = getInjectedProvider();
    if (!walletProvider) return;

    setIsSubmitting(true);
    setTxStatus({
      phase: "awaiting_confirmation",
      message: "Open MetaMask and confirm the transaction.",
    });
    try {
      const tx = await submitValue(walletProvider, validation.value);
      setTxStatus({
        phase: "pending",
        hash: tx.hash,
        message: "Transaction submitted — waiting for it to be mined on Sepolia…",
      });
      const receipt = await tx.wait(1);
      if (receipt == null) {
        setTxStatus({
          phase: "error",
          message: "The transaction could not be confirmed — it may have been dropped or replaced.",
        });
      } else if (receipt.status === 1) {
        setTxStatus({
          phase: "confirmed",
          hash: tx.hash,
          message: `Confirmed in block ${receipt.blockNumber}.`,
        });
        setInputValue("");
        await loadValue();
      } else {
        setTxStatus({
          phase: "error",
          hash: tx.hash,
          message: "The transaction reverted on-chain.",
        });
      }
    } catch (error) {
      console.error("setValue failed:", error);
      setTxStatus({ phase: "error", message: describeWalletError(error), hash: null });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card" aria-labelledby="contract-heading">
      <div className="card-header">
        <h2 id="contract-heading">Smart contract · SimpleStorage</h2>
        <button
          className="btn btn--ghost btn--xs"
          type="button"
          onClick={loadValue}
          disabled={isReading}
        >
          {isReading ? "Reading…" : "Refresh"}
        </button>
      </div>

      {!contractConfigured ? (
        <div className="banner banner--warn">
          <p>
            <strong>No contract address configured.</strong> Deploy the contract to Sepolia and set{" "}
            <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code>frontend/.env.local</code>, then
            restart the dev server. See the README for details.
          </p>
        </div>
      ) : (
        <>
          <dl className="rows">
            <div className="row">
              <dt>Stored value</dt>
              <dd className="value">
                {isReading && storedValue == null ? "Reading…" : formatStoredValue(storedValue)}
              </dd>
            </div>
            <div className="row">
              <dt>Last updated by</dt>
              <dd>
                {lastUpdatedBy && lastUpdatedBy !== ZERO_ADDRESS
                  ? shortenAddress(lastUpdatedBy)
                  : "Never updated"}
              </dd>
            </div>
            <div className="row">
              <dt>Last updated at</dt>
              <dd>
                {lastUpdatedAt
                  ? `${lastUpdatedAt.toLocaleDateString()} ${lastUpdatedAt.toLocaleTimeString()}`
                  : "—"}
              </dd>
            </div>
          </dl>

          {readError && (
            <div className="banner banner--error" role="alert">
              <p>{readError}</p>
              <button className="btn btn--secondary" type="button" onClick={loadValue}>
                Retry
              </button>
            </div>
          )}

          <form className="form" onSubmit={handleUpdate}>
            <label className="label" htmlFor="new-value">
              New value (uint256)
            </label>
            <div className="form-controls">
              <input
                id="new-value"
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 42"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                disabled={!canWrite || isSubmitting}
              />
              <button
                className="btn btn--primary"
                type="submit"
                disabled={!canWrite || isSubmitting}
              >
                {isSubmitting ? "Updating…" : "Update value"}
              </button>
            </div>
            {inputError && <p className="input-error">{inputError}</p>}
            {writeHint && <p className="hint">{writeHint}</p>}
          </form>

          <TransactionStatus status={txStatus} explorerUrl={SEPOLIA_EXPLORER_URL} />
        </>
      )}
    </section>
  );
}
