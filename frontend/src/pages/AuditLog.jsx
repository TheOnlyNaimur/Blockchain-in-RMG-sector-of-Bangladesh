import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auditApi } from "../api";

export default function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [eventType, setEventType] = useState("");

  const LIMIT = 25;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await auditApi.getTrail(page, LIMIT, eventType || undefined);
        if (res.success) {
          setEvents(res.events || []);
          setTotal(res.total || 0);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [page, eventType]);

  const chainId = import.meta.env.VITE_CHAIN_ID;
  const explorerUrl = chainId === "11155111" ? "https://sepolia.etherscan.io/tx/" : "#";

  const truncate = (str, len = 10) => {
    if (!str) return "";
    return str.length > len * 2 ? `${str.slice(0, len)}...${str.slice(-len)}` : str;
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="flex flex-col min-h-screen w-full bg-background-dark">
      <header className="flex items-center justify-between border-b border-border-dark px-4 lg:px-8 py-3 bg-background-dark sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h2 className="text-white text-lg font-bold">
              TradeChain <span className="font-light">| Audit Log</span>
            </h2>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/ledger"
            className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-semibold transition-colors"
          >
            Mongo Ledger
          </Link>
          <Link
            to="/traceability"
            className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-semibold transition-colors"
          >
            Traceability
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">On-chain Audit Trail</h1>
            <p className="text-slate-400 text-sm mt-1">
              Derived from smart contract TraceEvent logs (block timestamps).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Filter eventType</label>
            <input
              value={eventType}
              onChange={(e) => {
                setPage(1);
                setEventType(e.target.value);
              }}
              placeholder="e.g. ORDER_CREATED"
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 font-mono w-56"
            />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Block Time</th>
                  <th className="px-6 py-4 font-medium">Event Type</th>
                  <th className="px-6 py-4 font-medium">POID</th>
                  <th className="px-6 py-4 font-medium">Actor</th>
                  <th className="px-6 py-4 font-medium">TXID</th>
                  <th className="px-6 py-4 font-medium">Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      Loading audit trail...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  events.map((e, idx) => (
                    <tr key={`${e.txHash}-${idx}`} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(e.timestamp * 1000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">{e.eventType}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                        {e.orderId ? `PO-${String(e.orderId).padStart(6, "0")}` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {truncate(e.actor, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                        {explorerUrl !== "#" ? (
                          <a
                            href={`${explorerUrl}${e.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {truncate(e.txHash, 10)}
                          </a>
                        ) : (
                          <span className="text-slate-400">{truncate(e.txHash, 10)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        #{e.blockNumber}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Page <span className="font-medium text-slate-200">{page}</span> of{" "}
              <span className="font-medium text-slate-200">{totalPages}</span>
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Newer
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Older
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

