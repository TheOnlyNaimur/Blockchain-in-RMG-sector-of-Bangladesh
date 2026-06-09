"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class CertifierApproveWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const seller = this.sellerAddress(caseId);

    await this.sutAdapter.sendRequests(
      this.request("approveseller", [seller, 1]),
    );
  }
}

module.exports.createWorkloadModule = () => new CertifierApproveWorkload();
