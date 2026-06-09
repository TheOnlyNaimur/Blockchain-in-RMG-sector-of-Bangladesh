"use strict";

const crypto = require("crypto");

class BaseRmgWorkload {
  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    this.workerIndex = workerIndex;
    this.totalWorkers = totalWorkers;
    this.roundIndex = roundIndex;
    this.roundArguments = roundArguments || {};
    this.sutAdapter = sutAdapter;
    this.sutContext = sutContext;
    this.txIndex = 0;
  }

  nextCaseId() {
    const caseId = this.workerIndex + (this.txIndex * this.totalWorkers);
    this.txIndex += 1;
    return caseId;
  }

  sellerAddress(caseId) {
    return makeAddress(0x100000 + caseId);
  }

  buyerAddress(caseId) {
    return makeAddress(0x200000 + caseId);
  }

  orderId(caseId) {
    return caseId + 1;
  }

  batchId(caseId) {
    return caseId + 1;
  }

  shipId(caseId) {
    return caseId + 1;
  }

  hashText(prefix, caseId, suffix = "") {
    return hashHex(`${prefix}:${caseId}:${suffix}`);
  }

  expiryTimestamp() {
    return Math.floor(Date.now() / 1000) + 31536000;
  }

  request(verb, args, overrides = {}) {
    return {
      contract: "MyContract",
      verb,
      args,
      readOnly: false,
      ...this.defaultInvoker(),
      ...overrides,
    };
  }

  defaultInvoker() {
    const request = {};
    if (this.roundArguments.fromAddress) {
      request.fromAddress = this.roundArguments.fromAddress;
    }
    if (this.roundArguments.privateKey) {
      request.privateKey = this.roundArguments.privateKey;
    }
    return request;
  }

  async cleanupWorkloadModule() {
    // Stub implementation to satisfy Caliper core cleanup lifecycle hook
  }
}

function makeAddress(seed) {
  const hex = BigInt(seed).toString(16).padStart(40, "0");
  return `0x${hex}`;
}

function hashHex(value) {
  return `0x${crypto.createHash("sha256").update(String(value)).digest("hex")}`;
}

module.exports = {
  BaseRmgWorkload,
  hashHex,
  makeAddress,
};
