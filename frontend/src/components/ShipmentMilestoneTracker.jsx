import { useEffect, useState } from "react";
import { auditApi } from "../api";
import { formatShipID } from "../utils/entityIds";

const MILESTONES = [
  { key: "SHIPMENT_REQUESTED", label: "Shipment Requested", icon: "local_shipping" },
  { key: "EXPORT_DOC_UPLOADED", label: "Export Docs Uploaded", icon: "description" },
  { key: "EXPORT_CLEARED", label: "Export Cleared", icon: "flight_takeoff" },
  { key: "IMPORT_CLEARED", label: "Import Cleared", icon: "flight_land" },
];

export default function ShipmentMilestoneTracker({ shipId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shipId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await auditApi.getShipmentTimeline(String(shipId));
        if (!res.success) throw new Error(res.error || "Failed to load shipment timeline");
        setTimeline(res.timeline || []);
      } catch (err) {
        setTimeline([]);
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [shipId]);

  if (!shipId) return null;

  const findEvent = (key) => timeline.find((e) => e.eventType === key);

  return (
    <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-bold text-sm">
          Shipment Milestones — {formatShipID(shipId)}
        </p>
        {loading && (
          <span className="text-xs text-text-secondary">Loading chain timestamps...</span>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="space-y-3">
        {MILESTONES.map((m) => {
          const evt = findEvent(m.key);
          const done = Boolean(evt);
          return (
            <div
              key={m.key}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                done ? "border-primary/30 bg-primary/5" : "border-border-dark bg-background-dark/40"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-primary/20 text-primary" : "bg-border-dark text-text-secondary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {done
                    ? new Date(evt.timestamp * 1000).toLocaleString()
                    : "Pending on-chain event"}
                </p>
                {done && (
                  <p className="text-[10px] font-mono text-blue-400 mt-1 truncate" title={evt.txHash}>
                    TX: {evt.txHash}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
