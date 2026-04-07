const { ethers } = require("ethers");
const abi = require("../abi/MyContract.json");

// Provider for reading blockchain data
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

/**
 * Get a read-only contract instance
 * Used for querying contract state without making transactions
 */
function getReadContract() {
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);
}

/**
 * Get a write-enabled contract instance (requires signer)
 * DEPRECATED: Use frontend to sign transactions via Metamask
 * Only use for backend read operations or if backend needs to sign
 */
function getWriteContract(privateKey) {
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
}

/**
 * Get a role-specific contract instance for calling role-gated functions
 * Used by controllers that need to call functions restricted to specific roles
 * @param {string} rolePrivateKey - Private key of the role account (e.g., certifier, quality checker)
 * @returns {ethers.Contract} Contract instance signed by the role account
 */
function getRoleContract(rolePrivateKey) {
  const signer = new ethers.Wallet(rolePrivateKey, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
}

module.exports = {
  provider,
  getReadContract,
  getWriteContract,
  getRoleContract,
};
