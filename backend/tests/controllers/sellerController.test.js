const { registerSeller, approveSeller, getSellerEvents } = require("../../controllers/sellerController");
const Record = require("../../models/Record");
const { ethers } = require("ethers");
const { getWriteContract, getRoleContract } = require("../../config/contract");
const saveRecord = require("../../utils/saveRecord");

jest.mock("../../config/contract", () => ({
  getWriteContract: jest.fn(),
  getRoleContract: jest.fn(),
}));

jest.mock("../../utils/saveRecord", () => jest.fn());
jest.setTimeout(10000); // 10s timeout just in case

describe("Seller Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
    process.env.BACKEND_PRIVATE_KEY = "0x123";
  });

  describe("registerSeller", () => {
    it("should return 400 if required fields are missing", async () => {
      await registerSeller(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "data, signature, and userAddress are required" })
      );
    });

    it("should return 400 if data is incomplete", async () => {
      req.body = {
        data: { name: "Test" }, // Missing tinid and number
        signature: "0xabc",
        userAddress: "0x123"
      };
      await registerSeller(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "name, tinid, and number are required in data" })
      );
    });

    it("should return 401 for an invalid signature", async () => {
      req.body = {
        data: { name: "Test", tinid: "123", number: "456" },
        signature: "invalid_sig",
        userAddress: "0x123"
      };
      // Mock verifyMessage to throw
      jest.spyOn(ethers, "verifyMessage").mockImplementationOnce(() => {
        throw new Error("Invalid");
      });

      await registerSeller(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid signature" })
      );
    });

    it("should return 401 if signature does not match user address", async () => {
      req.body = {
        data: { name: "Test", tinid: "123", number: "456" },
        signature: "0xvalid_sig",
        userAddress: "0x123"
      };
      jest.spyOn(ethers, "verifyMessage").mockReturnValueOnce("0xDifferentAddress");

      await registerSeller(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Signature does not match user address" })
      );
    });

    it("should successfully register the seller and save record", async () => {
      const userAddress = "0xUserAdd";
      req.body = {
        data: { name: "Test Corp", tinid: "12345", number: "98765" },
        signature: "0xvalid",
        userAddress
      };
      
      jest.spyOn(ethers, "verifyMessage").mockReturnValueOnce(userAddress);
      const mockWait = jest.fn().mockResolvedValue({ status: 1, hash: "0xTxHash", blockNumber: 42 });
      
      const mockContract = {
        registrationseller: jest.fn().mockResolvedValue({ wait: mockWait })
      };
      getWriteContract.mockReturnValue(mockContract);

      await registerSeller(req, res, next);

      expect(getWriteContract).toHaveBeenCalledWith(process.env.BACKEND_PRIVATE_KEY);
      expect(mockContract.registrationseller).toHaveBeenCalled();
      expect(mockWait).toHaveBeenCalled();
      expect(saveRecord).toHaveBeenCalledWith("SELLER_REGISTERED", expect.any(Object), expect.any(Object));
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          txHash: "0xTxHash",
          message: "Seller registered successfully. Awaiting certifier approval."
        })
      );
    });
  });

  describe("approveSeller", () => {
    it("should return 400 if missing sellerAddress or assign", async () => {
      await approveSeller(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "sellerAddress and assign (1|2) are required" })
      );
    });

    it("should approve the seller successfully", async () => {
      req.body = {
        sellerAddress: "0xSeller",
        assign: 1,
        privateKey: "0xCertifierKey"
      };
      
      const mockWait = jest.fn().mockResolvedValue({ status: 1, hash: "0xTxHash", blockNumber: 42 });
      const mockContract = {
        approveseller: jest.fn().mockResolvedValue({ wait: mockWait })
      };
      getRoleContract.mockReturnValue(mockContract);
      
      await approveSeller(req, res, next);
      
      expect(getRoleContract).toHaveBeenCalledWith("0xCertifierKey");
      expect(mockContract.approveseller).toHaveBeenCalledWith("0xSeller", BigInt(1));
      expect(saveRecord).toHaveBeenCalledWith("SELLER_APPROVED", expect.any(Object), expect.objectContaining({
        decision: "approved"
      }));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Seller approved successfully." })
      );
    });
  });

  describe("getSellerEvents", () => {
    it("should return aggregated seller events from MongoDB", async () => {
      // Mock db records
      await Record.create({
        recordType: "SELLER_REGISTERED",
        txHash: "0x111",
        blockNumber: 1,
        dataHash: "0xhash1",
        contractFeedback: {},
        rawData: { sellerAddress: "0xSellerX", companyName: "Company X", tin: "111" }
      });
      await Record.create({
        recordType: "SELLER_APPROVED",
        txHash: "0x222",
        blockNumber: 2,
        dataHash: "0xhash2",
        contractFeedback: { txHash: "0x00A", gasUsed: "100" },
        rawData: { sellerAddress: "0xSellerX", decision: "approved" },
      });

      await getSellerEvents(req, res, next);
      
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.data[0].address).toBe("0xSellerX");
      expect(response.data[0].status).toBe("approved");
    });
  });
});
