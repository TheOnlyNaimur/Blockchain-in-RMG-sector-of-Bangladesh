import { apiClient, ApiResponse } from "./client";

export interface SellerRegistrationData {
  name: string;
  tinid: number;
  number: number;
}

export interface SellerRegistration {
  data: SellerRegistrationData; // Form data
  signature: string; // Digital signature from MetaMask signMessage
  userAddress: string; // Seller wallet address
}

export interface SellerApproval {
  sellerAddress: string;
}

export interface SellerEvent {
  id: string;
  sellerAddress: string;
  eventType: string;
  timestamp: number;
  blockNumber: number;
}

export const sellersApi = {
  register: (data: SellerRegistration) =>
    apiClient.post<ApiResponse<{ txHash: string; sellerId: string }>>(
      "/sellers/register",
      data,
    ),

  approve: (data: SellerApproval) =>
    apiClient.post<ApiResponse<{ txHash: string }>>("/sellers/approve", data),

  getEvents: () => apiClient.get<ApiResponse<SellerEvent[]>>("/sellers/events"),
};
