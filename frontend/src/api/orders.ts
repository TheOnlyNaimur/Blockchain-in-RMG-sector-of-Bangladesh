import { apiClient, ApiResponse } from "./client";

export interface OrderData {
  details: string;
  buyerAddress: string;
}

export interface OrderCreateRequest {
  data: OrderData;
  signature: string;
  userAddress: string;
}

export interface OrderAcceptData {
  orderId: string;
}

export interface OrderAcceptRequest {
  data: OrderAcceptData;
  signature: string;
  userAddress: string;
}

export interface OrderPayData {
  sellerAddress: string;
  amount: string;
}

export interface OrderPayRequest {
  data: OrderPayData;
  signature: string;
  userAddress: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  timestamp: number;
  blockNumber: number;
}

export const ordersApi = {
  create: (request: OrderCreateRequest) =>
    apiClient.post<ApiResponse<{ txHash: string; orderId: string }>>(
      "/orders",
      request,
    ),

  accept: (orderId: string, request: OrderAcceptRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/orders/${orderId}/accept`,
      request,
    ),

  pay: (orderId: string, request: OrderPayRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/orders/${orderId}/pay`,
      request,
    ),

  getEvents: () => apiClient.get<ApiResponse<OrderEvent[]>>("/orders/events"),
};
