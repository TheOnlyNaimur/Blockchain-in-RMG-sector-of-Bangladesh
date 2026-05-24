import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auditApi } from "../api";

export default function StakeholderPortal() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      const res = await auditApi.unifiedLookup(query);
      if (!res.success) throw new Error(res.error || "Not found");
      setParsed(res.parsed || null);
      setRecords(res.records || []);
    } catch (err) {
      setParsed(null);
      setRecords([]);
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background-dark">
      <header className="flex items-center justify-between border-b border-border-dark px-4 lg:px-8 py-3 bg-background-dark sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <h2 className="text-white text-lg font-bold">
              TradeChain <span className="font-light">| Stakeholder Portal</span>
            </h2>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/audit"
            className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-semibold transition-colors"
          >
            Audit Log
          </Link>
          <Link
            to="/ledger"
            className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-semibold transition-colors"
          >
            Mongo Ledger
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Shared Activity Records</h1>
          <p className="text-slate-400 text-sm mt-1">
            Search by POID, BatchID, ShipID, CertID, DocID, or TXID.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-surface-dark border border-border-dark rounded-xl p-6">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Search ID
          </label>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="PO-000001, SHIP-000001, CERT-*, DOC-*, or tx hash"
              className="flex-1 bg-background-dark border border-border-dark text-white rounded-lg px-4 py-3 font-mono"
            />
            <button
              type="submit"
              disabled={loading || !query}
              className="px-6 py-3 rounded-lg bg-primary text-background-dark font-bold disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </form>

        {parsed && (
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
            <p className="text-xs text-text-secondary mb-2">Parsed</p>
            <pre className="text-xs text-slate-200 font-mono break-all whitespace-pre-wrap">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border-dark">
            <h2 className="text-white font-black tracking-tight">Matching Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-border-dark/50 border-b border-border-dark text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">POID</th>
                  <th className="px-6 py-4 font-medium">BatchID</th>
                  <th className="px-6 py-4 font-medium">ShipID</th>
                  <th className="px-6 py-4 font-medium">CertID</th>
                  <th className="px-6 py-4 font-medium">DocID</th>
                  <th className="px-6 py-4 font-medium">TXID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-text-secondary">
                      No records.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id || r.id} className="hover:bg-border-dark/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{r.recordType}</td>
                      <td className="px-6 py-4 font-mono text-xs">{r.rawData?.poid || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{r.rawData?.batchDisplayId || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{r.rawData?.shipDisplayId || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{r.rawData?.certId || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{r.rawData?.docId || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs break-all">{r.txHash}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

