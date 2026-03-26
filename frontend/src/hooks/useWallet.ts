import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useCallback } from "react";
import {
  signMessage,
  createSignedRequest,
} from "../utils/signing";

/**
 * Custom hook for wallet connection and management
 * Stores wallet address in localStorage for persistence across components
 */
export function useWallet() {
  const { address, isConnected, status, chain } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect, error: disconnectError } = useDisconnect();

  // Store wallet address in localStorage whenever it changes
  useEffect(() => {
    if (address && isConnected) {
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("walletConnected", "true");
    } else {
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("walletConnected");
    }
  }, [address, isConnected]);

  const connectMetaMask = () => {
    const metaMaskConnector =
      connectors.find((c) => c.name === "MetaMask") || connectors[0];
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
  };

  // Wrapper for signing messages with error handling
  const sign = useCallback(
    async (message: string): Promise<string> => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      return signMessage(message);
    },
    [isConnected],
  );

  // Wrapper for getting current address
  const getCurrentAddress = useCallback(async (): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }
    return address;
  }, [isConnected, address]);

  // Wrapper for creating signed requests
  const createSignedPayload = useCallback(
    async <T extends object>(
      data: T,
    ): Promise<{ data: T; signature: string; userAddress: string }> => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }
      return createSignedRequest(data, address);
    },
    [isConnected, address],
  );

  return {
    // State
    address,
    isConnected,
    status,
    chain,

    // Actions
    connect: connectMetaMask,
    disconnect,
    sign,
    getCurrentAddress,
    createSignedPayload,

    // Errors
    error: connectError || disconnectError,
  };
}
