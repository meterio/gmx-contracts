const { deployContract, readTmpAddresses, sendTxn } = require("../shared/helpers")

const {
  Vault,
  OrderBook,
} = readTmpAddresses();

async function main() {
  await deployContract("OrderExecutor", [Vault.address, OrderBook.address])
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
