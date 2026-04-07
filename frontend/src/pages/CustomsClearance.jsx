import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import RoleGuard from "../components/RoleGuard";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import {
  useExportVerify,
  useImportVerify,
  useShipmentDocuments,
  useShipmentEvents,
} from "../hooks";

export default function CustomsClearance() {
  const { data: allShipments = [], refetch } = useShipmentEvents();
  const [exportQueue, setExportQueue] = useState([]);
  const [importQueue, setImportQueue] = useState([]);
  const [txLog, setTxLog] = useState([]);
  const [showProcess, setShowProcess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedExport, setSelectedExport] = useState(null);
  const [selectedImport, setSelectedImport] = useState(null);

  const {
    execute: exportVerify,
    loading: exportLoading,
    error: exportError,
  } = useExportVerify();
  const {
    execute: importVerify,
    loading: importLoading,
    error: importError,
  } = useImportVerify();
  const {
    execute: fetchShipmentDocuments,
    loading: docsLoading,
    error: docsError,
  } = useShipmentDocuments();
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedDocsShipment, setSelectedDocsShipment] = useState(null);
  const [shipmentDocs, setShipmentDocs] = useState(null);

  useEffect(() => {
    if (allShipments?.length > 0) {
      setExportQueue(allShipments.filter(s => s.shipStatus === "Requested" || s.shipStatus === "Export Cleared"));
      setImportQueue(allShipments.filter(s => s.shipStatus === "Export Cleared" || s.shipStatus === "Import Cleared"));
      
      const logs = [];
      allShipments.forEach(s => {
        s.timeline?.forEach(t => {
          logs.push({
            hash: "0x" + Math.random().toString(16).slice(2, 10),
            type: t.status,
            method: "process()",
            time: new Date(t.date).toLocaleTimeString(),
            status: "Confirmed",
            gas: "0.0031 ETH"
          });
        });
      });
      setTxLog(logs.reverse().slice(0, 5));
    }
  }, [allShipments]);

  const handleExportClearance = async (shipmentId, exportLicense) => {
    setProcessingId(shipmentId);
    setSuccessMessage("");
    try {
      const result = await exportVerify({
        shipmentId,
        data: {},
      });
      setSuccessMessage(`Export cleared! Transaction: ${result.txHash}`);
      
      // Update local state instantly
      setExportQueue(prev => prev.map(s => s.id === shipmentId ? { ...s, shipStatus: "Export Cleared" } : s));
      setImportQueue(prev => {
        const item = exportQueue.find(s => s.id === shipmentId);
        if (item && !prev.find(p => p.id === shipmentId)) {
           return [...prev, { ...item, shipStatus: "Export Cleared" }];
        }
        return prev;
      });
      
      // Auto-refresh the backend data
      refetch();

      setTimeout(() => {
        setSuccessMessage("");
        setProcessingId(null);
      }, 3000);
    } catch (err) {
      console.error("Export clearance failed:", err);
      setProcessingId(null);
    }
  };

  const handleImportClearance = async (shipmentId, importLicense) => {
    setProcessingId(shipmentId);
    setSuccessMessage("");
    try {
      const result = await importVerify({
        shipmentId,
        data: {},
      });
      setSuccessMessage(`Import cleared! Transaction: ${result.txHash}`);
      
      // Update local state instantly
      setImportQueue(prev => prev.map(s => s.id === shipmentId ? { ...s, shipStatus: "Import Cleared" } : s));
      
      // Auto-refresh the backend data
      refetch();

      setTimeout(() => {
        setSuccessMessage("");
        setProcessingId(null);
      }, 3000);
    } catch (err) {
      console.error("Import clearance failed:", err);
      setProcessingId(null);
    }
  };

  const handleOpenDocsVerification = async (shipment) => {
    const shipmentId = shipment?.id || shipment?.shipId;
    if (!shipmentId) return;

    setSelectedDocsShipment(shipment);
    setShowDocsModal(true);
    setShipmentDocs(null);

    try {
      const docs = await fetchShipmentDocuments({ shipmentId: String(shipmentId) });
      setShipmentDocs(docs);
    } catch (err) {
      console.error("Failed to fetch shipment documents:", err);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return "Not uploaded";
    if (hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return "Not uploaded";
    }
    return hash;
  };

  const handleForceRelease = async (item) => {
    setProcessingId(item.id);
    setSuccessMessage("");
    try {
      const orderId = item.orderId;
      const shipId = item.id;
      
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}/force-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipId
        })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) throw new Error(data.error || "Force release failed");
      
      setSuccessMessage(`Escrow Force Released! Tx Hash: ${data.txHash}`);
      setShowPayment(false);
      setTimeout(() => {
        setSuccessMessage("");
        setProcessingId(null);
      }, 5000);
    } catch(err) {
      console.error("Force release error:", err);
      setProcessingId(null);
    }
  };

  return (
    <RoleGuard requiredRoles={["exportCustoms", "importCustoms"]}>
      <AppLayout title="Customs & Payment">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-border-dark pb-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                <span className="material-symbols-outlined text-[14px] mr-1">
                  gavel
                </span>{" "}
                Customs Authority Console
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Customs Clearance & Payment Trigger
            </h1>
            <p className="text-slate-400 max-w-2xl">
              Process export/import clearances and trigger automated escrow
              payment releases via smart contract.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-surface-dark text-white px-4 py-2.5 rounded-lg border border-border-dark text-sm font-medium hover:bg-border-dark transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                analytics
              </span>{" "}
              Reports
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>{" "}
              Process New
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Pending Clearances"
            value={(exportQueue || []).length + (importQueue || []).length}
            change="5 urgent"
            icon="pending_actions"
            changeColor="text-yellow-500"
          />
          <StatCard
            label="Cleared Today"
            value={(exportQueue || []).filter(s => s.shipStatus === "Export Cleared" || s.shipStatus === "Import Cleared").length}
            change="+8%"
            icon="verified"
          />
          <StatCard
            label="Payments Triggered"
            value={`${(exportQueue || []).filter(s => s.amount && (s.shipStatus === "Import Cleared" || s.shipStatus === "Delivered & Paid")).reduce((acc, curr) => acc + Number(curr.amount), 0)} PYUSD`}
            change="Released"
            icon="payments"
          />
          <StatCard
            label="Avg. Process Time"
            value="< 1 Sec"
            change="Optimized"
            icon="timer"
          />
        </div>

        {/* Error & Success Messages */}
        {(exportError || importError) && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3 mb-6">
            <span className="material-symbols-outlined text-red-500 mt-1">
              error
            </span>
            <div>
              <p className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">
                Error
              </p>
              <p className="text-white text-sm">
                {exportError?.message || importError?.message}
              </p>
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

        {/* Export & Import Queues */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          {/* Export Queue */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">
                  flight_takeoff
                </span>
                Export Queue
              </h2>
              <span className="text-xs text-text-secondary">{exportQueue.filter(s => s.shipStatus === "Requested").length} pending, {exportQueue.filter(s => s.shipStatus === "Export Cleared").length} cleared</span>
            </div>
            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-darker border-b border-border-dark text-xs uppercase text-text-secondary tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Clearance ID</th>
                      <th className="p-4">Route</th>
                      <th className="p-4">State</th>
                      <th className="p-4">Docs</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {exportQueue.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-darker/30 transition-colors"
                      >
                        <td className="p-4 font-medium text-white">
                          {item.id || item.shipId}
                        </td>
                        <td className="p-4 text-slate-300">
                          Export ({item.batchId})
                        </td>
                        <td className="p-4">
                          <StatusBadge
                            label={item.shipStatus}
                            color={item.shipColor}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-border-dark rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${(item.docs?.length || 0) / 4 * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-text-secondary">
                              {item.docs?.length || 0}/4
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDocsVerification(item)}
                              className="bg-surface-darker text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-dark hover:bg-border-dark transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">fact_check</span>
                              Verify Docs
                            </button>
                            {item.shipStatus === "Export Cleared" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 px-2">
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                Export Cleared
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleExportClearance(
                                    item.id,
                                    `EXP-LICENSE-${item.id}`,
                                  )
                                }
                                disabled={
                                  exportLoading || processingId === item.id
                                }
                                className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-400 disabled:opacity-50 flex items-center gap-1"
                              >
                                {processingId === item.id ? (
                                  <span className="material-symbols-outlined text-xs animate-spin">
                                    cached
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
                                )}
                                {processingId === item.id
                                  ? "Processing..."
                                  : "Clear Export"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Import Queue */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">
                  flight_land
                </span>
                Import Queue
              </h2>
              <span className="text-xs text-text-secondary">{importQueue.filter(s => s.shipStatus === "Export Cleared").length} pending, {importQueue.filter(s => s.shipStatus === "Import Cleared").length} cleared</span>
            </div>
            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-darker border-b border-border-dark text-xs uppercase text-text-secondary tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Clearance ID</th>
                      <th className="p-4">Origin → Port</th>
                      <th className="p-4">State</th>
                      <th className="p-4">Duty</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {importQueue.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-darker/30 transition-colors"
                      >
                        <td className="p-4 font-medium text-white">
                          {item.id || item.shipId}
                        </td>
                        <td className="p-4 text-slate-300">
                          Import ({item.batchId})
                        </td>
                        <td className="p-4">
                          <StatusBadge
                            label={item.shipStatus}
                            color={item.shipColor}
                          />
                        </td>
                        <td className="p-4 text-white font-mono font-medium">
                          Escrow Ready
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDocsVerification(item)}
                              className="bg-surface-darker text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-dark hover:bg-border-dark transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">fact_check</span>
                              Verify Docs
                            </button>
                            {item.shipStatus === "Import Cleared" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 px-2">
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                Import Cleared
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleImportClearance(
                                    item.id || item.shipId,
                                    `IMP-LICENSE-${item.id || item.shipId}`,
                                  )
                                }
                                disabled={importLoading || processingId === item.id}
                                className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-400 disabled:opacity-50 flex items-center gap-1"
                              >
                                {processingId === item.id ? (
                                  <span className="material-symbols-outlined text-xs animate-spin">
                                    cached
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-[14px]">flight_land</span>
                                )}
                                {processingId === item.id
                                  ? "Processing..."
                                  : "Clear Import"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* TX Log + Payment Trigger */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
          <div className="xl:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                receipt_long
              </span>{" "}
              Recent Transactions
            </h2>
            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-darker border-b border-border-dark text-xs uppercase text-text-secondary tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">TX Hash</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Gas</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {txLog.map((tx) => (
                      <tr
                        key={tx.hash}
                        className="hover:bg-surface-darker/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-primary text-xs">
                          {tx.hash}
                        </td>
                        <td className="p-4 text-white font-medium">
                          {tx.type}
                        </td>
                        <td className="p-4 font-mono text-xs text-text-secondary">
                          {tx.method}
                        </td>
                        <td className="p-4 text-text-secondary">{tx.time}</td>
                        <td className="p-4 font-mono text-xs text-text-secondary">
                          {tx.gas}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="bg-surface-dark border-l-4 border-l-primary border border-border-dark rounded-xl p-6 sticky top-24 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Trigger Escrow Release
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-6">
                Release escrowed funds to the seller upon successful import
                clearance.
              </p>
              <div className="bg-surface-darker rounded-lg p-4 border border-border-dark mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">
                    Clearance ID
                  </span>
                  <span className="text-sm text-white font-mono">
                    {importQueue.length > 0 ? importQueue[0].id : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">
                    Escrow Amount
                  </span>
                  <span className="text-sm text-white font-mono font-bold">
                    Contract Determined
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">
                    Gas Estimate
                  </span>
                  <span className="text-sm text-primary font-mono">
                    ~0.0089 ETH
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (importQueue.length > 0) {
                    setSelectedExport(importQueue[0]);
                    setShowPayment(true);
                  }
                }}
                disabled={importQueue.length === 0}
                className="w-full bg-primary hover:bg-primary-hover text-background-dark font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">bolt</span>
                Confirm & Release Payment
              </button>
              <p className="text-xs text-center text-text-secondary">
                This action calls{" "}
                <code className="text-primary font-mono">triggerPayment()</code>{" "}
                on the smart contract.
              </p>
            </div>
          </div>
        </div>

        {/* ── PROCESS EXPORT MODAL ── */}
        {showDocsModal && selectedDocsShipment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowDocsModal(false)}
          >
            <div
              className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      fact_check
                    </span>
                    Customs Document Verification
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Shipment #{selectedDocsShipment.id || selectedDocsShipment.shipId} document hashes from freight forwarder
                  </p>
                </div>
                <button
                  onClick={() => setShowDocsModal(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {docsLoading && (
                  <div className="text-sm text-text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px]">cached</span>
                    Fetching on-chain document hashes...
                  </div>
                )}

                {docsError && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    Failed to load document hashes: {docsError.message}
                  </div>
                )}

                {shipmentDocs && (
                  <>
                    <div className="mb-5 rounded-lg border border-border-dark bg-background-dark p-4 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-text-secondary uppercase tracking-wider">Completion</span>
                      <span className="text-sm font-semibold text-white">
                        {shipmentDocs.uploadedCount}/{shipmentDocs.requiredCount} uploaded
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${shipmentDocs.readyForExportClearance ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {shipmentDocs.readyForExportClearance ? "Ready For Clearance" : "Incomplete"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {shipmentDocs.documents.map((doc) => (
                        <div key={doc.key} className="rounded-lg border border-border-dark bg-background-dark p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-semibold text-sm">{doc.label}</h4>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${doc.uploaded ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400"}`}>
                              {doc.uploaded ? "Uploaded" : "Missing"}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-slate-300 break-all">
                            {formatHash(doc.hash)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-text-secondary mt-4">
                      These are hashed records only. Actual files remain off-chain and are not exposed in this panel.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showProcess && selectedExport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowProcess(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400">
                      flight_takeoff
                    </span>
                    Process Export Clearance
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Clearance {selectedExport.id} — {selectedExport.country} →{" "}
                    {selectedExport.destination}
                  </p>
                </div>
                <button
                  onClick={() => setShowProcess(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Batch
                    </p>
                    <p className="text-white font-mono font-medium">
                      {selectedExport.batchId || selectedExport.batch}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Seller
                    </p>
                    <p className="text-white font-medium">
                      {selectedExport.seller || "Verified Seller"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Order ID
                    </p>
                    <p className="text-white">{selectedExport.orderId || selectedExport.order}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Value
                    </p>
                    <p className="text-white font-bold">
                      {selectedExport.amount || "See Escrow"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm mb-3">
                    Document Checklist
                  </h4>
                  <div className="space-y-2">
                    {[
                      "Commercial Invoice",
                      "Packing List",
                      "Certificate of Origin",
                      "Bill of Lading",
                    ].map((doc, i) => (
                      <label
                        key={doc}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background-dark border border-border-dark hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={i < selectedExport.docs}
                          className="w-4 h-4 text-primary bg-background-dark border-border-dark rounded focus:ring-primary"
                        />
                        <span className="material-symbols-outlined text-[18px] text-text-secondary">
                          description
                        </span>
                        <span className="text-sm text-white">{doc}</span>
                        {i < selectedExport.docs && (
                          <span className="ml-auto text-xs text-primary font-medium">
                            Uploaded
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Clearance Notes
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                    placeholder="Officer notes, observations, or conditions..."
                    rows="3"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowProcess(false)}
                  className="px-5 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowProcess(false)}
                  className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>
                  Mark as Cleared
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TRIGGER PAYMENT MODAL ── */}
        {showPayment && selectedExport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowPayment(false)}
          >
            <div
              className="w-full max-w-md bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      bolt
                    </span>
                    Trigger Escrow Payment
                  </h3>
                  <h3 className="text-xl font-bold text-white flex gap-3 items-center">
                    {selectedExport.id} — {selectedExport.seller ? `${selectedExport.seller.slice(0, 8)}...` : "Unknown Seller"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowPayment(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary">
                      payments
                    </span>
                  </div>
                  <p className="text-3xl font-black text-white font-mono">
                    {selectedExport.amount || "See Escrow"}
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    PYUSD to {selectedExport.seller ? `${selectedExport.seller.slice(0, 8)}...` : "Unknown Seller"}
                  </p>
                </div>

                <div className="bg-background-dark rounded-lg p-4 border border-border-dark space-y-3">
                  {[
                    ["Clearance ID", selectedExport.id],
                    ["Batch", selectedExport.batchId || selectedExport.batch],
                    [
                      "Route",
                      `${selectedExport.country || "Intl"} → ${selectedExport.destination || "Port"}`,
                    ],
                    ["Gas Estimate", "0.0089 ETH"],
                    ["Method", "triggerPayment()"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{k}</span>
                      <span className="text-white font-mono text-xs">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-500 text-[20px] mt-0.5">
                    warning
                  </span>
                  <p className="text-xs text-yellow-500/80">
                    This action is irreversible. The escrowed PYUSD will be
                    released to the seller's wallet immediately.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-border-dark bg-surface-darker flex gap-3">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleForceRelease(selectedExport)}
                  disabled={processingId === selectedExport.id}
                  className="flex-[2] py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {processingId === selectedExport.id ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      cached
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">
                      bolt
                    </span>
                  )}{" "}
                  {processingId === selectedExport.id ? "Releasing..." : "Confirm Release"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT REVIEW MODAL ── */}
        {showReview && selectedImport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowReview(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">
                      flight_land
                    </span>
                    Import Review — {selectedImport.id}
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    {selectedImport.origin} → {selectedImport.port}
                  </p>
                </div>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Clearance ID", selectedImport.id],
                    ["Batch", selectedImport.batch],
                    ["Importer", selectedImport.importer],
                    ["Goods", selectedImport.goods],
                    ["Weight", selectedImport.weight],
                    ["Vessel", selectedImport.vessel],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="p-3 rounded-lg bg-background-dark border border-border-dark"
                    >
                      <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                        {label}
                      </p>
                      <p className="text-white font-medium text-sm">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm mb-3">
                    Duty Assessment
                  </h4>
                  <div className="bg-background-dark rounded-lg p-4 border border-border-dark space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Customs Duty</span>
                      <span className="text-white font-mono font-bold">
                        {selectedImport.duty}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">VAT (19%)</span>
                      <span className="text-white font-mono">$2,394</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border-dark pt-2">
                      <span className="text-white font-medium">Total Due</span>
                      <span className="text-primary font-mono font-bold">
                        $6,594
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm mb-3">
                    Required Documents
                  </h4>
                  <div className="space-y-2">
                    {[
                      "Import License",
                      "Phytosanitary Certificate",
                      "Customs Declaration Form",
                    ].map((doc) => (
                      <div
                        key={doc}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background-dark border border-border-dark"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          check_circle
                        </span>
                        <span className="text-sm text-white">{doc}</span>
                        <span className="ml-auto text-xs text-primary font-medium">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center shrink-0">
                <button
                  onClick={() => setShowReview(false)}
                  className="px-4 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Close
                </button>
                <div className="flex gap-3">
                  <button className="px-4 py-2.5 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                    Hold
                  </button>
                  <button
                    onClick={() => setShowReview(false)}
                    className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      verified
                    </span>{" "}
                    Approve Clearance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROCESS NEW MODAL ── */}
        {showNew && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowNew(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      add
                    </span>
                    New Customs Clearance
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Create a new export or import clearance entry.
                  </p>
                </div>
                <button
                  onClick={() => setShowNew(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">Type</label>
                  <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                    <option>Export Clearance</option>
                    <option>Import Clearance</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Batch ID
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="B-XXXXX"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Order ID
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="ORD-XXXX"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Origin Country
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="e.g. China"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Destination
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="e.g. Netherlands"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Goods Description
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                    placeholder="Describe the goods being shipped..."
                    rows="2"
                  ></textarea>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Declared Value (PYUSD)
                  </label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                    placeholder="0.00"
                    type="number"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowNew(false)}
                  className="px-5 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNew(false)}
                  className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  Create Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
