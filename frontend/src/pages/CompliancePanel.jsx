import React, { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { toast } from "react-hot-toast";

const CERT_TYPES = [
  { id: 0, label: "Fire Safety", icon: "fire_extinguisher", color: "text-red-500", bg: "bg-red-500/10" },
  { id: 1, label: "Building Safety", icon: "domain", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 2, label: "Labor Standards", icon: "engineering", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: 3, label: "Environmental", icon: "eco", color: "text-green-500", bg: "bg-green-500/10" },
];

export default function CompliancePanel() {
  const [sellerAddress, setSellerAddress] = useState("");
  const [selectedType, setSelectedType] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  // Fetch current compliance status for the given seller via REST
  const checkSellerStatus = async () => {
    if (!sellerAddress || sellerAddress.length !== 42) return;
    
    setFetchingStatus(true);
    try {
      const response = await fetch(`http://localhost:3000/api/compliance/${sellerAddress}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to fetch status");

      const fire = data.compliance.find(c => c.type === "FireSafety")?.isValid;
      const building = data.compliance.find(c => c.type === "BuildingSafety")?.isValid;
      const labor = data.compliance.find(c => c.type === "LaborStandards")?.isValid;
      const env = data.compliance.find(c => c.type === "Environmental")?.isValid;

      setSellerStatus({
        isRegistered: true, // Assuming registered if they have compliance data
        name: "Queried Factory", 
        hasFire: fire,
        hasBuilding: building,
        hasLabor: labor,
        hasEnv: env,
      });
    } catch (error) {
      console.error("Error fetching seller status:", error);
      toast.error("Failed to fetch seller status");
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    if (sellerAddress.length === 42) {
      checkSellerStatus();
    } else {
      setSellerStatus(null);
    }
  }, [sellerAddress]);

  const handleIssueCert = async (e) => {
    e.preventDefault();
    if (!sellerAddress) return toast.error("Please enter a seller address");

    setLoading(true);
    try {
      toast.loading("Issuing certificate to blockchain...", { id: "issue" });
      const response = await fetch(`http://localhost:3000/api/compliance/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress,
          certType: selectedType,
          certDocHash: "0xcc2a8069d343c5b5501fbfa15ceab4f52f4cba5b61b4097486e9cd726713c0ce", // Mock Hash
          expiresAt: Math.floor(Date.now() / 1000) + 31536000 // 1 year expiry
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      
      toast.success("Certificate issued successfully! ✅", { id: "issue" });
      checkSellerStatus();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to issue certificate", { id: "issue" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Compliance Issuance Panel">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Intro */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Issue Compliance Certificates</h2>
              <p className="text-text-secondary text-sm">
                As the designated Compliance Checker, you authorize factories for production. 
                Sellers cannot create batches until all 4 certificates are actively held.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Issue Certificate Form */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Issue New Certificate</h3>
            
            <form onSubmit={handleIssueCert} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Seller Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full bg-[#1A221C] border border-border-dark rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Certificate Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CERT_TYPES.map(cert => (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedType(cert.id)}
                      className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${
                        selectedType === cert.id 
                          ? "bg-primary/10 border-primary" 
                          : "bg-[#1A221C] border-border-dark hover:border-gray-500"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cert.bg} ${cert.color}`}>
                        <span className="material-symbols-outlined text-sm">{cert.icon}</span>
                      </div>
                      <span className={`font-medium ${selectedType === cert.id ? "text-primary" : "text-gray-300"}`}>
                        {cert.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !sellerAddress}
                className="w-full bg-primary hover:bg-primary-hover text-[#111813] font-bold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#111813]/20 border-t-[#111813] rounded-full animate-spin" />
                    Processing on Blockchain...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add_task</span>
                    Issue Certificate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Seller Status View */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Current Seller Status</h3>
            
            {!sellerAddress ? (
              <div className="h-48 flex flex-col items-center justify-center text-text-secondary border-2 border-dashed border-border-dark rounded-xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search</span>
                <p>Enter a seller address to view their compliance status</p>
              </div>
            ) : fetchingStatus ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : sellerStatus ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#1A221C] rounded-lg border border-border-dark">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Factory Name</p>
                    <p className="text-lg font-bold text-white">{sellerStatus.name || "Unknown / Not Registered"}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${sellerStatus.isRegistered ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {sellerStatus.isRegistered ? 'Registered' : 'Unregistered'}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">Mandatory Certificates Held</h4>
                  <div className="space-y-3">
                    
                    {/* Fire Safety */}
                    <div className="flex items-center justify-between p-3 bg-[#1A221C] rounded-lg border border-border-dark">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">fire_extinguisher</span>
                        <span className="text-gray-300 font-medium">Fire Safety</span>
                      </div>
                      {sellerStatus.hasFire ? (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">Missing</span>
                      )}
                    </div>

                    {/* Building */}
                    <div className="flex items-center justify-between p-3 bg-[#1A221C] rounded-lg border border-border-dark">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-500">domain</span>
                        <span className="text-gray-300 font-medium">Building Safety</span>
                      </div>
                      {sellerStatus.hasBuilding ? (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">Missing</span>
                      )}
                    </div>

                    {/* Labor */}
                    <div className="flex items-center justify-between p-3 bg-[#1A221C] rounded-lg border border-border-dark">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500">engineering</span>
                        <span className="text-gray-300 font-medium">Labor Standards</span>
                      </div>
                      {sellerStatus.hasLabor ? (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">Missing</span>
                      )}
                    </div>

                    {/* Env */}
                    <div className="flex items-center justify-between p-3 bg-[#1A221C] rounded-lg border border-border-dark">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-500">eco</span>
                        <span className="text-gray-300 font-medium">Environmental</span>
                      </div>
                      {sellerStatus.hasEnv ? (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">Missing</span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-red-500 bg-red-500/10 rounded-xl">
                <p>Factory not found or invalid address.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
