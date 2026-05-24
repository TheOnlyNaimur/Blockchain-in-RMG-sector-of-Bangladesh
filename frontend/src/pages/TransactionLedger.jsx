import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatPOID, formatBatchID, formatShipID } from "../utils/entityIds";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function TransactionLedger() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    fetchRecords(page);
  }, [page]);

  const fetchRecords = async (pageNumber) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/records?page=${pageNumber}&limit=${LIMIT}`);
      const json = await res.json();
      
      if (json.success) {
        // Here we could directly read from the Ethereum RPC using ethers.js to prove the existence,
        // but the backend stores the true `txHash` and `dataHash` embedded on the blockchain already.
        // We will fetch these true immutable hashes from the API, and offer direct deep-links 
        // to Sepolia/Anvil blockchain explorers for total public transparency.

        setRecords(json.data);
        setTotalPages(json.totalPages);
        setTotalRecords(json.total);
      }
    } catch (err) {
      console.error("Error fetching ledger records:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIds = (record) => {
    const rd = record.rawData || {};
    const ids = [];
    if (rd.poid || rd.orderId) ids.push(rd.poid || formatPOID(rd.orderId));
    if (rd.batchId) ids.push(rd.batchIdFormatted || formatBatchID(rd.batchId));
    if (rd.shipId) ids.push(rd.shipIdFormatted || formatShipID(rd.shipId));
    if (rd.certId) ids.push(rd.certId);
    if (rd.docId) ids.push(rd.docId);
    return ids.length ? ids.join(" · ") : "—";
  };

  const truncate = (str, len = 12) => {
    if (!str) return "";
    return str.length > len * 2 ? `${str.slice(0, len)}...${str.slice(-len)}` : str;
  };

  const getTypeColor = (type) => {
    const colors = {
      ORDER_CREATED: "bg-blue-500/10 text-blue-500",
      BATCH_CREATED: "bg-indigo-500/10 text-indigo-500",
      QC_APPROVED: "bg-emerald-500/10 text-emerald-500",
      COMPLIANCE_ISSUED: "bg-green-500/10 text-green-500",
      ESCROW_DEPOSITED: "bg-indigo-500/10 text-indigo-500",
      DOCS_UPLOADED: "bg-purple-500/10 text-purple-500",
      EXPORT_CLEARED: "bg-teal-500/10 text-teal-500",
      IMPORT_CLEARED: "bg-orange-500/10 text-orange-500",
      DELIVERY_CONFIRMED: "bg-primary/10 text-primary",
    };
    return colors[type] || "bg-slate-500/10 text-slate-400";
  };

  const chainId = import.meta.env.VITE_CHAIN_ID;
  const explorerUrl = chainId === "11155111" 
    ? "https://sepolia.etherscan.io/tx/" 
    : "#";

  return (
    <div className="flex flex-col min-h-screen w-full bg-background-dark">
      {/* Public Header - No Sidebar needed for full transparency view */}
      <header className="flex items-center justify-between border-b border-border-dark px-4 lg:px-8 py-3 bg-background-dark sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">token</span>
            </div>
            <h2 className="text-white text-lg font-bold">TradeChain <span className="font-light">| Public Ledger</span></h2>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-border-dark bg-surface-dark px-3 py-1.5 text-xs font-medium text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {chainId === "11155111" ? "Sepolia Testnet" : "Anvil Local"}
          </div>
          <Link to="/" className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-semibold transition-colors">
              Access DApp
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Live Blockchain Ledger</h2>
            <p className="text-slate-400 text-sm mt-1">
              Immutable, fully transparent public record of all smart contract interactions.
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex items-center space-x-3">
            <span className="material-symbols-outlined text-primary">dynamic_feed</span>
            <div>
              <p className="text-xs text-slate-400">Total Immutable Entries</p>
              <p className="text-lg font-bold text-slate-200">{totalRecords}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800 border border-slate-700 mx-auto rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Event Type</th>
                  <th className="px-6 py-4 font-medium">Entity IDs</th>
                  <th className="px-6 py-4 font-medium">Transaction Hash (EVM)</th>
                  <th className="px-6 py-4 font-medium">Block Height</th>
                  <th className="px-6 py-4 font-medium">Payload Integrity Hash</th>
                  <th className="px-6 py-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex justify-center mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                      Syncing real-time ledger...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No blockchain transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center space-x-2 text-slate-300">
                          <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                          <span>{new Date(record.createdAt).toLocaleString()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border border-current ${getTypeColor(record.recordType)}`}>
                          {record.recordType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {getEntityIds(record)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                        {explorerUrl !== "#" ? (
                           <a href={`${explorerUrl}${record.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center space-x-1">
                             <span>{truncate(record.txHash, 6)}</span>
                             <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                           </a>
                        ) : (
                          <span className="text-slate-400">{truncate(record.txHash, 6)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300">
                           #{record.blockNumber}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500 cursor-help" title={record.dataHash}>
                        {truncate(record.dataHash, 8)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <details className="relative group/details inline-block text-left cursor-pointer">
                           <summary className="list-none text-primary hover:text-primary-focus focus:outline-none">
                             <span className="material-symbols-outlined text-xl">data_object</span>
                           </summary>
                           <div className="absolute right-0 mt-2 w-80 max-h-96 z-50 origin-top-right overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 hidden group-open/details:block">
                             <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase break-words border-b border-slate-800 pb-2">Anchored Data Payload</h4>
                             <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono m-0 mb-4 break-all">
                               {JSON.stringify(record.rawData, null, 2)}
                             </pre>
                             <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase break-words border-b border-slate-800 pb-2">EVM Smart Contract Receipt</h4>
                             <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono m-0 break-all">
                               {JSON.stringify(record.contractFeedback, null, 2)}
                             </pre>
                           </div>
                         </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-900 px-6 py-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Showing relative bounds page <span className="font-medium text-slate-200">{page}</span> of <span className="font-medium text-slate-200">{totalPages}</span>
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Newer Proofs
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Older Proofs
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
