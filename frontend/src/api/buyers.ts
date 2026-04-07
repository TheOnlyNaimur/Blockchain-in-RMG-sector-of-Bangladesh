import { apiClient, ApiResponse } from "./client";

export interface BuyerRegistrationData {
  name: string;
  license: string;
  contact: string;
}

export interface BuyerRegistration {
  data: BuyerRegistrationData; // Form data
  signature: string; // Digital signature from MetaMask signMessage
  userAddress: string; // Buyer wallet address
}

export const buyersApi = {
  register: (data: BuyerRegistration) =>
    apiClient.post<ApiResponse<{ txHash: string; blockNumber: number }>>(
      "/buyers/register",
      data,
    ),
};
