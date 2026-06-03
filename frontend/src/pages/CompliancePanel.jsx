import React, { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { toast } from "react-hot-toast";
import { keccak256, toUtf8Bytes, isAddress } from "ethers";
import { useAccount } from "wagmi";
import { accessApi } from "../api";

const CERT_TYPES = [
  { id: 0, label: "Fire Safety", icon: "fire_extinguisher", color: "text-red-500", bg: "bg-red-500/10" },
  { id: 1, label: "Building Safety", icon: "domain", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 2, label: "Labor Standards", icon: "engineering", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: 3, label: "Environmental", icon: "eco", color: "text-green-500", bg: "bg-green-500/10" },
];

export default function CompliancePanel() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const { address: walletAddress } = useAccount();
  const [sellerAddress, setSellerAddress] = useState("");
  const [selectedType, setSelectedType] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revokingType, setRevokingType] = useState(null);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  const [revokeTargetAddress, setRevokeTargetAddress] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [accessRevocations, setAccessRevocations] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Fetch current compliance status for the given seller via REST
  const checkSellerStatus = async () => {
    const normalizedSellerAddress = sellerAddress.trim();
    if (!normalizedSellerAddress || !isAddress(normalizedSellerAddress)) return;
    
    setFetchingStatus(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/${normalizedSellerAddress}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to fetch status");

      const fire = data.compliance.find(c => c.type === "FireSafety")?.isValid;
      const building = data.compliance.find(c => c.type === "BuildingSafety")?.isValid;
      const labor = data.compliance.find(c => c.type === "LaborStandards")?.isValid;
      const env = data.compliance.find(c => c.type === "Environmental")?.isValid;
      const hasAnyRecord = data.compliance.some(c => c.cid || c.certDocHash);

      setSellerStatus({
        isRegistered: hasAnyRecord,
        name: normalizedSellerAddress,
        sellerAddress: normalizedSellerAddress,
        hasFire: fire,
        hasBuilding: building,
        hasLabor: labor,
        hasEnv: env,
        complianceDetails: data.compliance,
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
    const normalizedSellerAddress = sellerAddress.trim();
    if (!normalizedSellerAddress) return toast.error("Please enter a seller address");
    if (!isAddress(normalizedSellerAddress)) {
      return toast.error("Please enter a valid Ethereum seller address");
    }
    if (!selectedFile) return toast.error("Please upload a certificate document");

    setLoading(true);
    try {
      toast.loading("Uploading document to IPFS...", { id: "issue" });
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("label", `Compliance-${normalizedSellerAddress}-${selectedType}`);

      const ipfsRes = await fetch(`${API_BASE}/ipfs/upload`, {
        method: "POST",
        body: formData,
      });
      const ipfsData = await ipfsRes.json();
      if (!ipfsRes.ok || !ipfsData.success) throw new Error(ipfsData.error || "IPFS upload failed");

      const cid = ipfsData.cid;
      const certDocHash = keccak256(toUtf8Bytes(cid));

      toast.loading("Issuing certificate to blockchain...", { id: "issue" });
      const response = await fetch(`${API_BASE}/compliance/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: normalizedSellerAddress,
          certType: selectedType,
          certDocHash,
          cid,
          expiresAt: Math.floor(Date.now() / 1000) + 31536000 // 1 year expiry
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      
      toast.success("Certificate issued successfully! ✅", { id: "issue" });
      setSelectedFile(null);
      checkSellerStatus();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to issue certificate", { id: "issue" });
    } finally {
      setLoading(false);
    }
  };

  const loadAccessRevocations = async () => {
    try {
      const res = await accessApi.list(true);
      if (res.success) setAccessRevocations(res.data || []);
    } catch {
      setAccessRevocations([]);
    }
  };

  useEffect(() => {
    loadAccessRevocations();
  }, []);

  const handleRevokeWalletAccess = async () => {
    if (!walletAddress) return toast.error("Connect your compliance checker wallet first");
    if (!revokeTargetAddress || revokeTargetAddress.length !== 42) {
      return toast.error("Enter a valid wallet address to revoke");
    }
    setAccessLoading(true);
    try {
      const res = await accessApi.revoke({
        address: revokeTargetAddress,
        role: "seller",
        reason: revokeReason || "Policy violation",
        revokedBy: walletAddress,
      });
      if (!res.success) throw new Error(res.error || "Revoke failed");
      toast.success(`Access revoked for ${revokeTargetAddress.slice(0, 10)}...`);
      setRevokeTargetAddress("");
      setRevokeReason("");
      loadAccessRevocations();
    } catch (err) {
      toast.error(err.message || "Failed to revoke wallet access");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRestoreWalletAccess = async (address) => {
    if (!walletAddress) return toast.error("Connect your compliance checker wallet first");
    setAccessLoading(true);
    try {
      const res = await accessApi.restore({ address, restoredBy: walletAddress });
      if (!res.success) throw new Error(res.error || "Restore failed");
      toast.success(`Access restored for ${address.slice(0, 10)}...`);
      loadAccessRevocations();
    } catch (err) {
      toast.error(err.message || "Failed to restore access");
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRevokeCert = async (certTypeId) => {
    if (!sellerAddress) return toast.error("Please enter a seller address");
    setRevokingType(certTypeId);
    try {
      toast.loading("Revoking certificate on-chain...", { id: "revoke" });
      const response = await fetch(`${API_BASE}/compliance/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress,
          certType: certTypeId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to revoke");

      toast.success("Certificate revoked successfully.", { id: "revoke" });
      checkSellerStatus();
    } catch (err) {
      toast.error(err.message || "Failed to revoke certificate", { id: "revoke" });
    } finally {
      setRevokingType(null);
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

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Upload Certificate Document (PDF, Image)
                </label>
                <div className="relative border-1 border-border-dark bg-[#1A221C] rounded-xl overflow-hidden focus-within:border-primary">
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-text-secondary file:mr-4 file:py-3 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-[#111813] hover:file:bg-primary-hover cursor-pointer"
                    required
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-primary mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
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
                    <p className="text-sm text-text-secondary mb-1">Seller Wallet</p>
                    <p className="text-lg font-bold text-white font-mono break-all">
                      {sellerStatus.sellerAddress || sellerStatus.name || "Unknown / Not Registered"}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${sellerStatus.isRegistered ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {sellerStatus.isRegistered ? 'Records Found' : 'No Records'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {CERT_TYPES.map((cert) => {
                    const hasCert = sellerStatus.complianceDetails?.find(c => c.type === cert.label.replace(" ", ""))?.isValid;
                    const docCid = sellerStatus.complianceDetails?.find(c => c.type === cert.label.replace(" ", ""))?.cid;

                    return (
                      <div key={cert.id} className="bg-[#1A221C] border border-border-dark rounded-xl p-4 flex flex-col gap-3 relative">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasCert ? cert.bg : 'bg-border-dark'} ${hasCert ? cert.color : 'text-gray-500'}`}>
                            <span className="material-symbols-outlined">{cert.icon}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{cert.label}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${hasCert ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                              {hasCert ? "Active" : "Missing / Expired"}
                            </span>
                          </div>
                        </div>

                        {docCid && (
                          <div className="border-t border-border-dark pt-3 mt-1 flex justify-between items-center">
                            <span className="text-xs text-text-secondary truncate w-2/3" title={docCid}>
                              IPFS: {docCid.slice(0, 10)}...{docCid.slice(-6)}
                            </span>
                            <a 
                              href={`https://gateway.pinata.cloud/ipfs/${docCid}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              View Doc
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleRevokeCert(cert.id)}
                            disabled={!hasCert || revokingType === cert.id}
                            className="text-xs font-bold px-3 py-2 rounded-lg border border-border-dark bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {revokingType === cert.id ? "Revoking..." : "Revoke"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-red-500 bg-red-500/10 rounded-xl">
                <p>Factory not found or invalid address.</p>
              </div>
            )}
          </div>
        </div>

        {/* Off-chain wallet access control (POC RBAC) */}
        <div className="mt-8 rounded-xl border border-border-dark bg-surface-dark p-6">
          <h2 className="text-white text-lg font-bold mb-1">Wallet Access Control</h2>
          <p className="text-text-secondary text-sm mb-6">
            Revoke off-chain API access for a wallet (signed relay endpoints). On-chain roles are unchanged.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white">Wallet to revoke</label>
              <input
                className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg p-3 font-mono"
                placeholder="0x..."
                value={revokeTargetAddress}
                onChange={(e) => setRevokeTargetAddress(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white">Reason</label>
              <input
                className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg p-3"
                placeholder="Policy violation"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={handleRevokeWalletAccess}
            disabled={accessLoading}
            className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500/20 disabled:opacity-50"
          >
            {accessLoading ? "Processing..." : "Revoke Wallet Access"}
          </button>

          {accessRevocations.length > 0 && (
            <div className="mt-6 border-t border-border-dark pt-4">
              <p className="text-xs text-text-secondary uppercase font-bold mb-3">Active revocations</p>
              <div className="space-y-2">
                {accessRevocations.map((r) => (
                  <div
                    key={r._id || r.address}
                    className="flex items-center justify-between p-3 rounded-lg bg-background-dark border border-border-dark"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-mono text-sm truncate">{r.address}</p>
                      <p className="text-xs text-text-secondary">{r.reason || "No reason"}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreWalletAccess(r.address)}
                      disabled={accessLoading}
                      className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
