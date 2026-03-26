const { createOrder, payOrder } = require("../../controllers/orderController");
const Record = require("../../models/Record");
const { ethers } = require("ethers");
const { getWriteContract } = require("../../config/contract");
const saveRecord = require("../../utils/saveRecord");

jest.mock("../../config/contract", () => ({
  getWriteContract: jest.fn(),
  getRoleContract: jest.fn(),
}));
jest.mock("../../utils/saveRecord", () => jest.fn());
jest.setTimeout(10000);

describe("Order Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    process.env.BACKEND_PRIVATE_KEY = "0xBackendKey";
  });

  describe("createOrder", () => {
    it("should return 400 if required fields are missing", async () => {
      await createOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "data, signature, and userAddress are required" })
      );
    });

    it("should return 400 if details or buyerAddress is missing in data", async () => {
      req.body = {
        data: { details: "Some details" },
        signature: "0xsig",
        userAddress: "0xSeller"
      };
      await createOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "details and buyerAddress are required in data" })
      );
    });

    it("should process order creation successfully", async () => {
      const sellerAddress = "0xSeller";
      req.body = {
        data: { details: "Order 1", buyerAddress: "0xBuyer" },
        signature: "0xValidSignature",
        userAddress: sellerAddress
      };

      jest.spyOn(ethers, "verifyMessage").mockReturnValueOnce(sellerAddress);
      
      const mockWait = jest.fn().mockResolvedValue({ status: 1, hash: "0xTxHash", blockNumber: 10, logs: [] });
      const mockContract = {
        createdealforbuyers: jest.fn().mockResolvedValue({ wait: mockWait })
      };
      getWriteContract.mockReturnValue(mockContract);

      await createOrder(req, res, next);

      expect(getWriteContract).toHaveBeenCalledWith(process.env.BACKEND_PRIVATE_KEY);
      expect(mockContract.createdealforbuyers).toHaveBeenCalledWith(sellerAddress, expect.any(String), "0xBuyer", expect.any(String), expect.any(String));
      expect(saveRecord).toHaveBeenCalledWith("ORDER_CREATED", expect.any(Object), expect.objectContaining({
        buyerAddress: "0xBuyer",
        sellerAddress: sellerAddress
      }));

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, txHash: "0xTxHash", message: "Order created. Waiting for buyer acceptance." })
      );
    });
  });

  describe("payOrder", () => {
    it("should reject missing data", async () => {
      req.params = { orderId: "1" };
      await payOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "data, signature, and userAddress are required" })
      );
    });

    it("should reject missing amount", async () => {
      req.params = { orderId: "1" };
      req.body = {
        data: { sellerAddress: "0xSeller" },
        signature: "0xSig",
        userAddress: "0xBuyer"
      };
      await payOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "sellerAddress and amount are required in data" })
      );
    });
  });
});
