const mongoose = require("mongoose");

const orderRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    buyerAddress: { type: String, required: true, index: true, lowercase: true },
    sellerAddress: { type: String, required: true, index: true, lowercase: true },
    details: { type: String, required: true },
    hsCode: { type: String, default: "" },
    destination: { type: String, default: "" },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "fulfilled", "cancelled"],
      default: "pending",
      index: true,
    },
    orderId: { type: String, default: null },
    signature: { type: String, required: true },
    dataHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderRequest", orderRequestSchema);
