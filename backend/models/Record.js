const mongoose = require("mongoose");

/**
 * Stores every on-chain action with:
 *  - rawData          → plain business payload
 *  - contractFeedback → receipt details returned by the smart contract
 *  - dataHash         → SHA-256 of rawData for tamper detection
 */
const RecordSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      required: true,
      index: true,
      enum: [
        "SELLER_REGISTERED",
        "SELLER_APPROVED",
        "BUYER_REGISTERED",
        "ORDER_CREATED",
        "ORDER_ACCEPTED",
        "ORDER_PAID",
        "BATCH_CREATED",
        "QUALITY_CHECK",
        "SHIPMENT_REQUESTED",
        "DOC_UPLOADED",
        "EXPORT_CLEARED",
        "IMPORT_CLEARED",
      ],
    },
    txHash: { type: String, required: true, unique: true, index: true },
    blockNumber: { type: Number, required: true },
    dataHash: { type: String, required: true },
    rawData: { type: mongoose.Schema.Types.Mixed, required: true },
    contractFeedback: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Record", RecordSchema);
