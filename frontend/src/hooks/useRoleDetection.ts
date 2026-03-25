import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export type UserRole =
  | "certifier"
  | "qualityChecker"
  | "seller"
  | "buyer"
  | "freightForwarder"
  | "exportCustoms"
  | "importCustoms"
  | null;

interface RoleConfig {
  role: UserRole;
  address: string;
  label: string;
}

/**
 * Hook to detect user role based on connected MetaMask address
 * Compares connected address against role addresses from environment variables
 */
export function useRoleDetection() {
  const { address, isConnected } = useAccount();
  const [detectedRole, setDetectedRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define role addresses from env
  const roleConfig: RoleConfig[] = [
    {
      role: "certifier",
      address: (import.meta.env.VITE_CERTIFIER_ADDRESS as string) || "",
      label: "Certifier",
    },
    {
      role: "qualityChecker",
      address: (import.meta.env.VITE_QUALITY_CHECKER_ADDRESS as string) || "",
      label: "Quality Checker",
    },
    {
      role: "freightForwarder",
      address: (import.meta.env.VITE_FREIGHT_FORWARDER_ADDRESS as string) || "",
      label: "Freight Forwarder",
    },
    {
      role: "exportCustoms",
      address: (import.meta.env.VITE_EXPORT_CUSTOMS_ADDRESS as string) || "",
      label: "Export Customs",
    },
    {
      role: "importCustoms",
      address: (import.meta.env.VITE_IMPORT_CUSTOMS_ADDRESS as string) || "",
      label: "Import Customs",
    },
    // Note: buyers and sellers register themselves, not hardcoded addresses
  ];

  useEffect(() => {
    if (!isConnected || !address) {
      setDetectedRole(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Normalize address to lowercase for comparison
      const connectedAddressLower = address.toLowerCase();

      // Find matching role
      const matchedRoleConfig = roleConfig.find(
        (config) => config.address.toLowerCase() === connectedAddressLower,
      );

      if (matchedRoleConfig) {
        setDetectedRole(matchedRoleConfig.role);
        console.log(`✓ Role detected: ${matchedRoleConfig.label} (${address})`);
      } else {
        // Address doesn't match any hardcoded role
        // Check if user is registered as buyer or seller (stored in localStorage after registration)
        const storedUserData = localStorage.getItem(
          `user_${connectedAddressLower}`,
        );
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            if (parsed.role === "buyer" || parsed.role === "seller") {
              setDetectedRole(parsed.role);
              console.log(`✓ Self-registered ${parsed.role} found: ${address}`);
              setLoading(false);
              return;
            }
          } catch (parseErr) {
            console.warn("Could not parse localStorage user data", parseErr);
          }
        }

        // No role found - user not registered yet
        console.log(`ℹ No hardcoded role found for ${address}`);
        setDetectedRole(null);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to detect role";
      setError(errorMsg);
      console.error("Role detection error:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  return {
    detectedRole,
    loading,
    error,
    isConnected,
    address,
    roleConfig,
  };
}

/**
 * Helper to check if user has specific role
 */
export function useHasRole(requiredRole: UserRole): boolean {
  const { detectedRole } = useRoleDetection();
  if (!requiredRole) return true; // No role requirement
  return detectedRole === requiredRole;
}

/**
 * Get role label for display
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<string, string> = {
    certifier: "Certifier",
    qualityChecker: "Quality Checker",
    seller: "Seller",
    buyer: "Buyer",
    freightForwarder: "Freight Forwarder",
    exportCustoms: "Export Customs",
    importCustoms: "Import Customs",
  };
  return role ? labels[role] : "Unknown Role";
}
