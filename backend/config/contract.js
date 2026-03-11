const { ethers } = require("ethers");
const abi = require("../abi/MyContract.json");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

function getReadContract() {
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);
}

function getWriteContract(privateKey) {
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
}

// Returns a contract instance pre-signed with the server-side role key.
// role: "certifier" | "qualitychecker" | "freightforwarder" | "exportcustoms" | "importcustoms"
function getRoleContract(role) {
  const pkMap = {
    certifier: process.env.CERTIFIER_PK,
    qualitychecker: process.env.QUALITY_CHECKER_PK,
    freightforwarder: process.env.FREIGHT_FORWARDER_PK,
    exportcustoms: process.env.EXPORT_CUSTOMS_PK,
    importcustoms: process.env.IMPORT_CUSTOMS_PK,
  };
  const pk = pkMap[role.toLowerCase()];
  if (!pk) throw new Error(`No private key configured for role: ${role}`);
  return getWriteContract(pk);
}

module.exports = {
  provider,
  getReadContract,
  getWriteContract,
  getRoleContract,
};
