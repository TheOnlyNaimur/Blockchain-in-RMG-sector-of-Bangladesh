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
  assign: number;
  certificateFile?: File;
}

export interface SellerCertificateLookup {
  sellerAddress: string;
  certDocHash: string;
  certIpfsCid: string;
  certIpfsUrl: string;
  certificateFileName?: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
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

  approve: async (data: SellerApproval) => {
    const baseUrl =
      (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api";

    const formData = new FormData();
    formData.append("sellerAddress", data.sellerAddress);
    formData.append("assign", String(data.assign));
    if (data.certificateFile) {
      formData.append("certificate", data.certificateFile);
    }

    const response = await fetch(`${baseUrl}/sellers/approve`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || payload.message || "Seller approval failed");
    }

    return payload as ApiResponse<{ txHash: string; certDocHash?: string; certIpfsCid?: string; certIpfsUrl?: string }>;
  },

  getCertificateByHash: (hash: string) =>
    apiClient.get<ApiResponse<SellerCertificateLookup>>(
      `/sellers/certificates/${hash}`,
    ),

  getEvents: () => apiClient.get<ApiResponse<SellerEvent[]>>("/sellers/events"),
};
