import { createContext, useContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRoleDetection } from "../hooks/useRoleDetection";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { detectedRole, loading: roleLoading } = useRoleDetection();
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-detect role when wallet connects and update user info
  useEffect(() => {
    if (isConnected && address) {
      // First check localStorage for custom role/profile
      const stored = localStorage.getItem(`user_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role);
        setUserProfile({
          ...(parsed.profile || {}),
          role: parsed.profile?.role || parsed.role || null,
          address: parsed.profile?.address || address,
        });
      } else if (detectedRole) {
        // If no custom role, use auto-detected role
        setUserRole(detectedRole);
        // Auto-populate a basic profile so Settings page isn't empty
        const roleLabels = {
          certifier: "Certifier",
          qualityChecker: "Quality Inspector",
          freightForwarder: "Freight Forwarder",
          exportCustoms: "Export Customs Officer",
          importCustoms: "Import Customs Officer",
          complianceChecker: "Compliance Auditor",
          seller: "Seller",
          buyer: "Buyer",
        };
        setUserProfile({
          address,
          displayName: roleLabels[detectedRole] || detectedRole,
          role: detectedRole,
          email: "",
          contactNumber: "",
        });
        console.log(`✓ Auto-set role from address detection: ${detectedRole}`);
      } else {
        // No role detected - user might be seller/buyer (self-registered)
        setUserRole(null);
      }
    } else {
      // Wallet disconnected
      setUserRole(null);
      setUserProfile(null);
    }
  }, [isConnected, address, detectedRole]);

  const setUser = (role, profile) => {
    setUserRole(role);
    setUserProfile(profile);
    if (address) {
      localStorage.setItem(
        `user_${address}`,
        JSON.stringify({ role, profile }),
      );
    }
  };

  const clearUser = () => {
    setUserRole(null);
    setUserProfile(null);
    if (address) {
      localStorage.removeItem(`user_${address}`);
    }
  };

  return (
    <UserContext.Provider
      value={{
        userRole,
        setUserRole: setUser,
        clearUser,
        userProfile,
        setUserProfile,
        loading,
        setLoading,
        error,
        setError,
        isConnected,
        address,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
