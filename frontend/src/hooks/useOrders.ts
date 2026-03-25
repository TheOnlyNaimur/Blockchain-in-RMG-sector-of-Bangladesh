import { useAsync, useFetch, createAsyncFn } from "./useAsync";
import { useWallet } from "./useWallet";
import {
  ordersApi,
  OrderCreateRequest,
  OrderAcceptRequest,
  OrderPayRequest,
  OrderData,
  OrderAcceptData,
  OrderPayData,
  OrderEvent,
} from "../api";

/**
 * Hook for creating an order with digital signature
 */
export function useOrderCreation() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<{ txHash: string; orderId: string }, OrderData>(
    createAsyncFn(async (data) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      const request = await createSignedPayload<OrderData>(data);
      return ordersApi.create(request).then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for accepting an order with digital signature
 */
export function useOrderAcceptance() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<
    { txHash: string },
    { orderId: string; data: OrderAcceptData }
  >(
    createAsyncFn(async (params) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      const request = await createSignedPayload<OrderAcceptData>(params.data);
      return ordersApi
        .accept(params.orderId, request as OrderAcceptRequest)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for paying an order with digital signature
 */
export function useOrderPayment() {
  const { createSignedPayload, isConnected } = useWallet();

  return useAsync<{ txHash: string }, { orderId: string; data: OrderPayData }>(
    createAsyncFn(async (params) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      const request = await createSignedPayload<OrderPayData>(params.data);
      return ordersApi
        .pay(params.orderId, request as OrderPayRequest)
        .then((res: any) => res.data || res);
    }),
  );
}

/**
 * Hook for fetching order events
 */
export function useOrderEvents() {
  return useFetch<OrderEvent[]>(() =>
    ordersApi.getEvents().then((res: any) => res.data || res.data || []),
  );
}
