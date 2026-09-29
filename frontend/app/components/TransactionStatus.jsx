"use client";

import { shortenAddress } from "../lib/ethereum";

const TITLES = {
  awaiting_confirmation: "Waiting for MetaMask confirmation",
  pending: "Transaction pending",
  confirmed: "Transaction confirmed",
  error: "Transaction failed",
};

const BOX_CLASSES = {
  awaiting_confirmation: "status status--pending",
  pending: "status status--pending",
  confirmed: "status status--confirmed",
  error: "status status--error",
};

/**
 * Presentational component for the transaction lifecycle:
 * idle → awaiting_confirmation → pending → confirmed | error
 */
export default function TransactionStatus({ status, explorerUrl }) {
  if (!status || status.phase === "idle") return null;

  const { phase, message, hash } = status;
  const isBusy = phase === "awaiting_confirmation" || phase === "pending";

  return (
    <div
      className={BOX_CLASSES[phase]}
      role={phase === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {isBusy && <span className="spinner" aria-hidden="true" />}
      <div className="status__body">
        <p className="status__title">{TITLES[phase]}</p>
        {message && <p className="status__message">{message}</p>}
        {hash && (
          <p className="status__hash">
            <span title={hash}>{shortenAddress(hash)}</span> ·{" "}
            <a className="link" href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noreferrer">
              View on Etherscan
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
