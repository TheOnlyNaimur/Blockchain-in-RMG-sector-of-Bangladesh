const { ethers } = require("ethers");
const { provider, getUsdtContract } = require("../config/contract");

async function faucetUsdt(req, res, next) {
  try {
    const { address, amount } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, error: "Valid address is required" });
    }

    const mintAmount = amount ? BigInt(amount) : ethers.parseEther("1000000");
    const network = await provider.getNetwork();

    if (network.chainId !== 31337n) {
      return res.status(403).json({
        success: false,
        error: "USDT faucet is only available on local Anvil (chainId 31337)",
      });
    }

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    if (!process.env.USDT_ADDRESS) {
      return res.status(500).json({ success: false, error: "USDT address is not configured" });
    }

    const usdt = getUsdtContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await usdt.mint(address, mintAmount);
    const receipt = await tx.wait(1, 60000);

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      minted: mintAmount.toString(),
      message: `Minted test USDT to ${address}`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { faucetUsdt };