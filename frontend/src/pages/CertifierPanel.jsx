import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import StatCard from "../components/ui/StatCard";
import RoleGuard from "../components/RoleGuard";
import { useSellerApproval, useSellerEvents } from "../hooks";
import { generateCertificatePDF } from "../utils/pdfGenerator";

export default function CertifierPanel() {
  const [activeTab, setActiveTab] = useState("pending");
  const { data: allSellers = [], refetch: refetchSellers } = useSellerEvents();
  const [pendingRows, setPendingRows] = useState([]);
  const [approvedRows, setApprovedRows] = useState([]);
  const [rejectedRows, setRejectedRows] = useState([]);
  const [selectedPending, setSelectedPending] = useState(null);
  const { execute: approveSeller, loading, error } = useSellerApproval();
  const [successMessage, setSuccessMessage] = useState("");
  const [approvalProcessing, setApprovalProcessing] = useState(null);

  useEffect(() => {
    if (allSellers?.length > 0) {
      const pending = allSellers.filter(s => s.status === "pending");
      setPendingRows(pending);
      setApprovedRows(allSellers.filter(s => s.status === "approved"));
      setRejectedRows(allSellers.filter(s => s.status === "rejected"));
      
      if (!selectedPending && pending.length > 0) {
        setSelectedPending(pending[0]);
      }
    }
  }, [allSellers]);

  const handleApprove = async (sellerAddress) => {
    setApprovalProcessing(sellerAddress);
    setSuccessMessage("");
    try {
      const result = await approveSeller({ sellerAddress, assign: 1 });
      setSuccessMessage(`Seller approved! Transaction: ${result.txHash}`);
      // Move from pending to approved
      const approved = pendingRows.find((r) => r.address === sellerAddress);
      if (approved) {
        setPendingRows((prev) =>
          prev.filter((r) => r.address !== sellerAddress),
        );
        setApprovedRows((prev) => [
          ...prev,
          {
            ...approved,
            date: new Date().toLocaleDateString(),
            certHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`,
            gasUsed: "0.0040 ETH",
          },
        ]);
      }
      setTimeout(() => {
        setSuccessMessage("");
        setApprovalProcessing(null);
      }, 3000);
    } catch (err) {
      console.error("Approval failed:", err);
      setApprovalProcessing(null);
    }
  };

  const handleReject = async (
    sellerAddress,
    reason = "Verification failed",
  ) => {
    try {
      // Move from pending to rejected
      const rejected = pendingRows.find((r) => r.address === sellerAddress);
      if (rejected) {
        setPendingRows((prev) =>
          prev.filter((r) => r.address !== sellerAddress),
        );
        setRejectedRows((prev) => [
          ...prev,
          {
            ...rejected,
            date: new Date().toLocaleDateString(),
            reason,
            reviewer: "Reviewer: Current User",
          },
        ]);
      }
    } catch (err) {
      console.error("Rejection failed:", err);
    }
  };

  const tabs = [
    { id: "pending", label: "Pending Requests", count: pendingRows.length },
    { id: "approved", label: "Approved History", count: approvedRows.length },
    { id: "rejected", label: "Rejected Log", count: rejectedRows.length },
  ];

  return (
    <RoleGuard requiredRoles={["certifier"]}>
      <AppLayout title="Certifier Panel">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === "pending"
                ? "Pending Certifications"
                : activeTab === "approved"
                  ? "Approved History"
                  : "Rejected Log"}
            </h2>
            <p className="text-text-secondary max-w-2xl">
              {activeTab === "pending" &&
                "Review and validate seller credentials before they are immutably recorded on the blockchain."}
              {activeTab === "approved" &&
                "Complete history of all approved certifications with on-chain certificate hashes."}
              {activeTab === "rejected" &&
                "Record of all rejected certification requests with reasons and reviewer notes."}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-surface-dark border border-border-dark text-white px-4 py-2 rounded-lg hover:bg-surface-darker transition-colors">
              <span className="material-symbols-outlined text-lg">
                filter_list
              </span>
              <span className="text-sm font-medium">Filter</span>
            </button>
            <button className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2 rounded-lg hover:bg-primary-hover font-semibold transition-colors">
              <span className="material-symbols-outlined text-lg">
                download
              </span>
              <span className="text-sm">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3 mb-6">
            <span className="material-symbols-outlined text-red-500 mt-1">
              error
            </span>
            <div>
              <p className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">
                Error
              </p>
              <p className="text-white text-sm">{error.message}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-3 mb-6">
            <span className="material-symbols-outlined text-primary mt-1">
              check_circle
            </span>
            <div>
              <p className="text-xs text-primary uppercase font-bold tracking-wider mb-1">
                Success
              </p>
              <p className="text-white text-sm break-all font-mono text-xs">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending Review" value={(allSellers || []).filter((s) => s.status === "pending").length.toString()} icon="pending_actions" />
          <StatCard label="Approved Total" value={(allSellers || []).filter((s) => s.status === "approved").length.toString()} icon="verified" />
          <StatCard label="Total Submissions" value={(allSellers || []).length.toString()} icon="domain" />
          <StatCard label="Avg. Wait Time" value="< 1 Sec" icon="schedule" />
        </div>

        {/* Tabs + Table */}
        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-sm mb-8">
          <div className="flex border-b border-border-dark px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white border-b-2 border-primary"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* ── PENDING TAB ── */}
          {activeTab === "pending" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                      <th className="px-6 py-4">Seller Address</th>
                      <th className="px-6 py-4">Company Name</th>
                      <th className="px-6 py-4">TIN / Tax ID</th>
                      <th className="px-6 py-4">Submitted</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {pendingRows.map((row, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedPending(row)}
                        className={`hover:bg-surface-darker/30 transition-colors group cursor-pointer ${selectedPending?.address === row.address ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-6 py-4 font-mono text-sm text-primary">
                          {row.address}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}
                            ></div>
                            {row.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.tin}
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.submitted}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Pending Review
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReject(row.address)}
                              className="text-text-secondary hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors disabled:opacity-50"
                              disabled={loading}
                            >
                              <span className="material-symbols-outlined text-xl">
                                close
                              </span>
                            </button>
                            <button
                              onClick={() => handleApprove(row.address)}
                              className="text-text-secondary hover:text-primary p-1 rounded hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                              disabled={
                                loading || approvalProcessing === row.address
                              }
                            >
                              {approvalProcessing === row.address ? (
                                <span className="material-symbols-outlined text-lg animate-spin">
                                  cached
                                </span>
                              ) : (
                                <span className="material-symbols-outlined text-xl">
                                  check
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                <span className="text-sm text-text-secondary">
                  Showing 1 to 4 of 24 results
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── APPROVED HISTORY TAB ── */}
          {activeTab === "approved" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                      <th className="px-6 py-4">Seller Address</th>
                      <th className="px-6 py-4">Company Name</th>
                      <th className="px-6 py-4">TIN / Tax ID</th>
                      <th className="px-6 py-4">Approved Date</th>
                      <th className="px-6 py-4">Certificate Hash</th>
                      <th className="px-6 py-4">Gas Used</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {approvedRows.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-surface-darker/30 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-sm text-primary">
                          {row.address}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}
                            ></div>
                            {row.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.tin}
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.date}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                              {row.certHash}
                            </span>
                            <button className="text-text-secondary hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-[14px]">
                                content_copy
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-xs font-mono">
                          {row.gasUsed}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => generateCertificatePDF(row)}
                              className="text-text-secondary hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-surface-darker transition-colors"
                              title="Download Certificate"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                download
                              </span>
                            </button>
                            <button className="text-text-secondary hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-surface-darker transition-colors">
                              <span className="material-symbols-outlined text-[18px]">
                                visibility
                              </span>
                            </button>
                            <button className="text-text-secondary hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-surface-darker transition-colors">
                              <span className="material-symbols-outlined text-[18px]">
                                open_in_new
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                <span className="text-sm text-text-secondary">
                  Showing 1 to 5 of 156 results
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── REJECTED LOG TAB ── */}
          {activeTab === "rejected" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                      <th className="px-6 py-4">Seller Address</th>
                      <th className="px-6 py-4">Company Name</th>
                      <th className="px-6 py-4">TIN / Tax ID</th>
                      <th className="px-6 py-4">Rejected Date</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4">Reviewer</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {rejectedRows.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-surface-darker/30 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-sm text-red-400">
                          {row.address}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}
                            ></div>
                            {row.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.tin}
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-sm">
                          {row.date}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-red-400/80 text-xs leading-relaxed line-clamp-2">
                            {row.reason}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-xs">
                          {row.reviewer}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="text-text-secondary hover:text-yellow-400 text-xs font-medium px-2 py-1 rounded hover:bg-yellow-400/10 transition-colors flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">
                                replay
                              </span>{" "}
                              Re-review
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                <span className="text-sm text-text-secondary">
                  Showing 1 to 3 of 18 results
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Area – only on pending tab */}
        {activeTab === "pending" && selectedPending && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-dark border border-border-dark rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">
                  Document Verification:{" "}
                  <span className="text-primary font-normal">
                    {selectedPending.name}
                  </span>
                </h3>
                <button className="text-sm text-text-secondary hover:text-white underline">
                  View Full Document
                </button>
              </div>
              <div className="bg-surface-darker border border-border-dark rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-border-dark">
                  <span className="material-symbols-outlined text-3xl text-text-secondary">
                    description
                  </span>
                </div>
                <p className="text-white font-medium mb-1">
                  Business_License_2024.pdf
                </p>
                <p className="text-sm text-text-secondary mb-4">
                  Verified by AI OCR System • 98% Match Confidence
                </p>
                <div className="w-full max-w-md h-2 bg-surface-dark rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[98%]"></div>
                </div>
              </div>
            </div>

            <div className="bg-surface-dark border-l-4 border-l-primary border border-border-dark rounded-xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-9xl text-primary">
                  gavel
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">
                Confirmation Required
              </h3>
              <p className="text-text-secondary text-sm mb-6 relative z-10">
                You are about to approve{" "}
                <strong className="text-white">{selectedPending.name}</strong>.
                This action is irreversible. A unique certificate hash will be
                generated and stored on the blockchain.
              </p>
              <div className="bg-surface-darker/50 rounded-lg p-3 mb-6 border border-border-dark relative z-10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Gas Fee Est.</span>
                  <span className="text-white font-mono">0.0042 ETH</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Hash Generation</span>
                  <span className="text-primary font-mono">Wait ~12s</span>
                </div>
              </div>
              <div className="flex gap-3 relative z-10">
                <button className="flex-1 px-4 py-2 border border-border-dark text-text-secondary hover:text-white rounded-lg text-sm font-medium hover:bg-surface-darker transition-colors">
                  Cancel
                </button>
                <button className="flex-1 bg-primary text-background-dark hover:bg-primary-hover rounded-lg text-sm font-bold py-2 transition-shadow shadow-[0_0_15px_-3px_rgba(19,236,91,0.3)]">
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved summary stats – only on approved tab */}
        {activeTab === "approved" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Certification Summary
              </h4>
              <div className="space-y-4">
                {[
                  { label: "Total Approved", value: "156", icon: "verified" },
                  { label: "This Month", value: "34", icon: "calendar_month" },
                  {
                    label: "Total Gas Spent",
                    value: "0.672 ETH",
                    icon: "local_gas_station",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between py-3 border-b border-border-dark/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        {s.icon}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-white font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-surface-dark border border-border-dark rounded-xl p-6">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Recent Certificate Verification
              </h4>
              <div className="bg-surface-darker border border-border-dark rounded-lg p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    verified
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">
                  Certificate Valid
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Pacific Rim Trading — Cert Hash:{" "}
                  <code className="text-primary font-mono text-xs">
                    0x7f83...d906
                  </code>
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-border-dark text-white rounded-lg text-sm font-medium hover:bg-[#34463b] transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">
                      open_in_new
                    </span>{" "}
                    View on Etherscan
                  </button>
                  <button 
                    onClick={() => generateCertificatePDF({ seller: "Pacific Rim Trading", certDocHash: "0x7f83...d906", id: "CERT-XYZ" })}
                    className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      download
                    </span>{" "}
                    Download Certificate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejected summary – only on rejected tab */}
        {activeTab === "rejected" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Rejection Reasons Breakdown
              </h4>
              <div className="space-y-4">
                {[
                  { reason: "Invalid TIN / Tax ID", count: 8, pct: 44 },
                  { reason: "Duplicate Registration", count: 5, pct: 28 },
                  { reason: "Incomplete Documentation", count: 3, pct: 17 },
                  { reason: "Suspicious Activity", count: 2, pct: 11 },
                ].map((r) => (
                  <div key={r.reason}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary">{r.reason}</span>
                      <span className="text-white font-medium">
                        {r.count} ({r.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-border-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500/60 rounded-full"
                        style={{ width: `${r.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Appeal Process
              </h4>
              <div className="bg-surface-darker border border-border-dark rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-yellow-500/10 p-3 rounded-lg text-yellow-500">
                    <span className="material-symbols-outlined text-2xl">
                      info
                    </span>
                  </div>
                  <div>
                    <h5 className="text-white font-bold mb-2">
                      How Appeals Work
                    </h5>
                    <ul className="text-text-secondary text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                          chevron_right
                        </span>{" "}
                        Rejected sellers can submit updated documents within 30
                        days
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                          chevron_right
                        </span>{" "}
                        Appeals are reviewed by a different certifier for
                        fairness
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                          chevron_right
                        </span>{" "}
                        Re-review button allows manual re-evaluation
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                          chevron_right
                        </span>{" "}
                        All decisions are logged on-chain for auditability
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
