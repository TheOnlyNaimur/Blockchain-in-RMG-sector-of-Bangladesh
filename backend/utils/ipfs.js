const pinataSDK = require("@pinata/sdk");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

let pinata = null;

/**
 * Get or create Pinata client (lazy init)
 */
function getPinata() {
  if (!pinata) {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      throw new Error(
        "PINATA_API_KEY and PINATA_SECRET_KEY must be set in .env",
      );
    }
    pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);
  }
  return pinata;
}

/**
 * Upload a file buffer to IPFS via Pinata.
 *
 * @param {Buffer|ReadableStream} fileStream - File data (from multer)
 * @param {string}                fileName  - Original file name
 * @param {object}               metadata  - Optional Pinata metadata (keyvalues)
 * @returns {{ cid: string, ipfsUrl: string, pinSize: number }}
 */
async function uploadToIPFS(fileStream, fileName, metadata = {}) {
  const client = getPinata();

  const options = {
    pinataMetadata: {
      name: fileName,
      keyvalues: metadata,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };

  const result = await client.pinFileToIPFS(fileStream, options);

  return {
    cid: result.IpfsHash,
    ipfsUrl: `${PINATA_GATEWAY}/${result.IpfsHash}`,
    pinSize: result.PinSize,
  };
}

/**
 * Upload a JSON object to IPFS via Pinata.
 *
 * @param {object} jsonData - JSON data to pin
 * @param {string} name    - Label for the pin
 * @returns {{ cid: string, ipfsUrl: string }}
 */
async function uploadJSONToIPFS(jsonData, name = "rmg-data") {
  const client = getPinata();

  const options = {
    pinataMetadata: { name },
    pinataOptions: { cidVersion: 1 },
  };

  const result = await client.pinJSONToIPFS(jsonData, options);

  return {
    cid: result.IpfsHash,
    ipfsUrl: `${PINATA_GATEWAY}/${result.IpfsHash}`,
  };
}

/**
 * Build the public gateway URL for a given CID.
 *
 * @param {string} cid - IPFS content identifier
 * @returns {string}
 */
function getIPFSUrl(cid) {
  return `${PINATA_GATEWAY}/${cid}`;
}

/**
 * Test connectivity to Pinata.
 * @returns {boolean}
 */
async function testConnection() {
  try {
    const client = getPinata();
    const result = await client.testAuthentication();
    return result.authenticated === true;
  } catch {
    return false;
  }
}

module.exports = { uploadToIPFS, uploadJSONToIPFS, getIPFSUrl, testConnection };
