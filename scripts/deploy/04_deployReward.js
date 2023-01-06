const { deployContract, nativeToken, sendTxn, readTmpAddresses, wallet, contractAt, expandDecimals } = require("../shared/helpers")

const {
  Router,
  Vault,
  USDG,
  ShortsTracker,
  GlpManager,
  RewardRouter,
  FastPriceEvents
} = readTmpAddresses();
const depositFee = "30" // 0.3%
const minExecutionFee = "20000000000000000" // 0.02 AVAX
const buffer = 24 * 60 * 60
const maxTokenSupply = expandDecimals("13250000", 18)

async function main() {
  await deployContract("RewardReader", [], "RewardReader")

  const orderBook = await deployContract("OrderBook", []);
  await deployContract("OrderBookReader", [])

  await sendTxn(orderBook.initialize(
    Router.address, // router
    Vault.address, // vault
    nativeToken.address, // weth
    USDG.address, // usdg
    "10000000000000000", // 0.01 AVAX
    expandDecimals(10, 30) // min purchase token amount usd
  ), "orderBook.initialize");
  const tokenManager = await deployContract("TokenManager", [1], "TokenManager")
  await sendTxn(tokenManager.initialize([wallet.address]), "tokenManager.initialize")
  await deployContract("OrderExecutor", [Vault.address, orderBook.address])

  const referralStorage = await deployContract("ReferralStorage", [])
  await deployContract("ReferralReader", [], "ReferralReader")
  const timelock = await deployContract("Timelock", [
    wallet.address, // admin
    buffer, // buffer
    tokenManager.address, // tokenManager
    tokenManager.address, // mintReceiver
    GlpManager.address, // glpManager
    RewardRouter.address, // rewardRouter
    maxTokenSupply, // maxTokenSupply
    10, // marginFeeBasisPoints 0.1%
    500 // maxMarginFeeBasisPoints 5%
  ], "Timelock")

  const positionRouterArgs = [
    Vault.address,
    Router.address,
    nativeToken.address,
    ShortsTracker.address,
    depositFee,
    minExecutionFee
  ]
  const positionRouter = await deployContract("PositionRouter", positionRouterArgs)

  await sendTxn(positionRouter.setReferralStorage(referralStorage.address), "positionRouter.setReferralStorage")
  await sendTxn(timelock.signalSetHandler(referralStorage.address, positionRouter.address, true), "referralStorage.signalSetHandler(positionRouter)")

  const shortsTracker = await contractAt("ShortsTracker", ShortsTracker.address);
  await sendTxn(shortsTracker.setHandler(positionRouter.address, true), "shortsTracker.setHandler(positionRouter)")

  const router = await contractAt("Router", Router.address);
  await sendTxn(router.addPlugin(positionRouter.address), "router.addPlugin")

  await sendTxn(positionRouter.setDelayValues(1, 180, 30 * 60), "positionRouter.setDelayValues")
  await sendTxn(timelock.setContractHandler(positionRouter.address, true), "timelock.setContractHandler(positionRouter)")

  const vault = await contractAt("Vault", Vault.address)
  await sendTxn(positionRouter.setGov(await vault.gov()), "positionRouter.setGov")
  await sendTxn(referralStorage.setHandler(positionRouter.address, true), "referralStorage.setHandler(positionRouter)")

  const secondaryPriceFeed = await deployContract("FastPriceFeed", [
    5 * 60, // _priceDuration
    60 * 60, // _maxPriceUpdateDelay
    1, // _minBlockInterval
    250, // _maxDeviationBasisPoints
    FastPriceEvents.address, // _fastPriceEvents
    wallet.address, // _tokenManager
    positionRouter.address
  ])

  const vaultPriceFeed = await deployContract("VaultPriceFeed", [])

  await sendTxn(vaultPriceFeed.setMaxStrictPriceDeviation(expandDecimals(1, 28)), "vaultPriceFeed.setMaxStrictPriceDeviation") // 0.01 USD
  await sendTxn(vaultPriceFeed.setPriceSampleSpace(1), "vaultPriceFeed.setPriceSampleSpace")
  await sendTxn(vaultPriceFeed.setSecondaryPriceFeed(secondaryPriceFeed.address), "vaultPriceFeed.setSecondaryPriceFeed")
  await sendTxn(vaultPriceFeed.setIsAmmEnabled(false), "vaultPriceFeed.setIsAmmEnabled")


  const fastPriceTokens = {
    MTR: {
      name: "MTR",
      address: "0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271",
      decimals: 18,
      priceFeed: "",
      priceDecimals: 18,
      fastPricePrecision: 1000,
      maxCumulativeDeltaDiff: 0.10 * 10 * 1000 * 1000, // 10%
      isStrictStable: false,
      tokenWeight: 15000,
      minProfitBps: 0,
      maxUsdgAmount: 80 * 1000 * 1000,
      bufferAmount: 2000,
      isStable: false,
      isShortable: true,
      maxGlobalLongSize: 30 * 1000 * 1000,
      maxGlobalShortSize: 20 * 1000 * 1000,
    },
    MTRG: {
      name: "MTRG",
      address: "0x8a419ef4941355476cf04933e90bf3bbf2f73814",
      decimals: 18,
      priceFeed: "",
      priceDecimals: 18,
      fastPricePrecision: 1000,
      maxCumulativeDeltaDiff: 0.10 * 10 * 1000 * 1000, // 10%
      isStrictStable: false,
      tokenWeight: 35000,
      minProfitBps: 0,
      maxUsdgAmount: 150 * 1000 * 1000,
      bufferAmount: 65000,
      isStable: false,
      isShortable: true,
      maxGlobalLongSize: 65 * 1000 * 1000,
      maxGlobalShortSize: 40 * 1000 * 1000,
    }
  }
  await sendTxn(secondaryPriceFeed.initialize(1, [wallet.address], [wallet.address]), "secondaryPriceFeed.initialize")
  await sendTxn(secondaryPriceFeed.setTokens(
    [
      '0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271',
      '0x8a419ef4941355476cf04933e90bf3bbf2f73814'
    ],
    [
      1000,
      1000
    ]
  ), "secondaryPriceFeed.setTokens")
  await sendTxn(secondaryPriceFeed.setVaultPriceFeed(vaultPriceFeed.address), "secondaryPriceFeed.setVaultPriceFeed")
  await sendTxn(secondaryPriceFeed.setMaxTimeDeviation(60 * 60), "secondaryPriceFeed.setMaxTimeDeviation")
  await sendTxn(secondaryPriceFeed.setSpreadBasisPointsIfInactive(50), "secondaryPriceFeed.setSpreadBasisPointsIfInactive")
  await sendTxn(secondaryPriceFeed.setSpreadBasisPointsIfChainError(500), "secondaryPriceFeed.setSpreadBasisPointsIfChainError")
  await sendTxn(secondaryPriceFeed.setMaxCumulativeDeltaDiffs(
    [
      '0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271',
      '0x8a419ef4941355476cf04933e90bf3bbf2f73814'
    ],
    [
      1000000,
      1000000
    ]
  ), "secondaryPriceFeed.setMaxCumulativeDeltaDiffs")
  await sendTxn(secondaryPriceFeed.setPriceDataInterval(1 * 60), "secondaryPriceFeed.setPriceDataInterval")

  const fastPriceEvents = await contractAt("FastPriceEvents", FastPriceEvents.address)
  await sendTxn(positionRouter.setPositionKeeper(secondaryPriceFeed.address, true), "positionRouter.setPositionKeeper(secondaryPriceFeed)")
  await sendTxn(fastPriceEvents.setIsPriceFeed(secondaryPriceFeed.address, true), "fastPriceEvents.setIsPriceFeed")

  const priceFeedTimelock = await deployContract("PriceFeedTimelock", [
    wallet.address,
    buffer,
    tokenManager.address
  ], "PriceFeedTimelock")
  await sendTxn(priceFeedTimelock.setContractHandler(wallet.address, true), `deployedTimelock.setContractHandler(${wallet.address})`)
  await sendTxn(priceFeedTimelock.setKeeper(wallet.address, true), `deployedTimelock.setKeeper(${wallet.address})`)

  await sendTxn(vaultPriceFeed.setGov(priceFeedTimelock.address), "vaultPriceFeed.setGov")
  await sendTxn(secondaryPriceFeed.setGov(priceFeedTimelock.address), "secondaryPriceFeed.setGov")
  await sendTxn(secondaryPriceFeed.setTokenManager(tokenManager.address), "secondaryPriceFeed.setTokenManager")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
