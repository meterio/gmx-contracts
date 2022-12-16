const { deployContract, readTmpAddresses, nativeToken, sendTxn, override, wallet, contractAt } = require("../../shared/helpers")
const { expandDecimals } = require("../../../test/shared/utilities")
const { readFileSync, writeFileSync } = require("fs");
const file = "./scripts/deploy/oracle/metertest.json"
const tokensJson = JSON.parse(readFileSync(file).toString());
const { tokens } = tokensJson;
const { VaultPriceFeed } = readTmpAddresses();
async function main() {
  const vaultPriceFeed = await contractAt("VaultPriceFeed", VaultPriceFeed.address)
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    let contract = await deployContract(
      "PriceFeed",
      [token.symbol],
      `PriceFeed_${token.symbol}`
    )
    tokensJson.tokens[i].priceFeed = contract.address;
    writeFileSync(file, JSON.stringify(tokensJson));
    if (token.oracle.type == 1) {
      await sendTxn(contract.setFixedPrice(token.oracle.price, override), `PriceFeed_${token.symbol}.setFixedPrice(${token.oracle.price})`)
    } else if (token.oracle.type == 2) {
      await sendTxn(contract.setBandFeed(
        token.oracle.feed,
        token.decimals,
        18,
        token.oracle.name,
        override
      ), `PriceFeed_${token.symbol}.setBandFeed(${token.oracle.feed},${token.decimals},18,${token.oracle.name})`);
    } else if (token.oracle.type == 3) {
      await sendTxn(contract.setWitnetFeed(
        token.oracle.feed,
        token.decimals,
        6,
        override
      ), `PriceFeed_${token.symbol}.setWitnetFeed(${token.oracle.feed},${token.decimals},6)`);
    }
    let label = `VaultPriceFeed.setTokenConfig(${token.address},${contract.address},18,${token.stable})`.toString();

    await sendTxn(vaultPriceFeed.setTokenConfig(token.address, contract.address, 18, token.stable, override), label)
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
