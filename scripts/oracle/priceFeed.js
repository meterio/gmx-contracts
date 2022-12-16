const { deployContract, readTmpAddresses, nativeToken, sendTxn, override, wallet, contractAt } = require("../shared/helpers")

// const feeds = [
//   "0xCd5CB72EF809059Fa10773c6a4E13C9aa7D1983f",
//   "0x10312f9cc653c09E30789e053be322D17b0C7cF5",
//   "0xa27E8a241E02377B85F7881DeC9D0470C4db1e72",
//   "0x88A1F6cCa6abA97BeB49Da5d3946B5e002486425",
//   "0x75f166e1019BEA1878E941b46Fda52A2A9EcD94f",
//   "0xf49C913a0c2e7eE480538666395194b74C889dc8",
//   "0x0653529bCC96a5eb128FA5c169E2DC084c9A75a2"
// ]
const whitelistedTokenAddresses = [
  "0x7EB9e0Df1C6E6f1E9d3d1EdA09fcF688FE7A710c",
  "0xe8876830e7cc85dae8ce31b0802313caf856886f",
  "0x660a3a1141632c9dcad8a5a3350f7ddd720bc15c",
  "0x2b27f5f7f2867ad9d2b7065f81e985c1bd1b7274",
  "0x2398633bee182cad2d0388b41735fd9fb742098d",
  // "0x0000000000000000000000000000000000000000",
  "0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271"
]

const { VaultReader, Vault,VaultPriceFeed } = readTmpAddresses();

async function main() {
  const vaultPriceFeed = await contractAt("VaultPriceFeed",VaultPriceFeed.address);
  for (let i = 0; i < whitelistedTokenAddresses.length; i++) {
    console.log("whitelistedTokenAddresses:", whitelistedTokenAddresses[i])
    // let feed = await contractAt("PriceFeed", feeds[i]);


    let priceFeedAddress = await vaultPriceFeed.priceFeeds(whitelistedTokenAddresses[i]);
    console.log("priceFeedAddress0:",priceFeedAddress);

    let priceFeed = await contractAt("PriceFeed", priceFeedAddress);
    await sendTxn(priceFeed.getLatestAnswer(), "PriceFeed.getLatestAnswer()");
    let roundId = await priceFeed.latestRound();
    console.log("roundId:",roundId.toString());

    // let result = await vaultPriceFeed.getPrimaryPrice(whitelistedTokenAddresses[0], false)
    // console.log("result:",result);

    // const vaultReader = await contractAt("VaultReader", VaultReader.address);
    // await sendTxn(vaultReader.getVaultTokenInfoV4(
    //   "0x82706b8c6b66FD7f4d085BC826866A88FBF59e52",
    //   "0xB5C603Dc5c7c74c068A873ee37669d355571a59d",
    //   "0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271",
    //   "1000000000000000000",
    //   whitelistedTokenAddresses
    // ))

    // const name = await feed.description();
    // console.log("name:", name)
    // const roundId = await feed.latestRound();
    // console.log("latestRound:", roundId.toString())
    // const feedData = await feed.getFeed();
    // console.log("feedData:", feedData)
    // let data0 = await feed.getRoundData(roundId - 0);
    // let data1 = await feed.getRoundData(roundId - 1);
    // let data2 = await feed.getRoundData(roundId - 2);
    // console.log("roundId-0:", data0[1].toString())
    // console.log("roundId-1:", data1[1].toString())
    // console.log("roundId-2:", data2[1].toString())
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
