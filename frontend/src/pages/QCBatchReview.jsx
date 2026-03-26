import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import StatCard from "../components/ui/StatCard";
import RoleGuard from "../components/RoleGuard";
import { useBatchQualityCheck, useBatchEvents } from "../hooks";

export default function QCBatchReview() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const { data: batchData, refetch } = useBatchEvents();
  const { execute: qualityCheck, loading, error } = useBatchQualityCheck();
  const [successMessage, setSuccessMessage] = useState("");
  const [processingBatchId, setProcessingBatchId] = useState(null);

  useEffect(() => {
    if (batchData?.created) {
      const mapped = batchData.created.map((c) => {
        const qualityEvent = batchData.quality?.find((q) => q.batchId === c.batchId);
        return {
          id: c.batchId,
          order: c.orderId,
          seller: batchData.seller ? `${batchData.seller.slice(0, 8)}...` : "Unknown Seller",
          initials: "BS",
          product: c.productInfoHash.substring(0, 10) + "...",
          qty: "N/A",
          time: new Date(c.timestamp?.[0] ? c.timestamp[0] * 1000 : Date.now()).toLocaleString(),
          status: qualityEvent ? (qualityEvent.status ? "Approved" : "Rejected") : "Pending",
          hash: c.productInfoHash,
        };
      });
      mapped.sort((a, b) => Number(b.id) - Number(a.id));
      setBatches(mapped);
      if (mapped.length > 0 && !selectedBatch) {
        setSelectedBatch(mapped[0]);
      }
    }
  }, [batchData]);

  const handleApproveBatch = async () => {
    if (!selectedBatch) return;

    setProcessingBatchId(selectedBatch.id);
    setSuccessMessage("");
    try {
      const result = await qualityCheck({
        batchId: selectedBatch.id,
        data: {
          status: "approved",
          comments: "Batch approved - meets all quality standards",
          certificationNumber: `CERT-${Date.now()}`,
        },
      });
      setSuccessMessage(`Batch approved! Transaction: ${result.txHash}`);
      // Update batch status in list
      setBatches((prev) =>
        prev.map((b) =>
          b.id === selectedBatch.id ? { ...b, status: "Approved" } : b,
        ),
      );
      setTimeout(() => {
        setSuccessMessage("");
        setProcessingBatchId(null);
      }, 3000);
    } catch (err) {
      console.error("Approval failed:", err);
      setProcessingBatchId(null);
    }
  };

  const handleRejectBatch = async () => {
    if (!selectedBatch) return;

    setProcessingBatchId(selectedBatch.id);
    setSuccessMessage("");
    try {
      const result = await qualityCheck({
        batchId: selectedBatch.id,
        data: {
          status: "rejected",
          comments: "Batch rejected - failed quality standards",
        },
      });
      setSuccessMessage(`Batch rejected! Transaction: ${result.txHash}`);
      setTimeout(() => {
        setSuccessMessage("");
        setProcessingBatchId(null);
      }, 3000);
    } catch (err) {
      console.error("Rejection failed:", err);
      setProcessingBatchId(null);
    }
  };

  return (
    <RoleGuard requiredRoles={["qualityChecker"]}>
      <AppLayout title="Quality Control">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border-dark pb-6 mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                <span className="material-symbols-outlined text-[14px]">
                  verified_user
                </span>{" "}
                Authorized Personnel Only
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
                Node: QC-US-EAST-04
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Batch Review Console
            </h1>
            <p className="text-text-secondary max-w-2xl">
              Validate product quality against smart contract specifications
              before authorizing shipment release.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-surface-dark px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-border-dark hover:bg-border-dark transition-all">
              <span className="material-symbols-outlined text-[18px]">
                history
              </span>{" "}
              Review History
            </button>
            <button 
              onClick={refetch}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-background-dark hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-[20px]">
                refresh
              </span>{" "}
              Sync Contract State
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Pending Reviews"
            value={(batches || []).filter((b) => b.status === "Pending").length.toString()}
            change="Action Req."
            icon="pending_actions"
            changeColor="text-orange-500"
          />
          <StatCard
            label="Approved Total"
            value={(batches || []).filter((b) => b.status === "Approved").length.toString()}
            change="Verified"
            icon="check_circle"
          />
          <StatCard label="Total Batches" value={(batches || []).length.toString()} icon="inventory_2" />
          <StatCard
            label="Avg. Processing Time"
            value="< 1 Sec"
            change="Optimal efficiency"
            icon="timer"
          />
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Table */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Pending Batches
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/20">
                  Live Feed
                </span>
              </h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-border-dark bg-surface-dark shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-surface-darker border-b border-border-dark">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-white">
                        Batch ID
                      </th>
                      <th className="px-6 py-4 font-semibold text-white">
                        Order ID
                      </th>
                      <th className="px-6 py-4 font-semibold text-white">
                        Seller
                      </th>
                      <th className="px-6 py-4 font-semibold text-white">
                        Product Info
                      </th>
                      <th className="px-6 py-4 font-semibold text-white">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 font-semibold text-white">
                        Status
                      </th>
                      <th className="px-6 py-4 font-semibold text-white text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {batches.map((b) => {
                      const isActive = selectedBatch?.id === b.id;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBatch(b)}
                          className={`${isActive ? "bg-primary/5" : "hover:bg-border-dark/30"} transition-colors cursor-pointer group`}
                        >
                          <td
                            className={`px-6 py-4 font-medium ${isActive ? "text-primary" : "text-white group-hover:text-primary"} transition-colors`}
                          >
                            {b.id}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {b.order}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {b.initials}
                              </div>
                              {b.seller}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {b.product}
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                            {b.time}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? "bg-yellow-900/30 text-yellow-500" : "bg-slate-800 text-slate-400"}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-yellow-500" : "bg-slate-500"}`}
                              ></span>
                              {isActive ? "Reviewing" : b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              className={`${isActive ? "text-primary font-bold" : "text-slate-400 group-hover:text-primary"} font-medium text-sm transition-colors flex items-center gap-1 ml-auto`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isActive ? "visibility" : "preview"}
                              </span>
                              {isActive ? "Active" : "Review"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border-dark px-6 py-3 bg-surface-darker">
                <p className="text-xs text-slate-400">
                  Showing 1-5 of 24 pending items
                </p>
                <div className="flex gap-2">
                  <button className="p-1 rounded hover:bg-border-dark text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>
                  <button className="p-1 rounded hover:bg-border-dark text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Panel — dynamically updates */}
          <div className="xl:col-span-1 flex flex-col gap-6 sticky top-24">
            {selectedBatch ? (
              <>
                <div className="rounded-xl border border-primary/30 bg-surface-dark shadow-lg ring-1 ring-primary/20 overflow-hidden">
                  <div className="h-1 w-full bg-border-dark">
                    <div className="h-full bg-primary w-2/3 relative">
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Batch {selectedBatch.id}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {selectedBatch.seller}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-700/10">
                        QC Stage 2
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-background-dark border border-border-dark">
                        <p className="text-xs text-slate-400 mb-1">
                          Product Type
                        </p>
                        <p className="font-medium text-white">
                          {selectedBatch.product}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background-dark border border-border-dark">
                        <p className="text-xs text-slate-400 mb-1">Quantity</p>
                        <p className="font-medium text-white">
                          {selectedBatch.qty}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background-dark border border-border-dark col-span-2">
                        <p className="text-xs text-slate-400 mb-1">
                          Origin Hash
                        </p>
                        <p className="font-mono text-xs text-slate-300 truncate">
                          {selectedBatch.hash}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md bg-yellow-900/20 p-4 border border-yellow-900/50">
                      <div className="flex">
                        <span className="material-symbols-outlined text-yellow-500 text-[20px] mr-3">
                          warning
                        </span>
                        <div>
                          <h3 className="text-sm font-medium text-yellow-500">
                            Irreversible Action
                          </h3>
                          <p className="mt-1 text-xs text-yellow-400/80">
                            Approval immediately triggers shipment eligibility
                            on the blockchain.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleRejectBatch}
                        disabled={
                          loading || processingBatchId === selectedBatch.id
                        }
                        className="flex items-center justify-center gap-2 rounded-lg border-2 border-red-500/30 bg-transparent py-3 text-sm font-bold text-red-400 hover:bg-red-900/20 hover:border-red-500 transition-all disabled:opacity-50"
                      >
                        {processingBatchId === selectedBatch.id ? (
                          <span className="material-symbols-outlined text-[20px] animate-spin">
                            cached
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">
                            thumb_down
                          </span>
                        )}
                        {processingBatchId === selectedBatch.id
                          ? "Processing..."
                          : "Reject"}
                      </button>
                      <button
                        onClick={handleApproveBatch}
                        disabled={
                          loading || processingBatchId === selectedBatch.id
                        }
                        className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-background-dark shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {processingBatchId === selectedBatch.id ? (
                          <span className="material-symbols-outlined text-[20px] animate-spin">
                            cached
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">
                            verified
                          </span>
                        )}
                        {processingBatchId === selectedBatch.id
                          ? "Processing..."
                          : "Approve Batch"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface-darker px-6 py-3 border-t border-border-dark flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Smart Contract: <span className="font-mono">v2.4.1</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
                      Network Active
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-dark p-4 border border-border-dark">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    Quality Standards Reference
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Moisture content must be < 12%",
                      "Zero insect damage tolerance",
                      "Packaging integrity > 98%",
                    ].map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">
                          check_circle
                        </span>{" "}
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border-dark bg-surface-dark p-8 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-5xl text-text-secondary mb-4">
                  touch_app
                </span>
                <p className="text-white font-medium">Select a batch</p>
                <p className="text-text-secondary text-sm">
                  Click a row in the table to review its details.
                </p>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
