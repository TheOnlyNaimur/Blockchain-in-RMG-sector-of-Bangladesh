import { apiClient } from "./client";

export interface AuditEvent {
  orderId: number;
  eventType: string;
  actor: string;
  timestamp: number;
  date: string;
  dataHash: string;
  blockNumber: number;
  txHash: string;
}

export const auditApi = {
  getOrderTimeline: (orderId: string) =>
    apiClient.get<any>(`/audit/timeline/${orderId}`),

  getShipmentTimeline: (shipId: string) =>
    apiClient.get<any>(`/audit/timeline/shipment/${shipId}`),

  getTrail: (page: number = 1, limit: number = 50, eventType?: string) => {
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("limit", String(limit));
    if (eventType) search.set("eventType", eventType);
    return apiClient.get<any>(`/audit/trail?${search.toString()}`);
  },

  unifiedLookup: (id: string) =>
    apiClient.get<any>(`/audit/record/${encodeURIComponent(id)}`),
};

