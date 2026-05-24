const Record = require("../models/Record");
const { hashData } = require("./crypto");
const { enrichRawDataWithIds } = require("./entityIds");

/**
 * Persist a blockchain event record to MongoDB.
 *
 * @param {string} recordType  - Business event type (e.g. SELLER_REGISTERED)
 * @param {object} receipt     - Ethers.js TransactionReceipt from tx.wait()
 * @param {object} data        - Application-level payload (raw business data)
 *
 * Stores:
 *  - recordType, txHash, blockNumber  → plaintext (queryable)
 *  - dataHash                         → SHA-256 of rawData (tamper detection)
 *  - rawData                          → plain business payload
 *  - contractFeedback                 → key fields from the on-chain receipt
 */
async function saveRecord(recordType, receipt, data) {
  const enrichedData = enrichRawDataWithIds(data);
  const dataHash = hashData(enrichedData);

  const contractFeedback = {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    from: receipt.from,
    to: receipt.to,
    gasUsed: receipt.gasUsed?.toString(),
    status: receipt.status, // 1 = success, 0 = reverted
  };

  await Record.create({
    recordType,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    dataHash,
    rawData: enrichedData,
    contractFeedback,
  });
}

module.exports = saveRecord;
