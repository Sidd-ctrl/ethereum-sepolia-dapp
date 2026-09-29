/**
 * Exports the SimpleStorage ABI produced by `npx hardhat compile` to the
 * frontend, where it is imported by the ethers v6 contract layer.
 *
 * Run this after every change to the Solidity contract:
 *   npm run export-abi
 */
const fs = require("node:fs");
const path = require("node:path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "SimpleStorage.sol",
  "SimpleStorage.json",
);
const targetPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "app",
  "lib",
  "SimpleStorage.abi.json",
);

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found — run `npx hardhat compile` first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify(artifact.abi, null, 2) + "\n");

console.log(`ABI exported to ${path.relative(path.join(__dirname, "..", ".."), targetPath)}`);
