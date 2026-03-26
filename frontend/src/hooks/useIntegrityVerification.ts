import { useState, useEffect } from "react";

interface IntegrityResult {
  isVerified: boolean | null;
  loading: boolean;
  error: string | null;
  storedHash: string | null;
  recomputedHash: string | null;
}

const API_BASE_URL =
  (import.meta as any).env.VITE_API_URL || "http://localhost:3000/api";

/**
 * Hook to verify the integrity of a MongoDB record by re-hashing
 * its rawData and comparing to the stored dataHash.
 *
 * @param txHash - The transaction hash of the record to verify
 * @param autoVerify - If true, automatically verifies on mount (default: false)
 */
export function useIntegrityVerification(
  txHash: string | null,
  autoVerify: boolean = false,
): IntegrityResult & { verify: () => Promise<void> } {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [recomputedHash, setRecomputedHash] = useState<string | null>(null);

  const verify = async () => {
    if (!txHash) {
      setError("No transaction hash provided");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/records/verify/${txHash}`,
      );

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsVerified(data.integrityValid);
        setStoredHash(data.storedHash);
        setRecomputedHash(data.recomputedHash);
      } else {
        setError(data.error || "Verification failed");
        setIsVerified(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification error");
      setIsVerified(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoVerify && txHash) {
      verify();
    }
  }, [txHash, autoVerify]);

  return { isVerified, loading, error, storedHash, recomputedHash, verify };
}
