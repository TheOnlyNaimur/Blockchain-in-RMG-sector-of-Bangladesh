import { Routes, Route } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import ConnectWallet from "./pages/ConnectWallet";
import ConnectWalletRole from "./pages/ConnectWalletRole";
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

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<ConnectWallet />} />
        <Route path="/connect-role" element={<ConnectWalletRole />} />
        <Route path="/register/seller" element={<SellerRegistration />} />
        <Route path="/register/buyer" element={<BuyerRegistration />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
        <Route path="/certifier" element={<CertifierPanel />} />
        <Route path="/qc" element={<QCBatchReview />} />
        <Route path="/freight" element={<FreightForwarderDocs />} />
        <Route path="/tracking/:id" element={<ShipmentTracking />} />
        <Route path="/tracking" element={<ShipmentTracking />} />
        <Route path="/customs" element={<CustomsClearance />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </UserProvider>
  );
}
