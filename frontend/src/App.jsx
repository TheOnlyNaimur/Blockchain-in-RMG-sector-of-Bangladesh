import { Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import RoleGuard from "./components/RoleGuard";
import ConnectWallet from "./pages/ConnectWallet";
import SellerRegistration from "./pages/SellerRegistration";
import BuyerRegistration from "./pages/BuyerRegistration";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import CertifierPanel from "./pages/CertifierPanel";
import QCBatchReview from "./pages/QCBatchReview";
import FreightForwarderDocs from "./pages/FreightForwarderDocs";
import ShipmentTracking from "./pages/ShipmentTracking";
import CustomsClearance from "./pages/CustomsClearance";
import Settings from "./pages/Settings";
import CompliancePanel from "./pages/CompliancePanel";
import TraceabilityDashboard from "./pages/TraceabilityDashboard";

export default function App() {
  return (
    <UserProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<ConnectWallet />} />

        {/* Registration — open to unregistered wallet users */}
        <Route path="/register/seller" element={<SellerRegistration />} />
        <Route path="/register/buyer" element={<BuyerRegistration />} />

        {/* Seller — only seller role */}
        <Route
          path="/seller/dashboard"
          element={
            <RoleGuard requiredRoles={["seller"]}>
              <SellerDashboard />
            </RoleGuard>
          }
        />

        {/* Buyer — only buyer role */}
        <Route
          path="/buyer/dashboard"
          element={
            <RoleGuard requiredRoles={["buyer"]}>
              <BuyerDashboard />
            </RoleGuard>
          }
        />

        {/* Compliance Checker — Dedicated Compliance Panel */}
        <Route
          path="/compliance"
          element={
            <RoleGuard requiredRoles={["complianceChecker"]}>
              <CompliancePanel />
            </RoleGuard>
          }
        />

        {/* Certifier — only certifier role */}
        <Route
          path="/certifier"
          element={
            <RoleGuard requiredRoles={["certifier"]}>
              <CertifierPanel />
            </RoleGuard>
          }
        />

        {/* Quality Control — only qualityChecker role */}
        <Route
          path="/qc"
          element={
            <RoleGuard requiredRoles={["qualityChecker"]}>
              <QCBatchReview />
            </RoleGuard>
          }
        />

        {/* Freight Forwarder — only freightForwarder role */}
        <Route
          path="/freight"
          element={
            <RoleGuard requiredRoles={["freightForwarder"]}>
              <FreightForwarderDocs />
            </RoleGuard>
          }
        />

        {/* Customs — export or import customs */}
        <Route
          path="/customs"
          element={
            <RoleGuard requiredRoles={["exportCustoms", "importCustoms"]}>
              <CustomsClearance />
            </RoleGuard>
          }
        />

        {/* Shipment Tracking — accessible by all authenticated roles */}
        <Route
          path="/tracking/:id"
          element={
            <RoleGuard
              requiredRoles={[
                "seller",
                "buyer",
                "certifier",
                "qualityChecker",
                "freightForwarder",
                "exportCustoms",
                "importCustoms",
                "complianceChecker",
              ]}
            >
              <ShipmentTracking />
            </RoleGuard>
          }
        />
        <Route
          path="/tracking"
          element={
            <RoleGuard
              requiredRoles={[
                "seller",
                "buyer",
                "certifier",
                "qualityChecker",
                "freightForwarder",
                "exportCustoms",
                "importCustoms",
                "complianceChecker",
              ]}
            >
              <ShipmentTracking />
            </RoleGuard>
          }
        />

        {/* Traceability Dashboard — accessible by all authenticated roles */}
        <Route
          path="/traceability"
          element={
            <RoleGuard
              requiredRoles={[
                "seller",
                "buyer",
                "certifier",
                "qualityChecker",
                "freightForwarder",
                "exportCustoms",
                "importCustoms",
                "complianceChecker",
              ]}
            >
              <TraceabilityDashboard />
            </RoleGuard>
          }
        />

        {/* Settings — all roles */}
        <Route path="/settings" element={<Settings />} />

        {/* Catch-all: redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}
