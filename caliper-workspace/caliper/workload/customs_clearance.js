"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class CustomsClearanceWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const shipId = this.shipId(caseId);

    await this.sutAdapter.sendRequests(
      this.request("expVerify", [shipId], {
        fromAddress: this.roundArguments.exportFromAddress,
        privateKey: this.roundArguments.exportPrivateKey,
      }),
    );

    await this.sutAdapter.sendRequests(
      this.request("impVerify", [shipId], {
        fromAddress: this.roundArguments.importFromAddress,
        privateKey: this.roundArguments.importPrivateKey,
      }),
    );
  }
}

module.exports.createWorkloadModule = () => new CustomsClearanceWorkload();
