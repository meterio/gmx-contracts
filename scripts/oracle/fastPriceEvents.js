const { ethers } = require("hardhat");
const { deployContract, readTmpAddresses, nativeToken, sendTxn, override, wallet, contractAt } = require("../shared/helpers")

const MTRG = "0x8a419ef4941355476cf04933e90bf3bbf2f73814";
const MTR = "0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271";
const WitnetFeed_MTR = "0xF346eEbbA5280f509BcCEa8Df9298660d99BD5D1"
const WitnetFeed_MTRG = "0x3218E21240968c650C03A4657C22275951Dd9232"
const { FastPriceEvents } = readTmpAddresses();

async function main() {
  console.log("Wallet:", wallet.address)
  const witnetFeed_MTR = await ethers.getContractAt("IWitnetFeed", WitnetFeed_MTR);
  const witnetFeed_MTRG = await ethers.getContractAt("IWitnetFeed", WitnetFeed_MTRG);

  const lastPrice_MTR = (await witnetFeed_MTR.lastPrice()).mul(1e12);
  const lastPrice_MTRG = (await witnetFeed_MTRG.lastPrice()).mul(1e12);

  console.log("lastPrice_MTR:", lastPrice_MTR.toString());
  console.log("lastPrice_MTRG:", lastPrice_MTRG.toString());

  const fastPriceEvents = await contractAt("FastPriceEvents", FastPriceEvents.address);
  await fastPriceEvents.setIsPriceFeed("0x1381C573b97Bf393A81fA42760DD21E109d8092B", true);
  await sendTxn(fastPriceEvents.emitPriceEvent(MTR, lastPrice_MTR), "FastPriceEvents.emitPriceEvent(MTR,lastPrice_MTR)")
  await sendTxn(fastPriceEvents.emitPriceEvent(MTRG, lastPrice_MTRG), "FastPriceEvents.emitPriceEvent(MTRG,lastPrice_MTRG)")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
