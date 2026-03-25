import { useAsync, useFetch, createAsyncFn } from "./useAsync";
import { useWallet } from "./useWallet";
import {
  shipmentsApi,
  ShipmentRequestRequest,
  ShipmentData,
  DocumentUploadRequest,
  ExportVerifyRequest,
  ImportVerifyRequest,
  ShipmentDetail,
  ShipmentEvent,
} from "../api";

/**
 * Hook for requesting a shipment with digital signature
 */
export function useShipmentRequest() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<{ txHash: string; shipmentId: string }, ShipmentData>(
    createAsyncFn(async (data) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      const request = await createSignedPayload<ShipmentData>(data);
      return shipmentsApi
        .request(request as ShipmentRequestRequest)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for uploading shipment documents
 * Note: Document upload still uses role-based authentication
 */
export function useDocumentUpload() {
  return useAsync<{ txHash: string }, { shipmentId: string; docHash: string }>(
    createAsyncFn(async (params) => {
      const request: DocumentUploadRequest = {
        privateKey: "", // Provided by environment or component
        docHash: params.docHash,
      };
      return shipmentsApi
        .uploadDocument(params.shipmentId, request)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for export verification
 * Note: Export verification still uses role-based authentication
 */
export function useExportVerify() {
  return useAsync<{ txHash: string }, { shipmentId: string }>(
    createAsyncFn(async (params) => {
      const request: ExportVerifyRequest = {
        privateKey: "", // Provided by environment or component
      };
      return shipmentsApi
        .exportVerify(params.shipmentId, request)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for import verification
 * Note: Import verification still uses role-based authentication
 */
export function useImportVerify() {
  return useAsync<{ txHash: string }, { shipmentId: string }>(
    createAsyncFn(async (params) => {
      const request: ImportVerifyRequest = {
        privateKey: "", // Provided by environment or component
      };
      return shipmentsApi
        .importVerify(params.shipmentId, request)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for fetching a single shipment
 */
export function useShipmentDetail(shipmentId: string) {
  return useFetch<ShipmentDetail>(
    () =>
      shipmentsApi.getShipment(shipmentId).then((res: any) => res.data || res),
    !!shipmentId,
  );
}

/**
 * Hook for fetching shipment events
 */
export function useShipmentEvents() {
  return useFetch<ShipmentEvent[]>(() =>
    shipmentsApi.getEvents().then((res: any) => res.data || res.data || []),
  );
}
