import { BrowserProvider, formatEther } from "ethers";

/** Sepolia network constants (the only network this DApp supports). */
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const METAMASK_DOWNLOAD_URL = "https://metamask.io/download/";

const CHAIN_NAMES = {
  1: "Ethereum Mainnet",
  10: "Optimism",
  56: "BNB Smart Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  11155111: "Sepolia Testnet",
  31337: "Hardhat Local",
};

/**
 * The EIP-1193 provider injected by MetaMask as window.ethereum.
 * All direct window access in the app goes through this helper.
 */
export function getInjectedProvider() {
  if (typeof window === "undefined") return undefined;
  return window.ethereum;
}

export function isMetaMaskInstalled() {
  return getInjectedProvider() !== undefined;
}

export function isSepoliaChain(chainId) {
  return chainId === SEPOLIA_CHAIN_ID;
}

/** Convert a hex chain id ("0xaa36a7") into a decimal number (11155111). */
export function hexToChainId(hex) {
  if (typeof hex !== "string" || hex === "") return null;
  const parsed = Number.parseInt(hex, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getNetworkName(chainId) {
  if (chainId == null) return "Unknown";
  return CHAIN_NAMES[chainId] ?? `Chain ID ${chainId}`;
}

/** 0x1234567890abcdef1234567890abcdef12345678 → 0x1234…5678 */
export function shortenAddress(value) {
  if (typeof value !== "string" || value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Format a wei balance into a short, human-readable ETH amount. */
export function formatBalance(wei) {
  const ether = formatEther(wei);
  const [whole, decimals = ""] = ether.split(".");
  const trimmed = decimals.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Ask MetaMask to connect (shows the approval prompt in the extension). */
export async function connectWallet() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("MetaMask is not installed.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return Array.isArray(accounts) ? accounts : [];
}

/** Accounts the site is already authorized to see (never shows a prompt). */
export async function getAuthorizedAccounts() {
  const provider = getInjectedProvider();
  if (!provider) return [];
  const accounts = await provider.request({ method: "eth_accounts" });
  return Array.isArray(accounts) ? accounts : [];
}

/** Current chain as a decimal number (e.g. 11155111), or null. */
export async function getCurrentChainId() {
  const provider = getInjectedProvider();
  if (!provider) return null;
  return hexToChainId(await provider.request({ method: "eth_chainId" }));
}

/** Wallet balance (in ETH) read through the injected provider. */
export async function getWalletBalance(account) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("MetaMask is not installed.");
  const ethersProvider = new BrowserProvider(provider);
  return formatBalance(await ethersProvider.getBalance(account));
}

/**
 * Ask MetaMask to switch to Sepolia. This always requires explicit approval —
 * MetaMask shows a confirmation prompt, the app never switches silently.
 * If Sepolia has not been added to MetaMask yet, it is added first.
 */
export async function switchToSepolia() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("MetaMask is not installed.");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (error) {
    // 4902 = the chain has not been added to MetaMask yet.
    if (error?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } else {
      throw error;
    }
  }
}

/** Subscribe to MetaMask account/chain changes. Returns an unsubscribe function. */
export function subscribeToWalletEvents(handlers) {
  const provider = getInjectedProvider();
  if (!provider || typeof provider.on !== "function") return () => {};

  const onAccountsChanged = (accounts) => handlers.onAccountsChanged?.(Array.from(accounts ?? []));
  const onChainChanged = (chainIdHex) => handlers.onChainChanged?.(chainIdHex ?? "");

  provider.on("accountsChanged", onAccountsChanged);
  provider.on("chainChanged", onChainChanged);

  return () => {
    provider.removeListener?.("accountsChanged", onAccountsChanged);
    provider.removeListener?.("chainChanged", onChainChanged);
  };
}

/** Turn any wallet / transaction error into a message a human can act on. */
export function describeWalletError(error) {
  const nested = error?.info?.error ?? error?.error ?? error;
  const code = error?.code ?? nested?.code;
  const message = String(
    error?.shortMessage ?? error?.message ?? nested?.shortMessage ?? nested?.message ?? error,
  );

  if (code === 4001 || code === "ACTION_REJECTED" || /user rejected|user denied/i.test(message)) {
    return "Request rejected — you cancelled the request in MetaMask.";
  }
  if (code === -32002) {
    return "A MetaMask request is already pending — open the MetaMask extension and respond to it.";
  }
  if (code === 4902) {
    return "Sepolia has not been added to MetaMask yet — approve the prompt to add and switch to it.";
  }
  if (/insufficient funds/i.test(message)) {
    return "Insufficient Sepolia ETH for gas — fund your wallet from a Sepolia faucet (see the README).";
  }
  if (/replacement transaction underpriced|nonce too low/i.test(message)) {
    return "MetaMask is out of sync with the network — clear its activity data (Settings → Advanced → Clear activity tab data) and retry.";
  }
  return `Something went wrong: ${message.slice(0, 160)}`;
}
