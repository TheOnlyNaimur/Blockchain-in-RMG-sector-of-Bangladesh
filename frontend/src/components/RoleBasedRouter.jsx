import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useRoleDetection, getRoleLabel } from "../hooks/useRoleDetection";

/**
 * Component that shows content based on detected user role
 * Automatically routes to the appropriate panel
 */
export default function RoleBasedRouter() {
  const navigate = useNavigate();
  const { userRole } = useUser();
  const { detectedRole, isConnected, loading } = useRoleDetection();

  const currentRole = userRole || detectedRole;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-lg">Detecting your role...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
          <p className="text-text-secondary mb-6">
            Please connect your MetaMask wallet to access the application.
          </p>
          <p className="text-sm text-text-tertiary">
            Your wallet address will be used to determine your role in the
            system.
          </p>
        </div>
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">
            Role Not Assigned
          </h2>
          <p className="text-text-secondary mb-6">
            Your wallet is connected, but no role has been assigned yet.
          </p>
          <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-6">
            <p className="text-text-secondary mb-3 text-sm">
              Get started by registering:
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/register/seller")}
                className="px-4 py-2 bg-primary text-[#111813] rounded-lg font-semibold hover:bg-primary-hover transition-colors"
              >
                Register as Seller
              </button>
              <button
                onClick={() => navigate("/register/buyer")}
                className="px-4 py-2 bg-primary text-[#111813] rounded-lg font-semibold hover:bg-primary-hover transition-colors"
              >
                Register as Buyer
              </button>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Sellers can list products and manage inventory. Buyers can purchase
            and track orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-40 bg-bg-secondary/95 backdrop-blur-sm border-b border-border-color px-6 py-3">
        <p className="text-sm text-text-secondary">
          Logged in as:{" "}
          <span className="font-semibold text-primary-400">
            {getRoleLabel(currentRole)}
          </span>
        </p>
      </div>
    </div>
  );
}
