/**
 * Sanity-checks a deployed SimpleStorage contract: reads the current value,
 * submits a setValue() transaction, waits for it to be mined and reads the
 * value back. Useful to verify a deployment without the frontend.
 *
 * Usage: npx hardhat run scripts/interact.js --network localhost
 */
const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const recordPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(recordPath)) {
    console.error(
      `No deployment record found for network "${hre.network.name}". Run the deploy script first.`,
    );
    process.exit(1);
  }

  const { address } = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("SimpleStorage", address, signer);

  console.log(`SimpleStorage @ ${address} (network: ${hre.network.name})`);
  console.log(`Current value   : ${await contract.getValue()}`);
  console.log(`Last updated by : ${await contract.lastUpdatedBy()}`);

  const newValue = (await contract.getValue()) === 123n ? 456n : 123n;
  console.log(`\nSending setValue(${newValue}) from ${signer.address}…`);
  const tx = await contract.setValue(newValue);
  console.log(`Transaction hash: ${tx.hash}`);
  await tx.wait(1);

  console.log(`\n✅ Value after tx : ${await contract.getValue()}`);
  console.log(`Last updated by  : ${await contract.lastUpdatedBy()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
