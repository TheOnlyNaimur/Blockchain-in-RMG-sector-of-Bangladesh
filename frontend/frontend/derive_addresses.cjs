const { ethers } = require("ethers");

const keys = {
  "PRIVATE_KEY": "f77a73f03804ae293cc578c73afb3af1d064c2d2bbc0012e0cacb5b4af803ef3",
  "SELLER_PRIVATE_KEY": "5996b60d7c69ddffc92f29109813ed301eeaf8f836c5808e58fb78137cea7da8",
  "BUYER_PRIVATE_KEY": "545c9fdf75179e3046f5ecca8542fce47c131eed5d9d8d2a49d61dc4e861adfb",
  "CERTIFIER_PRIVATE_KEY": "6a6b93451c38c7ff31a0f8f0a6f86a3caea8a31c59f0b539f39f8d09c14b6175",
  "QUALITY_CHECKER_PRIVATE_KEY": "40c562c7c50d1c8960a38278f790fc0829a0288ce432a8479f99a4edc072ed06",
  "FREIGHT_FORWARDER_PRIVATE_KEY": "12ee8d1f70bd8fb782bcad85e03569c6a31c982aed96cb70679adfd77403a58d",
  "EXPORT_CUSTOMS_PRIVATE_KEY": "cd210664979ff739ecbd1c521b02cc3e8195d93e197a1a1b493be8f3a3149e78",
  "IMPORT_CUSTOMS_PRIVATE_KEY": "63dcc0ebe2f27dc4fb2dff22c50a1b76c439b44c1e4308e2caaa417916e5b679",
  "COMPLIANCE_CHECKER_PRIVATE_KEY": "284e35f92a82507a4e27690ab08fcdf8c39a17b35b1f6b9b353b4cdefa19626f"
};

for (const [name, key] of Object.entries(keys)) {
  const wallet = new ethers.Wallet(key);
  const addrName = name.replace("_PRIVATE_KEY", "_ADDRESS").replace("PRIVATE_KEY", "DEPLOYER_ADDRESS");
  console.log(`${addrName}=${wallet.address}`);
}
