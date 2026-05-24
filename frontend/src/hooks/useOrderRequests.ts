import { useAsync, useFetch, createAsyncFn } from "./useAsync";
import { useWallet } from "./useWallet";
import { orderRequestsApi, PurchaseRequestData, PurchaseRequestListItem } from "../api";

export function usePurchaseRequestCreation() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<
    { requestId: string; requestDisplayId: string },
    PurchaseRequestData
  >(
    createAsyncFn(async (data) => {
      if (!isConnected) throw new Error("Wallet not connected");
      const request = await createSignedPayload<PurchaseRequestData>(data);
      const res: any = await orderRequestsApi.create(request);
      return res.data || res;
    }),
  );
}

export function usePurchaseRequestsList(params: {
  buyerAddress?: string;
  sellerAddress?: string;
  status?: string;
}) {
  return useFetch<PurchaseRequestListItem[]>(() =>
    orderRequestsApi.list(params).then((res: any) => res.data || []),
  );
}

export function usePurchaseRequestFulfill() {
  return useAsync<{ success: boolean }, { requestId: string; orderId: string; sellerAddress: string }>(
    createAsyncFn(async (params) => {
      const res: any = await orderRequestsApi.fulfill(params.requestId, {
        orderId: params.orderId,
        sellerAddress: params.sellerAddress,
      });
      return res.data || res;
    }),
  );
}

