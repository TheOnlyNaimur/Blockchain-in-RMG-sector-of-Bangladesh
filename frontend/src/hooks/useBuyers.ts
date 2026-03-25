import { useAsync, createAsyncFn } from "./useAsync";
import { buyersApi, BuyerRegistration } from "../api";

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
