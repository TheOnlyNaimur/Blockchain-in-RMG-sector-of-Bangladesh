import { apiClient, ApiResponse } from "./client";

export interface ShipmentData {
  batchId: string;
  freightForwarderAddress?: string;
}

export interface ShipmentRequestRequest {
  data: ShipmentData;
  signature: string;
  userAddress: string;
}

export interface DocumentUploadRequest {
  privateKey: string; // Role-based, still uses private key
  docHash: string;
}

export interface ExportVerifyRequest {
  privateKey: string; // Role-based, still uses private key
}

export interface ImportVerifyRequest {
  privateKey: string; // Role-based, still uses private key
}

export interface ShipmentDetail {
  id: string;
  batchId: string;
  status: string;
  destination: string;
  eta: string;
  currentLocation: string;
  timestamp: number;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  eventType: string;
  timestamp: number;
  blockNumber: number;
}

export interface ShipmentDocumentHash {
  key: string;
  label: string;
  hash: string;
  uploaded: boolean;
}

export interface ShipmentDocumentsDetail {
  shipId: string;
  uploadedCount: number;
  requiredCount: number;
  readyForExportClearance: boolean;
  documents: ShipmentDocumentHash[];
}

export const shipmentsApi = {
  request: (req: ShipmentRequestRequest) =>
    apiClient.post<ApiResponse<{ txHash: string; shipId: string }>>(
      "/shipments",
      req,
    ),

  uploadDocument: (shipmentId: string, req: DocumentUploadRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/shipments/${shipmentId}/doc`,
      req,
    ),

  exportVerify: (shipmentId: string, req: ExportVerifyRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/shipments/${shipmentId}/export-verify`,
      req,
    ),

  importVerify: (shipmentId: string, req: ImportVerifyRequest) =>
    apiClient.post<ApiResponse<{ txHash: string }>>(
      `/shipments/${shipmentId}/import-verify`,
      req,
    ),

  getShipment: (shipmentId: string) =>
    apiClient.get<ApiResponse<ShipmentDetail>>(`/shipments/${shipmentId}`),

  getShipmentDocuments: (shipmentId: string) =>
    apiClient.get<ApiResponse<ShipmentDocumentsDetail>>(
      `/shipments/${shipmentId}/docs`,
    ),

  getEvents: () =>
    apiClient.get<ApiResponse<ShipmentEvent[]>>("/shipments/events"),
};
