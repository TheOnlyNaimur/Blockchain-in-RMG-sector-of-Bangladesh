const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";
const BACKEND_PK = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
const SELLER_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const ABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, "abi/MyContract.json"), "utf8"));

async function test() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(BACKEND_PK, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-hash"));
  const tinid = 123456n;
  const number = 1800123456n;

  console.log("Calling registrationseller...");
  try {
    const tx = await contract.registrationseller(SELLER_ADDR, dataHash, tinid, number);
    const receipt = await tx.wait();
    console.log("Success! Hash:", receipt.hash);
  } catch (err) {
    console.log("REVERT REASON:", err.reason || err.message);
    if (err.data) {
      console.log("Error Data:", err.data);
      try {
        const decodedError = contract.interface.parseError(err.data);
        console.log("Decoded Custom Error:", decodedError.name);
      } catch (parseErr) {
        console.log("Could not decode custom error:", parseErr.message);
      }
    }
  }
}
test();
