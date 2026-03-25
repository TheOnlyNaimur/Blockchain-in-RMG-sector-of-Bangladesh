import { useAsync, useFetch, createAsyncFn } from "./useAsync";
import {
  sellersApi,
  SellerRegistration,
  SellerApproval,
  SellerEvent,
} from "../api";

/**
 * Hook for registering a new seller
 */
export function useSellerRegistration() {
  return useAsync<{ txHash: string; sellerId: string }, SellerRegistration>(
    createAsyncFn((data) =>
      sellersApi.register(data).then((res: any) => res.data || res),
    ),
  );
}

/**
 * Hook for approving a seller as certifier
 */
export function useSellerApproval() {
  return useAsync<{ txHash: string }, SellerApproval>(
    createAsyncFn((data) =>
      sellersApi.approve(data).then((res: any) => res.data || res),
    ),
  );
}

/**
 * Hook for fetching seller events
 */
export function useSellerEvents() {
  return useFetch<SellerEvent[]>(() =>
    sellersApi.getEvents().then((res: any) => res.data || res.data || []),
  );
}
