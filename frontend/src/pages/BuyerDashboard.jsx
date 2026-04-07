import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import RoleGuard from "../components/RoleGuard";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import Toast from "../components/ui/Toast";
import { useUser } from "../contexts/UserContext";
import { useWallet } from "../hooks/useWallet";
import { useAccount } from "wagmi";
import { useOrderPayment, useOrdersFetching, useOrderAcceptance } from "../hooks";
import { buyersApi } from "../api";
import { ethers } from "ethers";
import { CONTRACT_CONFIG } from "../config/contracts";
import { generateOrderPDF } from "../utils/pdfGenerator";

export default function BuyerDashboard() {
  const { userProfile } = useUser();
  const { isConnected, createSignedPayload } = useWallet();
  const {
    execute: payOrder,
    loading: payingOrder,
  } = useOrderPayment();
  const { execute: acceptOrderApi } = useOrderAcceptance();
  const { data: allOrders = [], refetch: refetchOrders } = useOrdersFetching();

  const [orders, setOrders] = useState([]);
  const [amountToEscrow, setAmountToEscrow] = useState("");
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [sellerStatusMap, setSellerStatusMap] = useState({});
  const [activeTab, setActiveTab] = useState("orders");
  const [searchSellerAddress, setSearchSellerAddress] = useState("");
  const [searchedSellerStatus, setSearchedSellerStatus] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState(false);
  const [pyusdBalance, setPyusdBalance] = useState("0");
  const [pyusdAllowance, setPyusdAllowance] = useState("0");

  const { address: walletAddress } = useAccount();

  useEffect(() => {
    const addr = userProfile?.address || walletAddress;
    if (addr && allOrders.length > 0) {
      setOrders(allOrders.filter(o => o.buyer.toLowerCase() === addr.toLowerCase()));
    } else if (allOrders.length > 0) {
      // If no address can be determined, show all orders so the dashboard isn't blank
      setOrders(allOrders);
    }
  }, [allOrders, userProfile, walletAddress]);

  useEffect(() => {
    const fetchSellerStatuses = async () => {
      const sellerAddresses = Array.from(
        new Set((orders || []).map((o) => o.seller).filter(Boolean)),
      );

      if (sellerAddresses.length === 0) {
        setSellerStatusMap({});
        return;
      }

      const entries = await Promise.all(
        sellerAddresses.map(async (address) => {
          try {
            const status = await buyersApi
              .getSellerStatus(address)
              .then((res) => res.data || res);
            return [address, status];
          } catch {
            return [address, null];
          }
        }),
      );

      setSellerStatusMap(Object.fromEntries(entries));
    };

    fetchSellerStatuses();
  }, [orders]);

  const getApprovalBadge = (approvalStatus) => {
    if (approvalStatus === "approved") return { label: "Approved", color: "text-green-400 bg-green-500/10" };
    if (approvalStatus === "pending") return { label: "Pending", color: "text-yellow-400 bg-yellow-500/10" };
    if (approvalStatus === "rejected") return { label: "Rejected", color: "text-red-400 bg-red-500/10" };
    return { label: "Not Registered", color: "text-slate-400 bg-slate-500/10" };
  };

  const handleSearchSellerStatus = async () => {
    const address = searchSellerAddress.trim();
    if (!ethers.isAddress(address)) {
      setSearchedSellerStatus(null);
      setToast({
        message: "Enter a valid seller wallet address.",
        type: "error",
        icon: "error",
      });
      return;
    }

    setSearchLoading(true);
    setSearchedSellerStatus(null);
    try {
      const status = await buyersApi
        .getSellerStatus(address)
        .then((res) => res.data || res);
      setSearchedSellerStatus(status);
    } catch (err) {
      setToast({
        message: err?.message || "Failed to fetch seller status.",
        type: "error",
        icon: "error",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleReview = (order) => {
    setSelectedOrder(order);
    setShowReviewModal(true);
  };
  const handleAccept = async (order) => {
    setSelectedOrder(order);
    setAmountToEscrow(order.amount ? order.amount.replace(/[^0-9.]/g, "") : "");
    setShowAcceptModal(true);

    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        const usdtContract = new ethers.Contract(
          CONTRACT_CONFIG.usdt,
          [
            "function balanceOf(address account) public view returns (uint256)",
            "function allowance(address owner, address spender) public view returns (uint256)"
          ],
          signer
        );
        const bal = await usdtContract.balanceOf(signerAddress);
        const allow = await usdtContract.allowance(signerAddress, CONTRACT_CONFIG.address);
        setPyusdBalance(ethers.formatUnits(bal, 6));
        setPyusdAllowance(ethers.formatUnits(allow, 6));
      } catch (err) {
        console.error("Failed to fetch PYUSD data:", err);
      }
    }
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder || !isConnected) return;
    setAcceptingOrder(true);
    try {
      if (!window.ethereum) throw new Error("No ethereum provider found. Install MetaMask!");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      const usdtContract = new ethers.Contract(
        CONTRACT_CONFIG.usdt,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function balanceOf(address account) public view returns (uint256)",
        ],
        signer
      );

      const amountWei = ethers.parseUnits(amountToEscrow.toString(), 6);

      const currentBalance = await usdtContract.balanceOf(signerAddress);
      if (currentBalance < amountWei) {
        throw new Error("Insufficient PYUSD balance for escrow.");
      }

      setToast({ message: "Approving PYUSD transfer in MetaMask...", type: "info", icon: "hourglass_empty" });
      const tx = await usdtContract.approve(CONTRACT_CONFIG.address, amountWei);
      setToast({ message: "Waiting for PYUSD approval transaction to mine...", type: "info", icon: "hourglass_empty" });
      await tx.wait();

      setToast({ message: "Approval successful! Submitting order acceptance...", type: "info", icon: "hourglass_empty" });

      const numericalOrderId = selectedOrder.orderId;
      
      const result = await acceptOrderApi({
        orderId: numericalOrderId,
        data: {
          orderId: numericalOrderId,
          amount: amountWei.toString(),
        },
      });

      // Update order status in UI
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: "Accepted", statusColor: "green" }
            : o,
        ),
      );
      setShowAcceptModal(false);
      refetchOrders();
      setToast({
        message: `Order accepted! Tx: ${result.txHash?.slice(0, 10)}...`,
        type: "success",
        icon: "check_circle",
      });
    } catch (err) {
      setToast({
        message: `Failed to accept order: ${err?.shortMessage || err?.reason || err?.message || "Unknown error"}`,
        type: "error",
        icon: "error",
      });
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handlePayOrder = async () => {
    if (!selectedOrder || !isConnected) return;
    try {
      // Call the hook with payment data
      const numericalOrderId = selectedOrder.orderId;
      const rawAmount = selectedOrder.amount.replace(/[$,]/g, "");
      const amountWei = ethers.parseUnits(rawAmount, 6).toString();
      const result = await payOrder({
        orderId: numericalOrderId,
        data: {
          sellerAddress: selectedOrder.seller || "0x" + "0".repeat(40),
          amount: amountWei,
        },
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: "Paid", statusColor: "blue" }
            : o,
        ),
      );
      setShowReviewModal(false);
      setToast({
        message: `Payment sent! Tx: ${result.txHash?.slice(0, 10)}...`,
        type: "success",
        icon: "check_circle",
      });
    } catch (err) {
      setToast({
        message: `Failed to send payment: ${err.message || "Unknown error"}`,
        type: "error",
        icon: "error",
      });
    }
  };

  const handleConfirmDelivery = async (order) => {
    if (!isConnected) return;
    try {
      setToast({ message: "Confirming delivery on-chain...", type: "info", icon: "hourglass_empty" });

      const numericalOrderId = order.orderId;
      const shipId = order.shipId || "1";

      const payloadData = { action: "confirm", orderId: numericalOrderId };
      const { signature, userAddress } = await createSignedPayload(payloadData);

      const response = await fetch(`http://localhost:3000/api/orders/${numericalOrderId}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: payloadData,
          signature,
          userAddress,
          shipId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm delivery");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "Delivered & Paid", statusColor: "green" }
            : o,
        ),
      );

      setToast({
        message: `Delivery confirmed. Escrow released! Tx: ${data.txHash?.slice(0, 10)}...`,
        type: "success",
        icon: "check_circle",
      });
    } catch (err) {
      setToast({
        message: err.message,
        type: "error",
        icon: "error",
      });
    }
  };

  const handleReviewSubmit = async () => {
    if (selectedOrder?.statusColor === "blue") {
      await handlePayOrder();
    }
  };

  if (!isConnected) {
    return (
      <RoleGuard requiredRoles={["buyer"]}>
        <AppLayout title="Buyer Dashboard">
          <div className="text-center py-12 px-6 bg-surface-dark border border-border-dark rounded-xl">
            <p className="text-text-secondary mb-4">
              Please connect your wallet to manage orders
            </p>
          </div>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRoles={["buyer"]}>
      <AppLayout title="Buyer Dashboard">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            icon={toast.icon}
            onClose={() => setToast(null)}
          />
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-white text-3xl font-black tracking-tight mb-2">
              Orders Received
            </h1>
            <p className="text-text-secondary max-w-2xl">
              Manage incoming trade offers and initiate smart contract escrow
              payments.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-border-dark hover:bg-border-dark/80 text-white rounded-lg text-sm font-bold transition-colors border border-border-dark">
              <span className="material-symbols-outlined text-[18px]">
                filter_list
              </span>
              Filter
            </button>
            <button
              onClick={() => setShowCreateRequest(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-background-dark rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Request
            </button>
          </div>
        </div>

        <div className="mb-6 border-b border-border-dark">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === "orders"
                  ? "text-white border-b-2 border-primary"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab("seller-status")}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === "seller-status"
                  ? "text-white border-b-2 border-primary"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              Seller Status Check
            </button>
          </div>
        </div>

        {activeTab === "seller-status" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border-dark bg-surface-dark p-5">
              <h2 className="text-white text-lg font-bold mb-2">Search Seller Status</h2>
              <p className="text-text-secondary text-sm mb-4">
                Search by seller wallet address to view approval status and certificate confirmation summary.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  value={searchSellerAddress}
                  onChange={(e) => setSearchSellerAddress(e.target.value)}
                  placeholder="0x... seller address"
                  className="flex-1 bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary px-4 py-2.5"
                />
                <button
                  onClick={handleSearchSellerStatus}
                  disabled={searchLoading}
                  className="px-4 py-2.5 bg-primary text-background-dark rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {searchedSellerStatus && (
              <div className="rounded-xl border border-border-dark bg-surface-dark p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                  <div>
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Seller Address</p>
                    <p className="text-white font-mono text-sm break-all">{searchedSellerStatus.sellerAddress}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold w-fit ${
                      getApprovalBadge(searchedSellerStatus.approvalStatus).color
                    }`}
                  >
                    {getApprovalBadge(searchedSellerStatus.approvalStatus).label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border-dark bg-background-dark">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Certifier Confirmation</p>
                    <p className={`text-sm font-semibold ${searchedSellerStatus.certifierCertificateIssued ? "text-green-400" : "text-yellow-400"}`}>
                      {searchedSellerStatus.certifierCertificateIssued ? "Issued" : "Pending"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border-dark bg-background-dark">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Certificate Summary</p>
                    <p className="text-white text-sm font-semibold">
                      {searchedSellerStatus.certificateIssuanceSummary.issuedCount}/
                      {searchedSellerStatus.certificateIssuanceSummary.requiredCount} issued
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border-dark bg-background-dark">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Compliance Confirmation</p>
                    <p className={`text-sm font-semibold ${searchedSellerStatus.compliance.isFullyCompliant ? "text-green-400" : "text-yellow-400"}`}>
                      {searchedSellerStatus.compliance.isFullyCompliant ? "Fully Compliant" : "Not Fully Compliant"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-lg border border-border-dark bg-background-dark">
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-3">Compliance Certificate Types</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchedSellerStatus.compliance.items.map((item) => (
                      <div key={item.type} className="flex items-center justify-between text-sm border border-border-dark rounded px-3 py-2">
                        <span className="text-white">{item.type}</span>
                        <span className={item.issued ? "text-green-400 font-semibold" : "text-yellow-400 font-semibold"}>
                          {item.issued ? "Issued" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <>
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Orders"
            value={(orders || []).length.toString()}
            change="Active"
            icon="receipt_long"
          />
          <StatCard
            label="Pending Action"
            value={(orders || []).filter(o => o.status === "Created" || o.status === "Import Cleared").length.toString()}
            change="Action Req."
            icon="pending_actions"
            changeColor="text-orange-500"
          />
          <StatCard
            label="In Progress"
            value={(orders || []).filter(o => ["Accepted", "Batch Created", "QC Approved", "Shipment Requested", "Export Cleared"].includes(o.status)).length.toString()}
            change="Processing"
            icon="local_shipping"
          />
          <StatCard
            label="Completed"
            value={(orders || []).filter(o => o.status === "Delivered & Paid").length.toString()}
            change="Fund Released"
            icon="check_circle"
          />
        </div>

        {/* Orders Table */}
        <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-border-dark/50 border-b border-border-dark">
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                    Escrow Required
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`group hover:bg-border-dark/30 transition-colors ${(order.status === "Created" || order.status === "Import Cleared") ? "bg-border-dark/10" : ""}`}
                  >
                    <td className="px-6 py-4 relative">
                      {(order.status === "Created" || order.status === "Import Cleared") && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === "Import Cleared" ? "bg-purple-500" : "bg-primary"}`}></div>
                      )}
                      <span className="text-white font-mono font-medium text-sm">
                        {order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white`}
                        >
                          {order.seller.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-white text-sm font-medium block truncate max-w-[240px]">
                            {order.seller}
                          </span>
                          {sellerStatusMap[order.seller] ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getApprovalBadge(sellerStatusMap[order.seller].approvalStatus).color}`}
                              >
                                {getApprovalBadge(sellerStatusMap[order.seller].approvalStatus).label}
                              </span>
                              <span className="text-[10px] text-text-secondary">
                                Certificates: {sellerStatusMap[order.seller].certificateIssuanceSummary.issuedCount}/
                                {sellerStatusMap[order.seller].certificateIssuanceSummary.requiredCount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-secondary mt-1 block">
                              Seller status unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-sm">
                      {order.details}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={order.status}
                        color={order.statusColor}
                        pulse={order.statusColor === "yellow"}
                        icon={
                          order.statusColor === "purple"
                            ? "local_shipping"
                            : null
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-mono font-bold">
                        {order.amount}
                      </span>
                      <span className="text-xs text-text-secondary block">
                        PYUSD
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => generateOrderPDF(order)}
                          className="bg-surface-darker hover:bg-border-dark text-text-secondary hover:text-white p-1.5 rounded-lg transition-colors border border-border-dark"
                          title="Download Order Report"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            download
                          </span>
                        </button>
                        {order.status === "Created" ? (
                          <button
                            onClick={() => handleAccept(order)}
                            disabled={acceptingOrder || payingOrder}
                            className="bg-primary text-background-dark px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
                          >
                            {acceptingOrder ? "Accepting..." : "Accept & Escrow"}
                          </button>
                        ) : order.status === "Import Cleared" ? (
                          <button
                            onClick={() => handleConfirmDelivery(order)}
                            className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-[#10b981]/20 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              check_circle
                            </span>{" "}
                            Confirm & Release Fund
                          </button>
                        ) : order.status === "Delivered & Paid" ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">
                              verified
                            </span>
                            Completed
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs italic ${order.status === "QC Failed" ? "text-red-400" : "text-text-secondary"}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {order.status === "Accepted" ? "inventory_2"
                                : order.status === "Batch Created" ? "science"
                                : order.status === "QC Approved" ? "local_shipping"
                                : order.status === "QC Failed" ? "cancel"
                                : order.status === "Shipment Requested" ? "flight_takeoff"
                                : order.status === "Export Cleared" ? "flight_land"
                                : "hourglass_top"}
                            </span>
                            {order.status === "Accepted"
                              ? "Seller Creating Batch"
                              : order.status === "Batch Created"
                                ? "Awaiting QC Inspection"
                                : order.status === "QC Approved"
                                  ? "Awaiting Shipment Request"
                                  : order.status === "QC Failed"
                                    ? "QC Failed — Seller Must Resolve"
                                    : order.status === "Shipment Requested"
                                      ? "In Transit — Export Pending"
                                      : order.status === "Export Cleared"
                                        ? "Exported — Awaiting Import Clearance"
                                        : "Awaiting Next Step"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-border-dark flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Showing 1-3 of 142 orders
            </span>
            <div className="flex gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-border-dark text-text-secondary hover:text-white">
                <span className="material-symbols-outlined text-sm">
                  chevron_left
                </span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-border-dark text-text-secondary hover:text-white">
                <span className="material-symbols-outlined text-sm">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
          </>
        )}

        {/* ── REVIEW ORDER MODAL ── */}
        {showReviewModal && selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <div
              className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      visibility
                    </span>
                    Order Review — {selectedOrder.id}
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Review order details and seller information before taking
                    action.
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Order Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Order ID
                    </p>
                    <p className="text-white font-mono font-bold">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <StatusBadge
                      label={selectedOrder.status}
                      color={selectedOrder.statusColor}
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Seller
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white`}
                      >
                        {selectedOrder.seller.slice(2, 4).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">
                        {selectedOrder.seller}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                      Escrow Required
                    </p>
                    <p className="text-white font-mono font-bold">
                      {selectedOrder.amount}{" "}
                      <span className="text-text-secondary text-xs">PYUSD</span>
                    </p>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      inventory_2
                    </span>{" "}
                    Product Details
                  </h4>
                  <div className="bg-background-dark border border-border-dark rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Items</span>
                      <span className="text-white">
                        {selectedOrder.details}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Quality Grade</span>
                      <span className="text-white">
                        Grade A — Premium Export
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        Delivery Terms
                      </span>
                      <span className="text-white">FOB Shenzhen</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        Expected Delivery
                      </span>
                      <span className="text-white">Nov 15, 2023</span>
                    </div>
                  </div>
                </div>

                {/* Seller Credentials */}
                <div>
                  <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      verified_user
                    </span>{" "}
                    Seller Credentials
                  </h4>
                  <div className="bg-background-dark border border-border-dark rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Certification</span>
                      <span className="inline-flex items-center gap-1 text-primary text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>{" "}
                        Verified
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Cert Hash</span>
                      <span className="text-primary font-mono text-xs">
                        0x7f83...d906
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        Previous Orders
                      </span>
                      <span className="text-white">
                        34 completed (98% success)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Avg. Delivery</span>
                      <span className="text-white">On-time (12 days avg.)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center shrink-0">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Close
                </button>
                <div className="flex gap-3">
                  <button className="px-4 py-2.5 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      close
                    </span>{" "}
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      handleAccept(selectedOrder);
                    }}
                    className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>{" "}
                    Accept & Escrow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACCEPT ORDER / ESCROW MODAL ── */}
        {showAcceptModal && selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowAcceptModal(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAcceptModal(false)}
                className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="p-6 border-b border-border-dark bg-border-dark/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">
                    verified_user
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Accept Order {selectedOrder.id}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm">
                  Lock funds in escrow to proceed with this shipment.
                </p>
              </div>

              {/* Stepper */}
              <div className="px-6 pt-6 pb-2">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border-dark -z-10"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-primary -z-10"></div>
                  <div className="flex flex-col items-center gap-2 bg-surface-dark px-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-background-dark font-bold text-sm">
                      <span className="material-symbols-outlined text-sm">
                        check
                      </span>
                    </div>
                    <span className="text-xs font-medium text-white">
                      Review
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 bg-surface-dark px-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-background-dark font-bold text-sm shadow-[0_0_15px_rgba(19,236,91,0.4)]">
                      2
                    </div>
                    <span className="text-xs font-bold text-primary">
                      Allowance
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 bg-surface-dark px-2">
                    <div className="w-8 h-8 rounded-full bg-border-dark border-2 border-border-dark flex items-center justify-center text-text-secondary font-bold text-sm">
                      3
                    </div>
                    <span className="text-xs font-medium text-text-secondary">
                      Confirm
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="p-4 rounded-xl bg-border-dark/30 border border-border-dark flex justify-between items-center">
                  <div>
                    <p className="text-text-secondary text-xs uppercase tracking-wider font-bold">
                      Total Required
                    </p>
                    <p className="text-white text-xl font-mono font-bold mt-1">
                      {selectedOrder.amount.replace("$", "")} PYUSD
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs uppercase tracking-wider font-bold">
                      Your Balance
                    </p>
                    <p className="text-white text-sm font-mono mt-1">
                      {pyusdBalance} PYUSD
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-white">
                      Token Allowance
                    </label>
                    {Number(pyusdAllowance) < Number(amountToEscrow || 0) && (
                      <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          warning
                        </span>
                        Insufficient Allowance
                      </span>
                    )}
                  </div>
                  <div className="flex w-full items-center rounded-lg bg-background-dark border border-border-dark h-12 px-4">
                    <input
                      className="bg-transparent border-none text-white focus:ring-0 text-lg font-mono w-full p-0"
                      type="number"
                      value={amountToEscrow}
                      onChange={(e) => setAmountToEscrow(e.target.value)}
                      placeholder="Amount to Escrow"
                    />
                    <span className="text-text-secondary font-bold ml-2">
                      PYUSD
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Current Allowance:{" "}
                    <span className="font-mono text-white">{pyusdAllowance} PYUSD</span>
                  </p>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1 py-3 px-4 rounded-lg bg-border-dark text-white font-bold hover:bg-border-dark/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAcceptOrder}
                    disabled={acceptingOrder || !amountToEscrow}
                    className="flex-[2] py-3 px-4 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {acceptingOrder ? "Approving..." : "Approve PYUSD"}
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[18px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
                <p className="text-center text-xs text-text-secondary">
                  By approving, you grant the Escrow Smart Contract permission
                  to move the specified amount of PYUSD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE REQUEST MODAL ── */}
        {showCreateRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowCreateRequest(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      add_shopping_cart
                    </span>
                    Create Purchase Request
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Submit a new purchase request to a verified seller.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateRequest(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Seller Wallet Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      <span className="material-symbols-outlined text-[18px]">
                        wallet
                      </span>
                    </span>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 pl-10 font-mono placeholder-[#5c7263]"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Product / Service Description
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                    placeholder="Describe the products or services you want to purchase..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Quantity
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="e.g. 5000"
                      type="number"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Unit Price (PYUSD)
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="0.00"
                      type="number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Delivery Terms
                    </label>
                    <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                      <option>FOB (Free on Board)</option>
                      <option>CIF (Cost, Insurance & Freight)</option>
                      <option>DDP (Delivered Duty Paid)</option>
                      <option>EXW (Ex Works)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Delivery Deadline
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 [color-scheme:dark]"
                      type="date"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Quality Requirements
                  </label>
                  <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                    <option>Grade A — Premium Export Quality</option>
                    <option>Grade B — Standard Commercial</option>
                    <option>Grade C — Economy</option>
                    <option>Custom — Specify in description</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Additional Notes
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                    placeholder="Special requirements, packaging, certifications needed..."
                    rows="2"
                  ></textarea>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    info
                  </span>
                  <p className="text-xs text-text-secondary">
                    Your request will be sent to the seller for review. Once
                    confirmed, you will be asked to escrow PYUSD into the smart
                    contract.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowCreateRequest(false)}
                  className="px-5 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
