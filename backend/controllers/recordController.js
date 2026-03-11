const Record = require("../models/Record");
const { verifyIntegrity } = require("../utils/crypto");

/**
 * GET /api/records
 * Query params: type, page (default 1), limit (default 20)
 */
async function getAllRecords(req, res, next) {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = type ? { recordType: type } : {};

    const [records, total] = await Promise.all([
      Record.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Record.countDocuments(filter),
    ]);

    const data = records.map((r) => ({
      id: r._id,
      recordType: r.recordType,
      txHash: r.txHash,
      blockNumber: r.blockNumber,
      dataHash: r.dataHash,
      createdAt: r.createdAt,
      rawData: r.rawData,
      contractFeedback: r.contractFeedback,
    }));

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/:txHash
 */
async function getRecordByTxHash(req, res, next) {
  try {
    const record = await Record.findOne({ txHash: req.params.txHash });
    if (!record) {
      return res
        .status(404)
        .json({ success: false, error: "Record not found" });
    }

    res.json({
      success: true,
      data: {
        id: record._id,
        recordType: record.recordType,
        txHash: record.txHash,
        blockNumber: record.blockNumber,
        dataHash: record.dataHash,
        createdAt: record.createdAt,
        rawData: record.rawData,
        contractFeedback: record.contractFeedback,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/verify/:txHash
 * Re-hashes rawData and compares to stored dataHash.
 */
async function verifyRecord(req, res, next) {
  try {
    const record = await Record.findOne({ txHash: req.params.txHash });
    if (!record) {
      return res
        .status(404)
        .json({ success: false, error: "Record not found" });
    }

    const result = verifyIntegrity(record.rawData, record.dataHash);

    res.json({
      success: true,
      txHash: record.txHash,
      recordType: record.recordType,
      integrityValid: result.valid,
      storedHash: result.storedHash,
      recomputedHash: result.recomputedHash,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/records/types
 */
async function getRecordTypes(req, res, next) {
  try {
    const types = await Record.distinct("recordType");
    const counts = await Promise.all(
      types.map(async (t) => ({
        type: t,
        count: await Record.countDocuments({ recordType: t }),
      })),
    );
    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRecords,
  getRecordByTxHash,
  verifyRecord,
  getRecordTypes,
};
