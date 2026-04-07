import React, { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import RoleGuard from "../components/RoleGuard";
import { generateTraceabilityPDF } from "../utils/pdfGenerator";

export default function TraceabilityDashboard() {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [searched, setSearched] = useState(false);

  const getEventMeta = (type) => {
    switch (type) {
      case "ORDER_CREATED": return { title: "Supply Chain Initiated", icon: "flag", color: "bg-blue-500" };
      case "BATCH_CREATED": return { title: "Production Batch Created", icon: "inventory_2", color: "bg-indigo-500" };
      case "QC_APPROVED": return { title: "Quality Check Approved", icon: "fact_check", color: "bg-emerald-500" };
      case "COMPLIANCE_ISSUED": return { title: "Compliance Verified", icon: "verified_user", color: "bg-green-500" };
      case "ESCROW_DEPOSITED": return { title: "USDT Escrow Locked", icon: "lock", color: "bg-indigo-500" };
      case "DOCS_UPLOADED": return { title: "Export Documents Anchored", icon: "description", color: "bg-purple-500" };
      case "EXPORT_CLEARED": return { title: "Export Customs Cleared", icon: "flight_takeoff", color: "bg-teal-500" };
      case "IMPORT_CLEARED": return { title: "Import Customs Cleared", icon: "flight_land", color: "bg-orange-500" };
      case "DELIVERY_CONFIRMED": return { title: "Delivery Confirmed & Funds Released", icon: "check_circle", color: "bg-primary" };
      case "ESCROW_RELEASED": return { title: "Escrow Force Released", icon: "gavel", color: "bg-red-500" };
      default: return { title: "Blockchain Event Anchored", icon: "link", color: "bg-slate-500" };
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId) return;
    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`http://localhost:3000/api/records?limit=1000`);
      const payload = await response.json();
      if (payload.success) {
        // Find records where rawData string representation contains the search ID uniquely
        const lowerSearch = searchId.toLowerCase();
        const filteredRecords = payload.data.filter(r =>
          JSON.stringify(r.rawData).toLowerCase().includes(lowerSearch) ||
          r.txHash.toLowerCase().includes(lowerSearch)
        ).reverse(); // Sort oldest to newest for timeline

        const mappedEvents = filteredRecords.map((r, i) => {
          const meta = getEventMeta(r.recordType);
          return {
            id: r.id || i,
            type: r.recordType,
            title: meta.title,
            desc: JSON.stringify(r.rawData).substring(0, 150) + "...",
            time: new Date(r.createdAt).toLocaleString(),
            txHash: r.txHash,
            block: r.blockNumber || "Pending",
            icon: meta.icon,
            color: meta.color,
            ipfs: r.rawData.docsHash || r.rawData.certDocHash || null,
          };
        });

        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error("Failed to trace search query:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard requiredRoles={["buyer", "seller", "freightForwarder", "qualitychecker", "exportCustoms", "importCustoms", "complianceChecker", "certifier"]}>
      <AppLayout title="Traceability & Audit">
        <div className="flex flex-col mb-10 border-b border-border-dark pb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
              <span className="material-symbols-outlined text-[14px] mr-1">
                polyline
              </span>{" "}
              Immutable Provenance
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Supply Chain Traceability Ledger
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Query tracking ID's to view cryptographic proofs, document hashes, and compliance verifications permanently recorded on the blockchain.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-surface-dark border border-border-dark p-6 rounded-2xl shadow-xl max-w-3xl mb-12">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold text-white uppercase tracking-wider">
                Order or Shipment ID
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary material-symbols-outlined">
                  search
                </span>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="e.g. ORD-84920 or SHIP-2291"
                  className="w-full bg-background-dark border border-border-dark text-white text-lg rounded-xl focus:ring-2 focus:ring-primary focus:border-primary py-4 pl-12 pr-4 font-mono transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !searchId}
              className="bg-primary hover:bg-primary-hover text-background-dark font-bold py-4 px-8 rounded-xl transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2 h-[60px]"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    cached
                  </span>
                  Tracing...
                </>
              ) : (
                <>
                  Verify Provenance
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {searched && !loading && events.length > 0 && (
          <div className="max-w-4xl bg-surface-dark border border-border-dark rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-10 pb-6 border-b border-border-dark relative z-10">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    verified
                  </span>
                  Cryptographic Audit Trail
                </h2>
                <p className="text-text-secondary font-mono mt-2">
                  Query Output for: <span className="text-white font-bold">{searchId}</span>
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <button
                  onClick={() => generateTraceabilityPDF(events, searchId)}
                  className="bg-surface-darker hover:bg-border-dark text-text-secondary hover:text-white p-2 text-sm rounded-lg transition-colors border border-border-dark flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download PDF
                </button>
                <span className="inline-flex items-center bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                  CHAIN VALIDATED
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 md:pl-0 z-10">
              {/* Timeline Line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-border-dark -ml-[0.5px]"></div>

              <div className="space-y-12">
                {events.map((event, index) => (
                  <div key={event.id} className={`relative flex flex-col md:flex-row items-start ${index % 2 === 0 ? "md:flex-row-reverse" : ""} group`}>

                    {/* Node / Icon */}
                    <div className="absolute left-0 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border-4 border-surface-dark bg-background-dark shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 group-hover:scale-110 transition-transform">
                      <div className={`w-full h-full rounded-full flex items-center justify-center ${event.color} text-white shadow-inner`}>
                        <span className="material-symbols-outlined text-[20px]">{event.icon}</span>
                      </div>
                    </div>

                    {/* Content Card */}
                    <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                      <div className="bg-background-dark border border-border-dark p-5 rounded-xl hover:border-primary/40 hover:shadow-[0_0_20px_rgba(19,236,91,0.05)] transition-all">
                        <span className="inline-block text-xs font-mono text-text-secondary mb-2 bg-surface-darker px-2 py-1 rounded border border-border-dark">
                          {event.time}
                        </span>

                        <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                        <p className="text-sm text-text-secondary mb-4 leading-relaxed break-all">{event.desc}</p>

                        <div className={`flex flex-col gap-2 ${index % 2 === 0 ? "md:items-end md:text-right" : "items-start text-left"}`}>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="material-symbols-outlined text-[14px] text-primary">tag</span>
                            <span className="text-slate-400">Block:</span>
                            <span className="text-white font-mono">{event.block}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs bg-surface-darker px-2 py-1 rounded border border-border-dark max-w-full overflow-hidden">
                            <span className="material-symbols-outlined text-[14px] text-blue-400 shrink-0">receipt_long</span>
                            <span className="text-slate-400 shrink-0">Tx:</span>
                            <span className="text-blue-400 hover:underline cursor-pointer font-mono truncate">{event.txHash}</span>
                          </div>

                          {event.ipfs && (
                            <div className="flex items-center gap-1.5 text-xs mt-1 bg-surface-darker px-2 py-1 rounded border border-border-dark text-purple-400">
                              <span className="material-symbols-outlined text-[14px]">public</span>
                              <span className="font-mono truncate max-w-[200px]">{event.ipfs}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 text-center border-t border-border-dark pt-8 relative z-10">
              <p className="text-sm text-text-secondary mb-4">
                This ledger ensures full transparency and accountability across the Bangladesh RMG export lifecycle.
              </p>
              <button 
                onClick={() => generateTraceabilityPDF(events, searchId)}
                className="bg-border-dark hover:bg-border-dark/80 text-white font-bold py-2 px-6 rounded-lg transition-colors border border-border-dark/50 flex items-center gap-2 mx-auto text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Audit Report (PDF)
              </button>
            </div>
          </div>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
