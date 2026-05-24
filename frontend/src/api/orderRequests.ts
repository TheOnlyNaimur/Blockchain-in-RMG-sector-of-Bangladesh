import { apiClient } from "./client";

export interface PurchaseRequestData {
  sellerAddress: string;
  details: string;
  amount: string;
  hsCode?: string;
  destination?: string;
}

export interface PurchaseRequestListItem {
  requestId: string;
  requestDisplayId: string;
  buyerAddress: string;
  sellerAddress: string;
  details: string;
  hsCode: string;
  destination: string;
  amount: string;
  status: "pending" | "fulfilled" | "cancelled";
  orderId: string | null;
  poid: string | null;
  createdAt: string;
  updatedAt: string;
}

export const orderRequestsApi = {
  create: (request: { data: PurchaseRequestData; signature: string; userAddress: string }) =>
    apiClient.post<any>("/orders/requests", request),

  list: (params?: { buyerAddress?: string; sellerAddress?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.buyerAddress) search.set("buyerAddress", params.buyerAddress);
    if (params?.sellerAddress) search.set("sellerAddress", params.sellerAddress);
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return apiClient.get<any>(`/orders/requests${qs ? `?${qs}` : ""}`);
  },

  fulfill: (requestId: string, body: { orderId: string; sellerAddress: string }) =>
    apiClient.patch<any>(`/orders/requests/${requestId}/fulfill`, body),

  cancel: (requestId: string, body: { userAddress: string }) =>
    apiClient.patch<any>(`/orders/requests/${requestId}/cancel`, body),
};

