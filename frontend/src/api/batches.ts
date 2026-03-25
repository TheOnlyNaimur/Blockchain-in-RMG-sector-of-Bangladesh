import { apiClient, ApiResponse } from "./client";

export interface BatchData {
  orderId: string;
  productInfo: string;
}

export interface BatchCreateRequest {
  data: BatchData;
  signature: string;
  userAddress: string;
}

export interface QualityCheckRequest {
  privateKey: string; // Role-based, still uses private key
  status: boolean;
}

export interface BatchEvent {
  id: string;
  batchId: string;
  eventType: string;
  timestamp: number;
  blockNumber: number;
}

export const batchesApi = {
  create: (request: BatchCreateRequest) =>
    apiClient.post<ApiResponse<{ txHash: string; batchId: string }>>(
      "/batches",
      request,
    ),

  qualityCheck: (batchId: string, request: QualityCheckRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/batches/${batchId}/quality`,
      request,
    ),

  getEvents: () => apiClient.get<ApiResponse<BatchEvent[]>>("/batches/events"),
};
