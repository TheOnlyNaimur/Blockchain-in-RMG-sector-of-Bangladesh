"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class SellerRegisterWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const seller = this.sellerAddress(caseId);
    const dataHash = this.hashText("seller-registration", caseId);
    const tin = 1000000000 + caseId;
    const number = 1700000000 + caseId;

    await this.sutAdapter.sendRequests(
      this.request("registrationseller", [seller, dataHash, tin, number]),
    );
  }
}

module.exports.createWorkloadModule = () => new SellerRegisterWorkload();
