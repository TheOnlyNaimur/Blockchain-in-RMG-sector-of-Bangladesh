import { useAsync, createAsyncFn } from "./useAsync";
import { buyersApi, BuyerRegistration, BuyerVisibleSellerStatus } from "../api";

/**
 * Hook for registering a new buyer
 */
export function useBuyerRegistration() {
  return useAsync<{ txHash: string; buyerId: string }, BuyerRegistration>(
    createAsyncFn((data) =>
      buyersApi.register(data).then((res: any) => res.data || res),
    ),
  );
}

/**
 * Hook for fetching buyer-visible seller status
 */
export function useBuyerSellerStatus() {
  return useAsync<BuyerVisibleSellerStatus, { sellerAddress: string }>(
    createAsyncFn(({ sellerAddress }) =>
      buyersApi
        .getSellerStatus(sellerAddress)
        .then((res: any) => res.data || res),
    ),
  );
}
