import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import Toast from "../components/ui/Toast";
import { useShipmentDetail } from "../hooks/useShipments";

export default function ShipmentTracking() {
  const { id } = useParams();
  const {
    data: shipmentData,
    loading: loadingShipment,
    error: shipmentError,
  } = useShipmentDetail(id);
  const [showContract, setShowContract] = useState(false);
  const [toast, setToast] = useState(null);
  const [displayData, setDisplayData] = useState({
    id: id || "Pending",
    from: "Origin Factory",
    to: "Final Destination",
    updateTime: "Fetching...",
  });
  const [timelineItems, setTimelineItems] = useState([]);

  const getEventMeta = (type) => {
    switch (type) {
      case "ORDER_CREATED": return { title: "Order Created", icon: "flag", status: "done" };
      case "BATCH_CREATED": return { title: "Production Batch", icon: "inventory_2", status: "done" };
      case "QC_APPROVED": return { title: "Quality Check", icon: "fact_check", status: "done" };
      case "COMPLIANCE_ISSUED": return { title: "Compliance Validated", icon: "verified_user", status: "done" };
      case "ESCROW_DEPOSITED": return { title: "Payment Locked", icon: "lock", status: "done" };
      case "DOCS_UPLOADED": return { title: "Docs Anchored", icon: "description", status: "done" };
      case "EXPORT_CLEARED": return { title: "Export Cleared", icon: "flight_takeoff", status: "done" };
      case "IMPORT_CLEARED": return { title: "Import Cleared", icon: "flight_land", status: "done" };
      case "DELIVERY_CONFIRMED": return { title: "Delivery Confirmed", icon: "check_circle", status: "done" };
      case "ESCROW_RELEASED": return { title: "Escrow Released", icon: "gavel", status: "done" };
      default: return { title: "Blockchain Event", icon: "link", status: "done" };
    }
  };

  useEffect(() => {
    // Update display data when shipment loads from API
    if (shipmentData) {
      setDisplayData({
        id: shipmentData.id || id || "Pending",
        from: shipmentData.currentLocation || "Origin Factory",
        to: shipmentData.destination || "Destination Port",
        updateTime: shipmentData.timestamp
          ? new Date(shipmentData.timestamp * 1000).toLocaleString()
          : "Just now",
      });
    }

    // Fetch dynamic timeline events
    const fetchTimeline = async () => {
      if (!id) return;
      try {
        const response = await fetch(`http://localhost:3000/api/records?limit=1000`);
        const payload = await response.json();
        if (payload.success) {
          const lowerSearch = id.toLowerCase();
          const filteredRecords = payload.data.filter(r => 
            JSON.stringify(r.rawData).toLowerCase().includes(lowerSearch) || 
            r.txHash.toLowerCase().includes(lowerSearch)
          ).reverse();

          const mappedEvents = filteredRecords.map((r) => {
            const meta = getEventMeta(r.recordType);
            return {
              date: new Date(r.createdAt).toLocaleString([], {month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit'}),
              title: meta.title,
              icon: meta.icon,
              person: `Signer: ${r.rawData.vendor || r.rawData.buyer || r.rawData.seller || r.rawData.issuedBy || r.rawData.uploadedBy || "Blockchain Agent"}`,
              desc: `Tx: ${r.txHash.slice(0, 10)}... | Block: ${r.blockNumber}`,
              status: meta.status,
              docs: r.rawData.docsHash ? ["IPFS Hash Anchored"] : null
            };
          });
          
          if (mappedEvents.length === 0) {
            mappedEvents.push({
               date: "Pending",
               title: "Awaiting Actions",
               icon: "hourglass_empty",
               person: "System",
               desc: "No events recorded for this shipment yet.",
               status: "pending"
            });
          } else {
            // Push active status tracker
            mappedEvents.push({
               date: "Active",
               title: "In Transit / Processing",
               icon: "sync",
               person: "System Tracker",
               desc: "Awaiting final confirmation blocks on chain.",
               status: "active"
            });
          }

          setTimelineItems(mappedEvents);
        }
      } catch (err) {
        console.error("Timeline fetch error", err);
      }
    };
    
    fetchTimeline();
  }, [shipmentData, id]);

  const handleExportPDF = () => {
    setToast({
      message: "Shipment report PDF generated successfully",
      icon: "picture_as_pdf",
      type: "success",
    });
  };

  return (
    <AppLayout title="Shipment Tracking">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-border-dark">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              International Freight
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <span className="material-symbols-outlined text-[14px]">
                schedule
              </span>{" "}
              Updated {loadingShipment ? "loading..." : displayData.updateTime}
            </span>
          </div>
          <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
            Shipment #{displayData.id}
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            Originating from{" "}
            <span className="text-slate-200 font-medium">
              {displayData.from}
            </span>{" "}
            to{" "}
            <span className="text-slate-200 font-medium">{displayData.to}</span>
            . Currently undergoing customs clearance processes.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowContract(true)}
            className="flex-1 md:flex-none flex items-center justify-center rounded-lg h-10 px-4 bg-border-dark text-white hover:bg-[#34463b] text-sm font-bold transition-colors"
          >
            <span className="material-symbols-outlined mr-2 text-[18px]">
              description
            </span>{" "}
            View Contract
          </button>
          <button
            onClick={handleExportPDF}
            className="flex-1 md:flex-none flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-background-dark hover:bg-primary/90 text-sm font-bold transition-colors"
          >
            <span className="material-symbols-outlined mr-2 text-[18px]">
              download
            </span>{" "}
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-surface-dark rounded-xl p-6 md:p-8 border border-border-dark shadow-sm">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                timeline
              </span>{" "}
              Shipment Progress
            </h3>

            {timelineItems.map((item, i) => (
              <div key={i} className="relative pl-8 py-2 group">
                <div
                  className="absolute left-0 top-0 bottom-0 w-px bg-border-dark ml-[7px]"
                  style={{
                    display: i === timelineItems.length - 1 ? "none" : "block",
                  }}
                ></div>
                {i < timelineItems.length - 1 && item.status === "done" && (
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-primary ml-[7px]"></div>
                )}
                <div
                  className={`absolute left-0 top-2 w-4 h-4 rounded-full border-4 ${
                    item.status === "done"
                      ? "bg-primary border-surface-dark"
                      : item.status === "active"
                        ? "bg-orange-500 border-surface-dark shadow-[0_0_0_4px_rgba(249,115,22,0.2)]"
                        : "bg-border-dark border-surface-dark"
                  }`}
                ></div>

                <div className="mb-1 ml-4">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold uppercase px-2 py-0.5 mb-2 rounded-full ${
                      item.status === "done"
                        ? "text-primary bg-primary/10"
                        : item.status === "active"
                          ? "text-orange-500 bg-orange-500/10 animate-pulse"
                          : "text-slate-400 bg-slate-800"
                    }`}
                  >
                    {item.date}
                  </span>
                  <div
                    className={`text-xl font-bold ${item.status === "pending" ? "text-slate-600" : "text-white"}`}
                  >
                    {item.title}
                  </div>
                </div>

                <div
                  className={`${item.status === "pending" ? "text-slate-600" : "text-slate-400"} text-sm pb-8 ml-4`}
                >
                  {item.person && (
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`material-symbols-outlined text-[16px] ${item.status === "active" ? "text-orange-500" : "text-primary"}`}
                      >
                        {item.icon}
                      </span>
                      <span className="font-medium text-slate-300">
                        {item.person}
                      </span>
                    </div>
                  )}
                  <p>{item.desc}</p>
                  {item.docs && (
                    <div className="flex gap-2 mt-3">
                      {item.docs.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-border-dark text-xs text-slate-300"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            description
                          </span>{" "}
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.status === "active" && (
                    <div className="mt-4 p-3 rounded bg-slate-800/50 border border-border-dark text-xs">
                      <p className="font-mono text-slate-400">
                        Current Block: #18293041... waiting for confirmations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-dark rounded-xl overflow-hidden border border-border-dark shadow-sm">
            <div className="h-48 bg-gradient-to-br from-surface-dark to-background-dark w-full relative flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-border-dark">
                public
              </span>
              <div className="absolute bottom-4 right-4 bg-background-dark/80 backdrop-blur text-white text-xs px-2 py-1 rounded">
                Live Location
              </div>
            </div>
            <div className="p-5">
              <h4 className="font-bold text-lg text-white mb-4">
                Route Details
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 flex-none w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20"></div>
                  <div>
                    <p className="text-xs text-slate-400">Origin</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {displayData.from}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 flex-none w-2 h-2 rounded-full bg-slate-600"></div>
                  <div>
                    <p className="text-xs text-slate-400">Destination</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {displayData.to}
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-surface-dark rounded-xl p-5 border border-border-dark shadow-sm">
            <h4 className="font-bold text-lg text-white mb-4 flex justify-between items-center">
              Smart Contract
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-primary/10 text-primary">
                Active
              </span>
            </h4>
            <div className="space-y-3">
              {[
                ["Value", shipmentData?.amount ? `${shipmentData.amount} USDT` : "Pending"],
                ["Escrowed", shipmentData?.escrowFunded ? "100%" : "Pending"],
                ["Status", shipmentData?.status || "Active"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-2 border-b border-border-dark/50"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-slate-200">
                    {value}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-1">Blockchain ID</p>
                <div className="flex items-center gap-2 bg-border-dark/50 rounded p-2">
                  <code className="text-xs text-primary truncate">
                    {displayData.id}
                  </code>
                  <button
                    onClick={() =>
                      setToast({
                        message: "Address copied to clipboard",
                        icon: "content_copy",
                        type: "info",
                      })
                    }
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      content_copy
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="border-t border-border-dark pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="font-medium text-slate-300">
            Live Network Connection
          </span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              account_balance_wallet
            </span>
            <span>
              Connected via RPC
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              deployed_code
            </span>
            <span>
              Network Synced
            </span>
          </div>
        </div>
      </div>

      {/* ── VIEW CONTRACT MODAL ── */}
      {showContract && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowContract(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    description
                  </span>
                  Smart Contract Details
                </h3>
                <p className="text-text-secondary text-sm mt-1">
                  TradeChain Escrow Contract v2.4.1
                </p>
              </div>
              <button
                onClick={() => setShowContract(false)}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-3">
                {[
                  [
                    "Contract Address",
                    "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
                  ],
                  ["Network", "Sepolia Testnet (Chain ID: 11155111)"],
                  ["Deployed", "Oct 15, 2023 at Block #18,245,901"],
                  ["Compiler", "Solidity v0.8.21"],
                  ["License", "MIT"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-start py-2.5 border-b border-border-dark/50"
                  >
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className="text-sm text-white font-mono text-right max-w-[60%] break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-white font-bold text-sm mb-3">
                  Contract State
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Escrow Balance", "45,200 USDC", "account_balance"],
                    ["Participants", "3 parties", "group"],
                    ["Status", "Active", "toggle_on"],
                    ["Penalty Rate", "2% / day", "schedule"],
                  ].map(([label, value, icon]) => (
                    <div
                      key={label}
                      className="p-3 rounded-lg bg-background-dark border border-border-dark"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          {icon}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {label}
                        </span>
                      </div>
                      <p className="text-white font-bold text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-bold text-sm mb-3">
                  ABI Preview
                </h4>
                <pre className="bg-background-dark p-4 rounded-lg border border-border-dark text-xs text-text-secondary font-mono overflow-x-auto">
                  {`{
  "createOrder(address,string)": "0x4a2c...",
  "acceptOrder(uint256)": "0x9b1f...",
  "createBatch(uint256,string)": "0x7d3e...",
  "approveBatch(uint256)": "0x2f8a...",
  "triggerPayment(uint256)": "0xe5c1...",
  "markCustomsCleared(uint256)": "0x8b4d..."
}`}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t border-border-dark bg-surface-darker flex gap-3 shrink-0">
              <button className="flex-1 px-4 py-2.5 bg-border-dark text-white rounded-lg text-sm font-medium hover:bg-[#34463b] transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>{" "}
                View on Etherscan
              </button>
              <button
                onClick={() => {
                  setShowContract(false);
                  setToast({
                    message: "ABI copied to clipboard",
                    icon: "content_copy",
                    type: "info",
                  });
                }}
                className="flex-1 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  content_copy
                </span>{" "}
                Copy ABI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </AppLayout>
  );
}
