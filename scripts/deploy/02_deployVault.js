const { deployContract, nativeToken, sendTxn, readTmpAddresses, contractAt } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")
const { errors } = require("../../test/core/Vault/helpers")

const { GLP } = readTmpAddresses();
async function main() {

  const vault = await deployContract("Vault", [], "Vault")
  const usdg = await deployContract("USDG", [vault.address], "USDG")
  const router = await deployContract("Router", [vault.address, usdg.address, nativeToken.address], "Router")
  const vaultPriceFeed = await deployContract("VaultPriceFeed", [], "VaultPriceFeed")
  const shortsTracker = await deployContract("ShortsTracker", [vault.address], "ShortsTracker")

  await sendTxn(vaultPriceFeed.setMaxStrictPriceDeviation(expandDecimals(1, 28)), "vaultPriceFeed.setMaxStrictPriceDeviation") // 0.05 USD
  await sendTxn(vaultPriceFeed.setPriceSampleSpace(1), "vaultPriceFeed.setPriceSampleSpace")
  await sendTxn(vaultPriceFeed.setIsAmmEnabled(false), "vaultPriceFeed.setIsAmmEnabled")

  const glp = await contractAt("GLP", GLP.address)
  await sendTxn(glp.setInPrivateTransferMode(true), "glp.setInPrivateTransferMode")
  const glpManager = await deployContract("GlpManager", [vault.address, usdg.address, glp.address, shortsTracker.address, 15 * 60])
  await sendTxn(glpManager.setInPrivateMode(true), "glpManager.setInPrivateMode")

  await sendTxn(glp.setMinter(glpManager.address, true), "glp.setMinter")
  await sendTxn(usdg.addVault(glpManager.address), "usdg.addVault(glpManager)")

  await sendTxn(vault.initialize(
    router.address, // router
    usdg.address, // usdg
    vaultPriceFeed.address, // priceFeed
    toUsd(2), // liquidationFeeUsd
    100, // fundingRateFactor
    100 // stableFundingRateFactor
  ), "vault.initialize")

  await sendTxn(vault.setFundingRate(60 * 60, 100, 100), "vault.setFundingRate")

  await sendTxn(vault.setInManagerMode(true), "vault.setInManagerMode")
  await sendTxn(vault.setManager(glpManager.address, true), "vault.setManager")

  await sendTxn(vault.setFees(
    10, // _taxBasisPoints
    5, // _stableTaxBasisPoints
    20, // _mintBurnFeeBasisPoints
    20, // _swapFeeBasisPoints
    1, // _stableSwapFeeBasisPoints
    10, // _marginFeeBasisPoints
    toUsd(2), // _liquidationFeeUsd
    24 * 60 * 60, // _minProfitTime
    true // _hasDynamicFees
  ), "vault.setFees")

  const vaultErrorController = await deployContract("VaultErrorController", [], "VaultErrorController")
  await sendTxn(vault.setErrorController(vaultErrorController.address), "vault.setErrorController")
  await sendTxn(vaultErrorController.setErrors(vault.address, errors), "vaultErrorController.setErrors")

  const vaultUtils = await deployContract("VaultUtils", [vault.address])
  await sendTxn(vault.setVaultUtils(vaultUtils.address), "vault.setVaultUtils")
 
  await deployContract("VaultReader", [], "VaultReader")
  const reader = await deployContract("Reader", [], "Reader")

  await sendTxn(reader.setConfig(true), "Reader.setConfig")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
