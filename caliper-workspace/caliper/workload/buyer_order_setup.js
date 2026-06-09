"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class BuyerOrderSetupWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const buyer = this.buyerAddress(caseId);
    const seller = this.sellerAddress(caseId);
    const buyerHash = this.hashText("buyer-registration", caseId);
    const detailsHash = this.hashText("order-details", caseId);
    const hsCodeHash = this.hashText("hs-code", caseId);
    const destinationHash = this.hashText("destination", caseId);

    await this.sutAdapter.sendRequests(
      this.request("registrationbuyer", [buyer, buyerHash]),
    );

    await this.sutAdapter.sendRequests(
      this.request("createdealforbuyers", [seller, detailsHash, buyer, hsCodeHash, destinationHash]),
    );

    const orderId = this.orderId(caseId);
    const amount = 1000; // standard escrow amount in PYUSD micro-units (or MockUSDT)
    await this.sutAdapter.sendRequests(
      this.request("acceptorder", [buyer, orderId, amount]),
    );
  }
}

module.exports.createWorkloadModule = () => new BuyerOrderSetupWorkload();
