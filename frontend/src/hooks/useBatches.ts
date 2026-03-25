import { useAsync, useFetch, createAsyncFn } from "./useAsync";
import { useWallet } from "./useWallet";
import {
  batchesApi,
  BatchCreateRequest,
  BatchData,
  QualityCheckRequest,
  BatchEvent,
} from "../api";

/**
 * Hook for creating a batch with digital signature
 */
export function useBatchCreation() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<{ txHash: string; batchId: string }, BatchData>(
    createAsyncFn(async (data) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      const request = await createSignedPayload<BatchData>(data);
      return batchesApi
        .create(request as BatchCreateRequest)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for quality checking a batch
 * Note: Quality check still uses role-based authentication (role-holder's wallet)
 */
export function useBatchQualityCheck() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<{ txHash: string }, { batchId: string; status: boolean }>(
    createAsyncFn(async (params) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      // For role-based operations (QC), still expect private key in request
      const request: QualityCheckRequest = {
        privateKey: "", // This should be provided by the component or environment
        status: params.status,
      };
      return batchesApi
        .qualityCheck(params.batchId, request)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for fetching batch events
 */
export function useBatchEvents() {
  return useFetch<BatchEvent[]>(() =>
    batchesApi.getEvents().then((res: any) => res.data || res.data || []),
  );
}
