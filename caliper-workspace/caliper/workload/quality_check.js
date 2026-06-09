"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class QualityCheckWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const batchId = this.batchId(caseId);

    await this.sutAdapter.sendRequests(
      this.request("bqualitycheck", [batchId, true]),
    );
  }
}

module.exports.createWorkloadModule = () => new QualityCheckWorkload();
