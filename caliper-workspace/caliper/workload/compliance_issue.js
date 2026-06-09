"use strict";

const { BaseRmgWorkload } = require("./lib/common");

class ComplianceIssueWorkload extends BaseRmgWorkload {
  async submitTransaction() {
    const caseId = this.nextCaseId();
    const seller = this.sellerAddress(caseId);
    const certType = Number(this.roundArguments.certType ?? 0);
    const certDocHash = this.hashText("compliance", caseId, certType);
    const expiresAt = this.expiryTimestamp();

    await this.sutAdapter.sendRequests(
      this.request("issueCompliance", [seller, certType, certDocHash, expiresAt]),
    );
  }
}

module.exports.createWorkloadModule = () => new ComplianceIssueWorkload();
