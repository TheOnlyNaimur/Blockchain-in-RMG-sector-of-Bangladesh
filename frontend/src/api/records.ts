import { apiClient, ApiResponse } from "./client";

export interface Record {
  txHash: string;
  recordType: string;
  blockNumber: number;
  dataHash: string;
  rawData: any;
  contractFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordType {
  type: string;
  count: number;
}

export const recordsApi = {
  getAll: (type?: string, page: number = 1, limit: number = 20) => {
    let endpoint = "/records?page=" + page + "&limit=" + limit;
    if (type) {
      endpoint += "&type=" + type;
    }
    return apiClient.get<ApiResponse<{ records: Record[]; total: number }>>(
      endpoint,
    );
  },

  getByTxHash: (txHash: string) =>
    apiClient.get<ApiResponse<Record>>(`/records/${txHash}`),

  verify: (txHash: string) =>
    apiClient.get<ApiResponse<{ valid: boolean; message: string }>>(
      `/records/verify/${txHash}`,
    ),

  getRecordTypes: () =>
    apiClient.get<ApiResponse<RecordType[]>>("/records/types"),
};
