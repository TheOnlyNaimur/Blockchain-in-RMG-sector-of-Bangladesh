const mongoose = require("mongoose");

const accessRevocationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, index: true, lowercase: true },
    role: { type: String, default: "seller" },
    reason: { type: String, default: "" },
    revokedBy: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

accessRevocationSchema.index({ address: 1, active: 1 });

module.exports = mongoose.model("AccessRevocation", accessRevocationSchema);
