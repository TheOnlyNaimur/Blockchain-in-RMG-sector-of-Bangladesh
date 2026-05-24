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

export interface BuyerVisibleSellerStatus {
  sellerAddress: string;
  approvalStatus: "not_registered" | "pending" | "approved" | "rejected";
  certifierCertificateIssued: boolean;
  compliance: {
    isFullyCompliant: boolean;
    issuedCount: number;
    requiredCount: number;
    items: Array<{ type: string; issued: boolean }>;
  };
  certificateIssuanceSummary: {
    issuedCount: number;
    requiredCount: number;
    allIssued: boolean;
  };
}

export const buyersApi = {
  register: (data: BuyerRegistration) =>
    apiClient.post<ApiResponse<{ txHash: string; blockNumber: number }>>(
      "/buyers/register",
      data,
    ),

  getSellerStatus: (sellerAddress: string) =>
    apiClient.get<ApiResponse<BuyerVisibleSellerStatus>>(
      `/buyers/seller-status/${sellerAddress}`,
    ),
};
