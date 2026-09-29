/**
 * Deploys the SimpleStorage contract.
 *
 * Local network  : npm run deploy:local    (needs `npm run node` in another terminal)
 * Sepolia testnet: npm run deploy:sepolia  (needs contracts/.env — see .env.example)
 */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

/** Pre-flight checks for Sepolia deployments. */
function preflightSepolia() {
  const problems = [];

  if (!process.env.SEPOLIA_RPC_URL) {
    problems.push("SEPOLIA_RPC_URL is not set (add it to contracts/.env).");
  }
  if (!process.env.PRIVATE_KEY) {
    problems.push("PRIVATE_KEY is not set (add it to contracts/.env).");
  } else if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY)) {
    problems.push(
      "PRIVATE_KEY looks malformed — expected 0x followed by 64 hexadecimal characters.",
    );
  }

  if (problems.length > 0) {
    console.error("❌ Sepolia deployment aborted — fix these first:");
    for (const problem of problems) {
      console.error(`   • ${problem}`);
    }
    console.error("   Hint: copy contracts/.env.example to contracts/.env and fill it in.");
    console.error("   Never commit .env — it is already listed in .gitignore.");
    process.exit(1);
  }

  console.warn(
    "⚠️  Security reminder: only use a dedicated development wallet that holds TEST ETH.",
  );
  console.warn("   Never use a private key that controls real funds for testnet development.\n");
}

async function main() {
  const network = hre.network.name;

  if (network === "sepolia") {
    preflightSepolia();
  }

  const { chainId } = await hre.ethers.provider.getNetwork();
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying SimpleStorage…");
  console.log(`   Network : ${network} (chain ID ${chainId})`);
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance : ${hre.ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    console.warn(
      "   ⚠️  The deployer has no ETH — the deployment will fail. Fund the wallet first.",
    );
  }

  const SimpleStorage = await hre.ethers.getContractFactory("SimpleStorage");
  const contract = await SimpleStorage.deploy();

  console.log(`   Tx hash : ${contract.deploymentTransaction().hash}`);
  console.log("   Waiting for the deployment transaction to be mined…");

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n✅ SimpleStorage deployed at ${address}`);

  if (network === "sepolia") {
    console.log(`   Explorer: https://sepolia.etherscan.io/address/${address}`);
    console.log("\n👉 Next step: put this address in frontend/.env.local as");
    console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  }

  // Persist a deployment record so the address is never lost.
  const record = {
    contract: "SimpleStorage",
    network,
    chainId: Number(chainId),
    address,
    deployer: deployer.address,
    transactionHash: contract.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
  };
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `${network}.json`),
    JSON.stringify(record, null, 2) + "\n",
  );
  console.log(`   Record  : contracts/deployments/${network}.json`);
}

main().catch((error) => {
  console.error("Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});
