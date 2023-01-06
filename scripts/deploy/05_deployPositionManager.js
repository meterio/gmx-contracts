const { readTmpAddresses, deployContract, contractAt, sendTxn, nativeToken, wallet } = require("../shared/helpers")

const {
  Router,
  Vault,
  Timelock,
  ShortsTracker,
  OrderBook,
  ReferralStorage,
  FastPriceEvents
} = readTmpAddresses();

const depositFee = 30 // 0.3%


const orderKeepers = [
  { address: wallet.address }
]
const liquidators = [
  { address: wallet.address }
]

async function main() {
  const vault = await contractAt("Vault", Vault.address)
  const timelock = await contractAt("Timelock", Timelock.address)
  const router = await contractAt("Router", Router.address)
  const shortsTracker = await contractAt("ShortsTracker", ShortsTracker.address)
  const weth = await contractAt("WETH", nativeToken.address)
  const orderBook = await contractAt("OrderBook", OrderBook.address)
  const referralStorage = await contractAt("ReferralStorage", ReferralStorage.address)

  const positionManagerArgs = [
    vault.address,
    router.address,
    shortsTracker.address,
    weth.address,
    depositFee,
    orderBook.address
  ]
  const positionManager = await deployContract("PositionManager", positionManagerArgs)


  await sendTxn(positionManager.setReferralStorage(referralStorage.address), "positionManager.setReferralStorage")

  await sendTxn(positionManager.setShouldValidateIncreaseOrder(false), "positionManager.setShouldValidateIncreaseOrder(false)")

  for (let i = 0; i < orderKeepers.length; i++) {
    const orderKeeper = orderKeepers[i]
    if (!(await positionManager.isOrderKeeper(orderKeeper.address))) {
      await sendTxn(positionManager.setOrderKeeper(orderKeeper.address, true), "positionManager.setOrderKeeper(orderKeeper)")
    }
  }

  for (let i = 0; i < liquidators.length; i++) {
    const liquidator = liquidators[i]
    if (!(await positionManager.isLiquidator(liquidator.address))) {
      await sendTxn(positionManager.setLiquidator(liquidator.address, true), "positionManager.setLiquidator(liquidator)")
    }
  }

  if (!(await timelock.isHandler(positionManager.address))) {
    await sendTxn(timelock.setContractHandler(positionManager.address, true), "timelock.setContractHandler(positionManager)")
  }
  if (!(await vault.isLiquidator(positionManager.address))) {
    await sendTxn(vault.setLiquidator(positionManager.address, true), "timelock.setLiquidator(vault, positionManager, true)")
  }
  if (!(await shortsTracker.isHandler(positionManager.address))) {
    await sendTxn(shortsTracker.setHandler(positionManager.address, true), "shortsTracker.setContractHandler(positionManager.address, true)")
  }
  if (!(await router.plugins(positionManager.address))) {
    await sendTxn(router.addPlugin(positionManager.address), "router.addPlugin(positionManager)")
  }

  if ((await positionManager.gov()) != (await vault.gov())) {
    await sendTxn(positionManager.setGov(await vault.gov()), "positionManager.setGov")
  }

  console.log("done.")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
