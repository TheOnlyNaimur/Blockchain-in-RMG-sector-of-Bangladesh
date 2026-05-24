// Export all API modules for convenient importing
export * from "./client";
export * from "./sellers";
export * from "./buyers";
export * from "./orders";
export * from "./batches";
export * from "./shipments";
export * from "./records";
export * from "./ipfs";
export * from "./orderRequests";
export * from "./audit";
export * from "./access";

// Re-export all APIs as namespace
export { sellersApi } from "./sellers";
export { buyersApi } from "./buyers";
export { ordersApi } from "./orders";
export { batchesApi } from "./batches";
export { shipmentsApi } from "./shipments";
export { recordsApi } from "./records";
export { orderRequestsApi } from "./orderRequests";
export { auditApi } from "./audit";
export { accessApi } from "./access";
