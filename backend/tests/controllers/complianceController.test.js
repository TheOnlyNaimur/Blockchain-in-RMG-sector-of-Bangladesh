const { issueCompliance } = require("../../controllers/complianceController");
const Record = require("../../models/Record");
const { getWriteContract, getRoleContract } = require("../../config/contract");
const saveRecord = require("../../utils/saveRecord");

jest.mock("../../config/contract", () => ({
  getWriteContract: jest.fn(),
  getRoleContract: jest.fn(),
}));

jest.mock("../../utils/saveRecord", () => jest.fn());
jest.setTimeout(10000);

describe("Compliance Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    process.env.COMPLIANCE_CHECKER_PRIVATE_KEY = "0xComplianceKey";
  });

  describe("issueCompliance", () => {
    it("should reject missing parameters", async () => {
      req.body = {};
      await issueCompliance(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "sellerAddress, certType (0-3), certDocHash, expiresAt, and privateKey (or backend key) are required" })
      );
    });

    it("should reject invalid compliance types", async () => {
      req.body = { sellerAddress: "0xSeller", certType: 5, certDocHash: "0xhash", expiresAt: 1234567890 };
      await issueCompliance(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "certType must be 0 (FireSafety), 1 (BuildingSafety), 2 (LaborStandards), or 3 (Environmental)" })
      );
    });

    it("should process FireSafety compliance successfully", async () => {
      req.body = { sellerAddress: "0xSeller", certType: 0, certDocHash: "0xhash", expiresAt: 1234567890 };
      
      const mockWait = jest.fn().mockResolvedValue({ status: 1, hash: "0xTxHash", blockNumber: 10, from: "0xIssuer" });
      const mockContract = {
        issueCompliance: jest.fn().mockResolvedValue({ wait: mockWait })
      };
      getWriteContract.mockReturnValue(mockContract); // It uses getWriteContract, not getRoleContract

      await issueCompliance(req, res, next);

      // FireSafety is enum index 0 in solidity:
      expect(getWriteContract).toHaveBeenCalledWith(process.env.COMPLIANCE_CHECKER_PRIVATE_KEY);
      expect(mockContract.issueCompliance).toHaveBeenCalledWith("0xSeller", 0, "0xhash", BigInt(1234567890));
      expect(saveRecord).toHaveBeenCalledWith("COMPLIANCE_ISSUED", expect.any(Object), expect.objectContaining({
        sellerAddress: "0xSeller",
        certType: "FireSafety",
        certDocHash: "0xhash"
      }));

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "FireSafety compliance certificate issued for seller 0xSeller" })
      );
    });
  });
});
