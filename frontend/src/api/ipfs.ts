import { apiClient } from "./client";

/**
 * Upload a file to IPFS via the backend Pinata integration.
 *
 * @param file - File object from an <input type="file">
 * @param label - Optional label for the upload
 * @returns { cid, ipfsUrl, fileName, mimeType, size }
 */
export async function uploadToIPFS(file: File, label?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);

  const url = `${(import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api"}/ipfs/upload`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `Upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the IPFS gateway URL for a given CID.
 */
export async function getIPFSUrl(cid: string) {
  return apiClient.get<{ success: boolean; cid: string; ipfsUrl: string }>(
    `/ipfs/url/${cid}`,
  );
}

/**
 * Upload a shipment document (file + privateKey) to IPFS and store hash on-chain.
 *
 * @param shipId - Shipment ID
 * @param file - File to upload
 * @param privateKey - Freight forwarder's private key
 */
export async function uploadShipmentDoc(
  shipId: string,
  file: File,
  privateKey: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("privateKey", privateKey);

  const url = `${(import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api"}/shipments/${shipId}/doc`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Doc upload failed" }));
    throw new Error(err.error || `Doc upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check IPFS/Pinata health.
 */
export async function checkIPFSHealth() {
  return apiClient.get<{ success: boolean; pinataConnected: boolean }>(
    "/ipfs/health",
  );
}
