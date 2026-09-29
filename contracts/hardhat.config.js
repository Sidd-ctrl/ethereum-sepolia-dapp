require("@nomicfoundation/hardhat-toolbox");
const path = require("node:path");

// Load contracts/.env regardless of the directory Hardhat is invoked from.
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Secrets come exclusively from contracts/.env — never from this file.
// See .env.example for the expected values.
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Built-in in-process network used by `npx hardhat test`.
    hardhat: { chainId: 31337 },
    // `npm run node` in a second terminal, then `npm run deploy:local`.
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    // Ethereum Sepolia testnet (chain ID 11155111).
    // The deploy script requires SEPOLIA_RPC_URL and PRIVATE_KEY to be set
    // explicitly in contracts/.env before it will talk to Sepolia.
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Optional: only enabled when an Etherscan API key is configured.
  ...(ETHERSCAN_API_KEY ? { etherscan: { apiKey: { sepolia: ETHERSCAN_API_KEY } } } : {}),
};
