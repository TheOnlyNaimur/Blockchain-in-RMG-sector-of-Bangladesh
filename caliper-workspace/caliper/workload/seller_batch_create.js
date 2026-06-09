"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class SellerBatchCreateWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const seller = this.sellerAddress(caseId);
    const orderId = this.orderId(caseId);
    const productInfoHash = this.hashText("product-info", caseId);

    await this.sutAdapter.sendRequests(
      this.request("batchCreate", [seller, orderId, productInfoHash]),
    );
  }
}

module.exports.createWorkloadModule = () => new SellerBatchCreateWorkload();
