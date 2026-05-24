const express = require("express");
const { upload } = require("../config/ipfs");
const {
  registerSeller,
  approveSeller,
  getSellerEvents,
} = require("../controllers/sellerController");
const {
  approveSellerBusiness,
  approveSellerCompliance,
} = require("../controllers/sellerController");

const router = express.Router();

// POST /api/sellers/register
router.post("/register", registerSeller);

/**
 * POST /api/sellers/approve-business
 * BUSINESS CERTIFIER APPROVAL
 * 
 * Approves seller's business legitimacy and uploads seller certificates.
 * 
 * Form Data:
 *   - sellerAddress (text)
 *   - privateKey (text): business certifier's private key
 *   - file (file): Seller business certificate (PDF, image, etc.)
 * 
 * Flow:
 *  1. Upload certificate to IPFS
 *  2. Hash CID with keccak256
 *  3. Save hash to database for post-verification
 *  4. Mark seller as business-approved
 */
router.post("/approve-business", upload.single("file"), approveSellerBusiness);

/**
 * POST /api/sellers/approve-compliance
 * COMPLIANCE CERTIFIER APPROVAL
 * 
 * Approves seller for system access and uploads 4 compliance certificates.
 * 
 * Form Data:
 *   - sellerAddress (text)
 *   - assign (text): 1 for approve, 2 for reject
 *   - expiresAt (text): Unix timestamp for certificate expiration
 *   - privateKey (text): compliance certifier's private key
 *   - file_0 (file): FireSafety certificate
 *   - file_1 (file): BuildingSafety certificate
 *   - file_2 (file): LaborStandards certificate
 *   - file_3 (file): Environmental certificate
 */
router.post(
  "/approve-compliance",
  upload.fields([
    { name: "file_0", maxCount: 1 },
    { name: "file_1", maxCount: 1 },
    { name: "file_2", maxCount: 1 },
    { name: "file_3", maxCount: 1 },
  ]),
  approveSellerCompliance
);

/**
 * @deprecated Use /approve-business or /approve-compliance instead
 * POST /api/sellers/approve
 * (Kept for backward compatibility)
 */
router.post(
  "/approve",
  upload.fields([
    { name: "file_0", maxCount: 1 },
    { name: "file_1", maxCount: 1 },
    { name: "file_2", maxCount: 1 },
    { name: "file_3", maxCount: 1 },
  ]),
  approveSeller
);

// GET  /api/sellers/events
router.get("/events", getSellerEvents);

module.exports = router;
