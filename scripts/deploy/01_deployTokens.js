const { deployContract } = require("../shared/helpers")

async function main() {
  await deployContract("GMX",[],"GMX");
  await deployContract("EsGMX",[],"EsGMX");
  await deployContract("GLP",[],"GLP");
  await deployContract("MintableBaseToken",["Bonus GMX","bnGMX",0],"bnGMX");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
