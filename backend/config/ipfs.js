const multer = require("multer");
const path = require("path");

/**
 * Multer configuration for file uploads.
 * Files are stored in memory (buffer) and passed directly to IPFS.
 * Max file size: 10 MB
 * Allowed types: PDF, images, DOC/DOCX
 */
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = { upload, ALLOWED_TYPES, MAX_FILE_SIZE };
