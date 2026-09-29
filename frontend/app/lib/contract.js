import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import simpleStorageAbi from "./SimpleStorage.abi.json";

/** Public constants (safe to expose — no secrets ever live in the frontend). */
export const SEPOLIA_EXPLORER_URL = "https://sepolia.etherscan.io";
export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const contractAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();

/** Address of the deployed SimpleStorage contract (set via frontend/.env.local). */
export const CONTRACT_ADDRESS = contractAddress;

/** True when a plausible, non-placeholder contract address is configured. */
export function isContractConfigured() {
  return (
    /^0x[0-9a-fA-F]{40}$/.test(contractAddress) &&
    contractAddress !== "0x0000000000000000000000000000000000000000"
  );
}

let readOnlyProvider;

/** Read-only provider for fetching contract data (works without a wallet). */
export function getReadOnlyProvider() {
  if (!readOnlyProvider) {
    readOnlyProvider = new JsonRpcProvider(SEPOLIA_RPC_URL, undefined, { staticNetwork: true });
  }
  return readOnlyProvider;
}

/**
 * Read the stored value plus its metadata straight from Sepolia.
 * Uses the read-only RPC provider, so this works before connecting a wallet.
 */
export async function readStoredValue() {
  if (!isContractConfigured()) {
    throw new Error("Contract address is not configured.");
  }
  const contract = new Contract(contractAddress, simpleStorageAbi, getReadOnlyProvider());
  const [value, lastUpdatedBy, lastUpdatedAt] = await Promise.all([
    contract.getValue(),
    contract.lastUpdatedBy(),
    contract.lastUpdatedAt(),
  ]);
  return {
    value,
    lastUpdatedBy,
    lastUpdatedAt: lastUpdatedAt > 0n ? new Date(Number(lastUpdatedAt) * 1000) : null,
  };
}

/**
 * Submit a setValue() transaction through MetaMask.
 * Resolves once the transaction has been broadcast (not yet mined).
 *
 * @param {import("ethers").Eip1193Provider} walletProvider — window.ethereum
 * @param {bigint} value — the new uint256 value
 */
export async function submitValue(walletProvider, value) {
  const browserProvider = new BrowserProvider(walletProvider);
  const signer = await browserProvider.getSigner();
  const contract = new Contract(contractAddress, simpleStorageAbi, signer);
  return contract.setValue(value);
}

/** Validate user input for the uint256 setValue() field. */
export function validateValueInput(raw) {
  const trimmed = String(raw ?? "").trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a value first." };
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return { ok: false, error: "Only whole numbers (digits 0–9) are allowed." };
  }
  const value = BigInt(trimmed);
  const maxUint256 = (1n << 256n) - 1n;
  if (value > maxUint256) {
    return { ok: false, error: "That number is larger than the maximum uint256 value." };
  }
  return { ok: true, value };
}

/** Pretty-print a stored bigint (42n → "42", 1234567n → "1,234,567"). */
export function formatStoredValue(value) {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}
