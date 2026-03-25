import { ethers } from "ethers";

/**
 * Sign a message using MetaMask/wallet
 * @param message - The message to sign (typically JSON stringified data)
 * @returns The signature string
 */
export async function signMessage(message: string): Promise<string> {
  try {
    // Get the signer from the connected wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Sign the message using MetaMask
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    throw new Error(
      `Failed to sign message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get the current user's address
 * @returns The connected wallet address
 */
export async function getUserAddress(): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return address;
  } catch (error) {
    throw new Error(
      `Failed to get user address: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Sign and verify a data payload
 * Creates a JSON string from the data, signs it, and returns the signature request object
 * @param data - The data object to sign
 * @param userAddress - The user's wallet address
 * @returns An object with data, signature, and userAddress ready for API submission
 */
export async function createSignedRequest<T extends object>(
  data: T,
  userAddress: string,
): Promise<{ data: T; signature: string; userAddress: string }> {
  const dataString = JSON.stringify(data);
  const signature = await signMessage(dataString);

  return {
    data,
    signature,
    userAddress,
  };
}

/**
 * Verify a signature against data (for testing/validation purposes)
 * @param message - The original message
 * @param signature - The signature to verify
 * @param expectedAddress - The address that should have signed it
 * @returns true if signature is valid
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string,
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
