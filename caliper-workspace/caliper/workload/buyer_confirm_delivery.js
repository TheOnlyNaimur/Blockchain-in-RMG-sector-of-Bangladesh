"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class BuyerConfirmDeliveryWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const buyer = this.buyerAddress(caseId);
    const orderId = this.orderId(caseId);
    const shipId = this.shipId(caseId);

    await this.sutAdapter.sendRequests(
      this.request("buyerConfirmDelivery", [buyer, orderId, shipId], {
        fromAddress: this.roundArguments.fromAddress,
        privateKey: this.roundArguments.privateKey,
      }),
    );
  }
}

module.exports.createWorkloadModule = () => new BuyerConfirmDeliveryWorkload();
