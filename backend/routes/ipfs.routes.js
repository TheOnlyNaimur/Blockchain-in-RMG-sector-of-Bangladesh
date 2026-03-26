const express = require("express");
const { Readable } = require("stream");
const { upload } = require("../config/ipfs");
const { uploadToIPFS, getIPFSUrl, testConnection } = require("../utils/ipfs");

const router = express.Router();

/**
 * POST /api/ipfs/upload
 * Upload a file to IPFS via Pinata.
 * Expects multipart/form-data with field "file".
 * Optional: "label" field for Pinata metadata name.
 */
router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file provided" });
    }

    // Convert buffer to readable stream for Pinata SDK
    const stream = Readable.from(req.file.buffer);
    stream.path = req.file.originalname; // Pinata uses .path for name

    const label = req.body.label || req.file.originalname;
    const result = await uploadToIPFS(stream, label, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: String(req.file.size),
    });

    res.json({
      success: true,
      cid: result.cid,
      ipfsUrl: result.ipfsUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ipfs/url/:cid
 * Returns the public gateway URL for a given CID.
 */
router.get("/url/:cid", (req, res) => {
  const { cid } = req.params;
  res.json({
    success: true,
    cid,
    ipfsUrl: getIPFSUrl(cid),
  });
});

/**
 * GET /api/ipfs/health
 * Test Pinata connection.
 */
router.get("/health", async (req, res) => {
  const connected = await testConnection();
  res.json({
    success: true,
    pinataConnected: connected,
  });
});

module.exports = router;
