/**
 * Contract Configuration
 * Used by the frontend to interact with the deployed smart contract
 *
 * Reads values from environment variables (VITE_* prefix)
 * Set in frontend/.env after deploying the contract with Foundry
 */

export const CHAIN_CONFIG = {
  chainId: import.meta.env.VITE_CHAIN_ID
    ? parseInt(import.meta.env.VITE_CHAIN_ID)
    : 31337,
  chainName: import.meta.env.VITE_CHAIN_NAME || "Anvil Local",
  rpcUrl: import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545",
};

export const CONTRACT_CONFIG = {
  // Contract address (set in frontend/.env after 'forge script')
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "",

  // ERC-20 token address (set in frontend/.env)
  usdt: import.meta.env.VITE_USDT_ADDRESS || "",
};

/**
 * Role Addresses
 * These should match the addresses used during contract deployment
 * Read from environment variables in frontend/.env
 */
export const ROLES = {
  certifier: import.meta.env.VITE_CERTIFIER_ADDRESS || "",
  qualityChecker: import.meta.env.VITE_QUALITY_CHECKER_ADDRESS || "",
  freightForwarder: import.meta.env.VITE_FREIGHT_FORWARDER_ADDRESS || "",
  exportCustoms: import.meta.env.VITE_EXPORT_CUSTOMS_ADDRESS || "",
  importCustoms: import.meta.env.VITE_IMPORT_CUSTOMS_ADDRESS || "",
};

/**
 * Get role name from address
 */
export const getRoleFromAddress = (address) => {
  const normalizedAddress = address?.toLowerCase();

  for (const [role, roleAddress] of Object.entries(ROLES)) {
    if (roleAddress.toLowerCase() === normalizedAddress) {
      return role;
    }
  }

  return null;
};

/**
 * Backend API Configuration
 */
export const API_CONFIG = {
  baseUrl: "http://localhost:3000/api",
};

export default {
  CHAIN_CONFIG,
  CONTRACT_CONFIG,
  ROLES,
  getRoleFromAddress,
  API_CONFIG,
};
