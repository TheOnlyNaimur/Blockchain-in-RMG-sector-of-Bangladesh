"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class FreightDocsFlowWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const seller = this.sellerAddress(caseId);
    const batchId = this.batchId(caseId);
    const shipId = this.shipId(caseId);
    const freightForwarder = this.roundArguments.freightForwarderAddress || this.roundArguments.fromAddress;

    await this.sutAdapter.sendRequests(
      this.request("shipReq", [seller, batchId, freightForwarder]),
    );

    for (let docType = 0; docType < 4; docType += 1) {
      const docHash = this.hashText("export-doc", caseId, docType);
      await this.sutAdapter.sendRequests(
        this.request("uploadExportDoc", [shipId, docType, docHash]),
      );
    }
  }
}

module.exports.createWorkloadModule = () => new FreightDocsFlowWorkload();
