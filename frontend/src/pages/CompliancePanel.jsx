import React, { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";

const CERT_TYPES = [
  {
    id: 0,
    label: "Fire Safety",
    icon: "fire_extinguisher",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: 1,
    label: "Building Safety",
    icon: "domain",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: 2,
    label: "Labor Standards",
    icon: "engineering",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: 3,
    label: "Environmental",
    icon: "eco",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

const CERT_TYPE_KEYS = [
  "FireSafety",
  "BuildingSafety",
  "LaborStandards",
  "Environmental",
];

const CERT_STATUS_ROWS = [
  {
    key: "FireSafety",
    label: "Fire Safety",
    icon: "fire_extinguisher",
    color: "text-red-500",
    field: "hasFire",
  },
  {
    key: "BuildingSafety",
    label: "Building Safety",
    icon: "domain",
    color: "text-blue-500",
    field: "hasBuilding",
  },
  {
    key: "LaborStandards",
    label: "Labor Standards",
    icon: "engineering",
    color: "text-amber-500",
    field: "hasLabor",
  },
  {
    key: "Environmental",
    label: "Environmental",
    icon: "eco",
    color: "text-green-500",
    field: "hasEnv",
  },
];

export default function CompliancePanel() {
  const [sellerAddress, setSellerAddress] = useState("");
  const [selectedType, setSelectedType] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certFileName, setCertFileName] = useState("");
  const isSellerApproved = sellerStatus?.isRegistered === true;

  // Fetch current compliance status for the given seller via REST
  const checkSellerStatus = async () => {
    if (!sellerAddress || !ethers.isAddress(sellerAddress)) return;

    setFetchingStatus(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/compliance/${sellerAddress}?t=${Date.now()}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Failed to fetch status");

      const complianceByType = Object.fromEntries(
        (data.compliance || []).map((c) => [c.type, c]),
      );

      setSellerStatus({
        isRegistered: Boolean(data.isApproved),
        name: "Queried Factory",
        hasFire: Boolean(complianceByType.FireSafety?.isValid),
        hasBuilding: Boolean(complianceByType.BuildingSafety?.isValid),
        hasLabor: Boolean(complianceByType.LaborStandards?.isValid),
        hasEnv: Boolean(complianceByType.Environmental?.isValid),
        docs: {
          FireSafety: {
            ipfsCid: complianceByType.FireSafety?.ipfsCid || null,
            certDocHash: complianceByType.FireSafety?.certDocHash || null,
          },
          BuildingSafety: {
            ipfsCid: complianceByType.BuildingSafety?.ipfsCid || null,
            certDocHash: complianceByType.BuildingSafety?.certDocHash || null,
          },
          LaborStandards: {
            ipfsCid: complianceByType.LaborStandards?.ipfsCid || null,
            certDocHash: complianceByType.LaborStandards?.certDocHash || null,
          },
          Environmental: {
            ipfsCid: complianceByType.Environmental?.ipfsCid || null,
            certDocHash: complianceByType.Environmental?.certDocHash || null,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching seller status:", error);
      toast.error("Failed to fetch seller status");
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    if (ethers.isAddress(sellerAddress)) {
      checkSellerStatus();
    } else {
      setSellerStatus(null);
    }
  }, [sellerAddress]);

  const handleIssueCert = async (e) => {
    e.preventDefault();
    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return toast.error(
        "Please enter a valid seller wallet address, not an ID or private key.",
      );
    }
    if (!certFile) return toast.error("Please upload a certificate file");
    if (!sellerStatus?.isRegistered) {
      return toast.error(
        "Seller must be registered and approved before issuing compliance certificates.",
      );
    }

    setLoading(true);
    try {
      toast.loading("Uploading certificate to IPFS...", { id: "issue" });

      // Step 1: Upload certificate file to IPFS
      const formData = new FormData();
      formData.append("file", certFile);
      formData.append(
        "label",
        `Certificate_${CERT_TYPES[selectedType].label}_${sellerAddress.slice(0, 6)}`,
      );

      const uploadRes = await fetch("http://localhost:3000/api/ipfs/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "IPFS upload failed");
      }

      const uploadData = await uploadRes.json();
      const cid = uploadData.cid;

      // Step 2: Hash the CID to create the on-chain hash (same as backend)
      const certDocHash = ethers.keccak256(ethers.toUtf8Bytes(cid));

      toast.loading("Issuing certificate to blockchain...", { id: "issue" });

      // Step 3: Send the hash to the compliance endpoint
      const response = await fetch(
        `http://localhost:3000/api/compliance/issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerAddress,
            certType: selectedType,
            certDocHash, // Hash of the CID
            ipfsCid: cid, // Store IPFS CID for auditability
            expiresAt: Math.floor(Date.now() / 1000) + 31536000, // 1 year expiry
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);

      toast.success(
        "Certificate issued successfully! ✅\nFile hash stored on-chain with IPFS CID: " +
          cid.slice(0, 10) +
          "...",
        { id: "issue" },
      );

      // Optimistic UI update so the issued certificate appears immediately.
      const certTypeKey = CERT_TYPE_KEYS[selectedType];
      setSellerStatus((prev) => {
        if (!prev) return prev;

        const fieldByType = {
          FireSafety: "hasFire",
          BuildingSafety: "hasBuilding",
          LaborStandards: "hasLabor",
          Environmental: "hasEnv",
        };

        const updated = {
          ...prev,
          [fieldByType[certTypeKey]]: true,
          docs: {
            ...(prev.docs || {}),
            [certTypeKey]: {
              ipfsCid: cid,
              certDocHash,
            },
          },
        };

        return updated;
      });

      setCertFile(null);
      setCertFileName("");
      checkSellerStatus();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to issue certificate", {
        id: "issue",
      });
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
              <span className="material-symbols-outlined text-2xl">
                verified_user
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Issue Compliance Certificates
              </h2>
              <p className="text-text-secondary text-sm">
                As the designated Compliance Checker, you authorize factories
                for production. Sellers cannot create batches until all 4
                certificates are actively held.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Certificate Form */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Issue New Certificate
            </h3>

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

              {!fetchingStatus &&
                sellerAddress &&
                ethers.isAddress(sellerAddress) &&
                !isSellerApproved && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                    This seller must be approved on-chain before a compliance
                    certificate file can be uploaded or submitted.
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Certificate Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CERT_TYPES.map((cert) => (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedType(cert.id)}
                      className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${
                        selectedType === cert.id
                          ? "bg-primary/10 border-primary"
                          : "bg-[#1A221C] border-border-dark hover:border-gray-500"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${cert.bg} ${cert.color}`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {cert.icon}
                        </span>
                      </div>
                      <span
                        className={`font-medium ${selectedType === cert.id ? "text-primary" : "text-gray-300"}`}
                      >
                        {cert.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Certificate File (PDF/Document)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={!isSellerApproved}
                    onChange={(e) => {
                      if (!isSellerApproved) return;
                      if (e.target.files?.[0]) {
                        setCertFile(e.target.files[0]);
                        setCertFileName(e.target.files[0].name);
                      }
                    }}
                    className="w-full opacity-0 cursor-pointer h-12 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-0 bg-[#1A221C] border border-dashed border-border-dark rounded-lg px-4 py-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">
                        cloud_upload
                      </span>
                      <span className="text-sm text-text-secondary">
                        {isSellerApproved
                          ? certFileName || "Click to upload or drag and drop"
                          : "Seller must be approved before upload"}
                      </span>
                    </div>
                    {certFile && (
                      <span className="material-symbols-outlined text-green-500 text-xl">
                        check_circle
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Supported: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  loading || !sellerAddress || !certFile || !isSellerApproved
                }
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
            <h3 className="text-lg font-semibold text-white mb-6">
              Current Seller Status
            </h3>

            {!sellerAddress ? (
              <div className="h-48 flex flex-col items-center justify-center text-text-secondary border-2 border-dashed border-border-dark rounded-xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
                  search
                </span>
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
                    <p className="text-sm text-text-secondary mb-1">
                      Factory Name
                    </p>
                    <p className="text-lg font-bold text-white">
                      {sellerStatus.name || "Unknown / Not Registered"}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${sellerStatus.isRegistered ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}
                  >
                    {sellerStatus.isRegistered ? "Approved" : "Not Approved"}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">
                    Mandatory Certificates Held
                  </h4>
                  <div className="space-y-3">
                    {CERT_STATUS_ROWS.map((row) => {
                      const isValid = Boolean(sellerStatus[row.field]);
                      const ipfsCid = sellerStatus?.docs?.[row.key]?.ipfsCid;

                      return (
                        <div
                          key={row.key}
                          className="flex items-center justify-between p-3 bg-[#1A221C] rounded-lg border border-border-dark"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`material-symbols-outlined ${row.color}`}
                            >
                              {row.icon}
                            </span>
                            <span className="text-gray-300 font-medium">
                              {row.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isValid ? (
                              <span className="material-symbols-outlined text-green-500">
                                check_circle
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">
                                Missing
                              </span>
                            )}

                            {ipfsCid && (
                              <a
                                href={`https://ipfs.io/ipfs/${ipfsCid}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Open uploaded certificate"
                              >
                                View Document
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
