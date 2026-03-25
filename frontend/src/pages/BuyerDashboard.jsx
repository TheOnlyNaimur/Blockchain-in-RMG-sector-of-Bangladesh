import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import RoleGuard from "../components/RoleGuard";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import Toast from "../components/ui/Toast";
import { useUser } from "../contexts/UserContext";
import { useWallet } from "../hooks/useWallet";
import { useOrderAcceptance, useOrderPayment } from "../hooks/useOrders";

const defaultOrders = [
  {
    id: "#ORD-23-001",
    seller: "Shenzhen Elec.",
    initials: "SE",
    details: "5000x Microchips",
    status: "Pending Approval",
    statusColor: "yellow",
    amount: "$50,000.00",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    id: "#ORD-23-002",
    seller: "Berlin Auto Parts",
    initials: "BA",
    details: "200x Brake Systems",
    status: "Awaiting Payment",
    statusColor: "blue",
    amount: "$12,000.00",
    gradient: "from-green-500 to-lime-400",
  },
  {
    id: "#ORD-23-003",
    seller: "Tokyo Steel Co.",
    initials: "TS",
    details: "50T Steel Beams",
    status: "In Transit",
    statusColor: "purple",
    amount: "$125,000.00",
    gradient: "from-purple-500 to-pink-400",
  },
];

export default function BuyerDashboard() {
  const { userProfile } = useUser();
  const { isConnected } = useWallet();
  const {
    execute: acceptOrder,
    loading: acceptingOrder,
    error: acceptError,
  } = useOrderAcceptance();
  const {
    execute: payOrder,
    loading: payingOrder,
    error: payError,
  } = useOrderPayment();
  const [orders, setOrders] = useState(defaultOrders);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch orders on mount
  useEffect(() => {
    // In a real app, fetch from API
    // setOrders(fetchedOrders)
  }, [userProfile]);

  const handleReview = (order) => {
    setSelectedOrder(order);
    setShowReviewModal(true);
  };
  const handleAccept = (order) => {
    setSelectedOrder(order);
    setShowAcceptModal(true);
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder || !isConnected) return;
    try {
      // Call the hook with order acceptance data
      const result = await acceptOrder({
        orderId: selectedOrder.id,
        data: { orderId: selectedOrder.id },
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
      setToast({
        message: `Order accepted! Tx: ${result.txHash?.slice(0, 10)}...`,
        type: "success",
        icon: "check_circle",
      });
    } catch (err) {
      setToast({
        message: `Failed to accept order: ${err.message || "Unknown error"}`,
        type: "error",
        icon: "error",
      });
    }
  };

  const handlePayOrder = async () => {
    if (!selectedOrder || !isConnected) return;
    try {
      // Call the hook with payment data
      const result = await payOrder({
        orderId: selectedOrder.id,
        data: {
          sellerAddress: selectedOrder.sellerAddress || "0x" + "0".repeat(40),
          amount: selectedOrder.amount.replace(/[$,]/g, ""),
        },
      });

      // Update order status in UI
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

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Orders"
            value="142"
            change="+12%"
            icon="receipt_long"
          />
          <StatCard
            label="Pending Action"
            value="8"
            change="+2%"
            icon="pending_actions"
          />
          <StatCard
            label="Escrow Locked"
            value="$2.4M"
            change="+5%"
            icon="lock"
          />
          <StatCard
            label="Completed"
            value="89"
            change="+8%"
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
                    className={`group hover:bg-border-dark/30 transition-colors ${order.statusColor === "blue" ? "bg-border-dark/10" : ""}`}
                  >
                    <td className="px-6 py-4 relative">
                      {order.statusColor === "blue" && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                      )}
                      <span className="text-white font-mono font-medium text-sm">
                        {order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${order.gradient} flex items-center justify-center text-xs font-bold text-white`}
                        >
                          {order.initials}
                        </div>
                        <span className="text-white text-sm font-medium">
                          {order.seller}
                        </span>
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
                        USDT
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.statusColor === "blue" ? (
                          <button
                            onClick={() => handleAccept(order)}
                            disabled={acceptingOrder || payingOrder}
                            className="bg-primary text-background-dark px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
                          >
                            {acceptingOrder ? "Accepting..." : "Accept"}
                          </button>
                        ) : order.statusColor === "yellow" ? (
                          <button
                            onClick={() => handleReview(order)}
                            disabled={acceptingOrder || payingOrder}
                            className="bg-border-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#34463b] disabled:opacity-50 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>{" "}
                            Review
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReview(order)}
                            disabled={acceptingOrder || payingOrder}
                            className="text-text-secondary hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              local_shipping
                            </span>{" "}
                            Track
                          </button>
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
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${selectedOrder.gradient} flex items-center justify-center text-[10px] font-bold text-white`}
                      >
                        {selectedOrder.initials}
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
                      <span className="text-text-secondary text-xs">USDT</span>
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
                      {selectedOrder.amount.replace("$", "")} USDT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs uppercase tracking-wider font-bold">
                      Your Balance
                    </p>
                    <p className="text-white text-sm font-mono mt-1">
                      45,230.50 USDT
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-white">
                      Token Allowance
                    </label>
                    <span className="text-xs text-yellow-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        warning
                      </span>
                      Insufficient Allowance
                    </span>
                  </div>
                  <div className="flex w-full items-center rounded-lg bg-background-dark border border-border-dark h-12 px-4">
                    <input
                      className="bg-transparent border-none text-white focus:ring-0 text-lg font-mono w-full p-0"
                      type="number"
                      defaultValue={selectedOrder.amount.replace(/[$,]/g, "")}
                    />
                    <span className="text-text-secondary font-bold ml-2">
                      USDT
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Current Allowance:{" "}
                    <span className="font-mono text-white">0.00 USDT</span>
                  </p>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1 py-3 px-4 rounded-lg bg-border-dark text-white font-bold hover:bg-border-dark/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-[2] py-3 px-4 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group">
                    Approve USDT
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[18px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
                <p className="text-center text-xs text-text-secondary">
                  By approving, you grant the Escrow Smart Contract permission
                  to move the specified amount of USDT.
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
                      Unit Price (USDT)
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
                    confirmed, you will be asked to escrow USDT into the smart
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
