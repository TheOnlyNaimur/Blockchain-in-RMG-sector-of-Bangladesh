import React from "react";
import { useRoleDetection, getRoleLabel } from "../hooks/useRoleDetection";

/**
 * Component to guard content based on user role
 * Shows content only if user has one of the required roles
 *
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {string[]} requiredRoles - Array of allowed roles
 * @param {React.ReactNode} fallback - Content to show if not authorized
 * @param {boolean} requireAnyRole - If true, user needs ANY of the roles; if false, needs ALL
 */
export default function RoleGuard({
  children,
  requiredRoles = [],
  fallback,
  requireAnyRole = true,
}) {
  const { detectedRole, loading, isConnected } = useRoleDetection();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary">Detecting your role...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      fallback || (
        <div className="rounded-lg border border-warning-500 bg-warning-500/10 p-6">
          <h3 className="mb-2 text-base font-semibold text-warning-600">
            Wallet Not Connected
          </h3>
          <p className="text-sm text-text-secondary">
            Please connect your MetaMask wallet to access this feature.
          </p>
        </div>
      )
    );
  }

  if (requiredRoles.length === 0) {
    // No role restriction
    return <>{children}</>;
  }

  const hasRequiredRole = requireAnyRole
    ? requiredRoles.includes(detectedRole)
    : requiredRoles.every((role) => role === detectedRole);

  if (!hasRequiredRole) {
    const roleString = requiredRoles.map(getRoleLabel).join(" or ");
    return (
      fallback || (
        <div className="rounded-lg border border-danger-500 bg-danger-500/10 p-6">
          <h3 className="mb-2 text-base font-semibold text-danger-600">
            Access Denied
          </h3>
          <p className="text-sm text-text-secondary">
            This feature is only available for {roleString}. Your account role:{" "}
            <span className="font-semibold">
              {detectedRole ? getRoleLabel(detectedRole) : "No Role Detected"}
            </span>
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
