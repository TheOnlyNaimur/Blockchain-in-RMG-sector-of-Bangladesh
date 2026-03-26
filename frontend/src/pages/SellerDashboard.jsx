import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import RoleGuard from "../components/RoleGuard";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useUser } from "../contexts/UserContext";
import { useWallet } from "../hooks/useWallet";
import { useAccount } from "wagmi";
import { useBatchCreation } from "../hooks/useBatches";
import { useShipmentRequest } from "../hooks/useShipments";
import { useOrdersFetching, useOrderCreation } from "../hooks";
import { ROLES } from "../config/contracts";

export default function SellerDashboard() {
  const { userProfile } = useUser();
  const { isConnected } = useWallet();
  const {
    execute: createBatch,
    loading: creatingBatch,
    error: batchError,
  } = useBatchCreation();
  const { execute: createOrder, loading: creatingOrder } = useOrderCreation();
  const { execute: requestShipment, loading: requestingShipment } = useShipmentRequest();
  const { data: allOrdersRaw, loading: ordersLoading, refetch: refetchOrders } = useOrdersFetching();
  const allOrders = allOrdersRaw ?? [];
  
  const [orders, setOrders] = useState([]);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showRequestShipment, setShowRequestShipment] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [batchOrder, setBatchOrder] = useState(null);
  const [shipmentOrder, setShipmentOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [freightForwarderAddress, setFreightForwarderAddress] = useState(ROLES.freightForwarder || "");

  // Form state
  const [buyerAddress, setBuyerAddress] = useState("");
  const [details, setDetails] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");

  const { address: walletAddress } = useAccount();

  useEffect(() => {
    const addr = userProfile?.address || walletAddress;
    if (addr && allOrders.length > 0) {
      setOrders(allOrders.filter(o => o.seller.toLowerCase() === addr.toLowerCase()));
    } else if (allOrders.length > 0) {
      setOrders(allOrders);
    }
  }, [allOrders, userProfile, walletAddress]);

  const handleSubmitOrder = async () => {
    if (!buyerAddress || !details || !amount) return;
    try {
      const result = await createOrder({ buyerAddress, details, amount, hsCode, destination });
      setToast({ message: `Order proposed! Tx: ${result.txHash.slice(0, 10)}... ID: ${result.orderId}`, type: "success", icon: "check_circle" });
      refetchOrders();
      setBuyerAddress("");
      setDetails("");
      setAmount("");
      setHsCode("");
      setDestination("");
    } catch (err) {
      setToast({ message: err.message || "Failed to create order", type: "error", icon: "error" });
    }
  };

  const handleCreateBatch = (order) => {
    setBatchOrder(order);
    setShowCreateBatch(true);
  };

  const handleBatchSubmit = async () => {
    if (!batchOrder || !isConnected) return;
    try {
      // Call the hook with batch creation data
      const result = await createBatch({
        orderId: batchOrder.orderId,
        productInfo: `Batch for order ${batchOrder.id} - Amount: ${batchOrder.amount}`,
      });

      // Update order status in UI
      setOrders((prev) =>
        prev.map((o) =>
          o.id === batchOrder.id
            ? {
                ...o,
                status: "Batch Created",
                statusColor: "blue",
                action: null,
              }
            : o,
        ),
      );
      setShowCreateBatch(false);
      setToast({
        message: `Batch created! Tx: ${result.txHash?.slice(0, 10)}... Batch ID: ${result.batchId}`,
        type: "success",
        icon: "check_circle",
      });
    } catch (err) {
      setToast({
        message: `Failed to create batch: ${err.message || "Unknown error"}`,
        type: "error",
        icon: "error",
      });
    }
  };

  const handleShipmentSubmit = async () => {
    if (!shipmentOrder || !isConnected) return;
    try {
      const result = await requestShipment({
        batchId: shipmentOrder.batchId,
        freightForwarderAddress: freightForwarderAddress || undefined, // undefined falls back to process.env.FREIGHT_FORWARDER_ADDRESS in backend for testing ease
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === shipmentOrder.id
            ? { ...o, status: "Shipment Requested", statusColor: "blue", action: null }
            : o
        )
      );
      setShowRequestShipment(false);
      setToast({ message: `Shipment requested! Tx: ${result.txHash?.slice(0, 10)}... Ship ID: ${result.shipId}`, type: "success", icon: "check_circle" });
    } catch (err) {
      setToast({ message: `Failed to request shipment: ${err.message || "Unknown error"}`, type: "error", icon: "error" });
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  if (!isConnected) {
    return (
      <RoleGuard requiredRoles={["seller"]}>
        <AppLayout title="Seller Dashboard">
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
    <RoleGuard requiredRoles={["seller"]}>
      <AppLayout title="Seller Dashboard">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            icon={toast.icon}
            onClose={() => setToast(null)}
          />
        )}
        {/* Profile */}
        <section className="mb-8 bg-surface-dark border border-border-dark rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 border-4 border-border-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    storefront
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-background-dark rounded-full p-1 border-2 border-surface-dark">
                  <span className="material-symbols-outlined text-[16px] font-bold block">
                    verified
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-white text-2xl md:text-[28px] font-bold leading-tight tracking-[-0.015em]">
                    {userProfile?.displayName || "Blockchain Seller"}
                  </h1>
                  <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-primary/30">
                    Approved
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-secondary text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">
                      account_balance_wallet
                    </span>
                    <span className="font-mono">{userProfile?.address ? `${userProfile.address.slice(0, 10)}...${userProfile.address.slice(-4)}` : "Unknown Wallet"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">
                      verified_user
                    </span>
                    <span className="font-mono">Role: {userProfile?.role || "Pending"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <button
                onClick={() => setShowCertificate(true)}
                className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-border-dark hover:bg-[#34463b] text-white text-sm font-bold transition-colors flex-1 md:flex-none"
              >
                <span className="material-symbols-outlined text-[18px]">
                  visibility
                </span>
                View Certificate
              </button>
              <button
                onClick={() => setShowEditProfile(true)}
                className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-border-dark hover:bg-[#34463b] text-white text-sm font-bold transition-colors flex-1 md:flex-none"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Orders Table */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-bold">Orders Created</h2>
              <select className="bg-border-dark text-white text-sm border-none rounded-lg focus:ring-1 focus:ring-primary py-2 pl-3 pr-8">
                <option>All Status</option>
                <option>Accepted</option>
                <option>Created</option>
                <option>Pending</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-dark bg-surface-dark shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-border-dark/50 border-b border-border-dark">
                      <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Buyer Address
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                        Escrowed USDT
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="group hover:bg-border-dark/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-white font-mono">
                          {order.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                          {order.buyer}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            label={order.status}
                            color={order.statusColor}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-white font-medium text-right">
                          {order.amount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {order.action === "Create Batch" ? (
                            <button
                              onClick={() => {
                                setBatchOrder(order);
                                setShowCreateBatch(true);
                              }}
                              disabled={creatingBatch}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-primary text-background-dark text-xs font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm shadow-primary/20"
                            >
                              {creatingBatch ? "Creating..." : "Create Batch"}
                            </button>
                          ) : order.action === "Request Shipment" ? (
                            <button
                              onClick={() => {
                                setShipmentOrder(order);
                                setShowRequestShipment(true);
                              }}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-green-500 text-background-dark text-xs font-bold hover:bg-green-400 transition-colors shadow-sm"
                            >
                              Request Shipment
                            </button>
                          ) : order.action === "delete" ? (
                            <button className="text-text-secondary hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-text-secondary italic">
                              {order.status === "Created"
                                ? "Waiting for Buyer"
                                : order.status === "Batch Created"
                                  ? "Awaiting QC"
                                  : order.status === "QC Failed"
                                    ? "QC Rejected"
                                    : order.status === "Shipment Requested"
                                      ? "In Transit"
                                      : order.status === "Export Cleared"
                                        ? "Awaiting Import Tracker"
                                        : order.status === "Import Cleared"
                                          ? "Awaiting Delivery Conf."
                                          : order.status === "Delivered & Paid"
                                            ? "Completed & Paid"
                                            : "Processing"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-border-dark flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  Showing 1 to 5 of 24 entries
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-border-dark text-white text-sm hover:bg-[#34463b] disabled:opacity-50"
                    disabled
                  >
                    Prev
                  </button>
                  <button className="px-3 py-1 rounded bg-border-dark text-white text-sm hover:bg-[#34463b]">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create Order Form */}
          <div className="lg:col-span-4">
            <div className="bg-surface-dark border border-border-dark rounded-xl p-6 sticky top-24 shadow-lg shadow-black/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined">
                    add_shopping_cart
                  </span>
                </div>
                <h3 className="text-white text-lg font-bold">
                  Create New Order
                </h3>
              </div>
              <form className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Buyer Wallet Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                      <span className="material-symbols-outlined text-[18px]">
                        wallet
                      </span>
                    </span>
                    <input
                      className="w-full bg-border-dark border-none rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm font-mono"
                      placeholder="0x..."
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      disabled={creatingOrder}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Order Details
                  </label>
                  <textarea
                    className="w-full bg-border-dark border-none rounded-lg p-3 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm resize-none"
                    placeholder="Describe the goods, quantity, and delivery terms..."
                    rows="4"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    disabled={creatingOrder}
                  ></textarea>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Order Value (USDT)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-mono">
                      $
                    </span>
                    <input
                      className="w-full bg-border-dark border-none rounded-lg py-2.5 pl-8 pr-4 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm font-mono"
                      placeholder="0.00"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={creatingOrder}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      HS Code (Optional)
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-border-dark border-none rounded-lg py-2.5 px-3 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm"
                        placeholder="e.g. 6109.10"
                        value={hsCode}
                        onChange={(e) => setHsCode(e.target.value)}
                        disabled={creatingOrder}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Destination (Optional)
                    </label>
                    <input
                      className="w-full bg-border-dark border-none rounded-lg py-2.5 px-3 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm"
                      placeholder="e.g. US, EU"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      disabled={creatingOrder}
                    />
                  </div>
                </div>
                <div className="h-px bg-border-dark my-2"></div>
                <button
                  className="flex w-full items-center justify-center rounded-lg h-11 px-4 bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={creatingOrder || !buyerAddress || !details || !amount}
                >
                  {creatingOrder ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      cached
                    </span>
                  ) : (
                    "Submit Order Proposal"
                  )}
                </button>
              </form>
              <div className="mt-6 pt-6 border-t border-border-dark">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-border-dark/30 border border-border-dark">
                  <span className="material-symbols-outlined text-text-secondary text-[20px] mt-0.5">
                    info
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Once submitted, the buyer must accept the order and escrow
                    funds before shipment tracking begins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CREATE BATCH MODAL ── */}
        {showCreateBatch && batchOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowCreateBatch(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      inventory_2
                    </span>
                    Create Production Batch
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Create a new batch for order {batchOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateBatch(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">
                        Order
                      </span>
                      <p className="text-white font-mono font-medium">
                        {batchOrder.id}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">
                        Buyer
                      </span>
                      <p className="text-white font-mono">{batchOrder.buyer}</p>
                    </div>
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">
                        Escrowed
                      </span>
                      <p className="text-white font-bold">
                        {batchOrder.amount} USDT
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">
                        Status
                      </span>
                      <StatusBadge
                        label={batchOrder.status}
                        color={batchOrder.statusColor}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Batch Description
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                    placeholder="Describe the production batch, materials used, and quality specifications..."
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
                      placeholder="e.g. 5000 units"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">
                      Unit Weight (KG)
                    </label>
                    <input
                      className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                      placeholder="e.g. 0.5"
                      type="number"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Production Date
                  </label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 [color-scheme:dark]"
                    type="date"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Quality Grade
                  </label>
                  <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                    <option>Grade A — Premium Export Quality</option>
                    <option>Grade B — Standard Commercial</option>
                    <option>Grade C — Economy</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center">
                <p className="text-xs text-text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">
                    info
                  </span>
                  Batch will be sent to QC for review
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateBatch(false)}
                    disabled={creatingBatch}
                    className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBatchSubmit}
                    disabled={creatingBatch}
                    className="px-5 py-2 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {creatingBatch ? "hourglass_empty" : "add"}
                    </span>
                    {creatingBatch ? "Creating..." : "Create Batch"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW CERTIFICATE MODAL ── */}
        {showCertificate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowCertificate(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      verified
                    </span>
                    On-Chain Certificate
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Blockchain-verified seller credentials
                  </p>
                </div>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Certificate Visual */}
                <div className="relative border-2 border-primary/30 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-transparent text-center overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-primary">
                      workspace_premium
                    </span>
                  </div>
                  <h4 className="text-white text-xl font-bold mb-1">
                    {userProfile?.displayName || "Blockchain Seller"}
                  </h4>
                  <p className="text-primary text-sm font-semibold mb-4">
                    Certified Seller — TradeChain Network
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">
                      check_circle
                    </span>{" "}
                    VALID
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {[
                    ["Certificate Hash", "0x3dF7...4b1a8c", true],
                    ["Issued By", "0x9A2...71C (Certifier)", false],
                    ["Issue Date", "Oct 15, 2023 at 14:32 UTC", false],
                    ["Tax ID (TIN)", "US-12-3456789", false],
                    ["Block Number", "#18,245,901", false],
                    ["Gas Used", "0.0042 ETH", false],
                  ].map(([label, value, isMono]) => (
                    <div
                      key={label}
                      className="flex justify-between items-center py-2.5 border-b border-border-dark/50"
                    >
                      <span className="text-sm text-text-secondary">
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${isMono ? "font-mono text-primary" : "text-white"} font-medium`}
                        >
                          {value}
                        </span>
                        {isMono && (
                          <button className="text-text-secondary hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[14px]">
                              content_copy
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex gap-3">
                <button className="flex-1 px-4 py-2.5 bg-border-dark text-white rounded-lg text-sm font-medium hover:bg-[#34463b] transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    open_in_new
                  </span>{" "}
                  View on Etherscan
                </button>
                <button className="flex-1 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>{" "}
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT PROFILE MODAL ── */}
        {showEditProfile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowEditProfile(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      edit
                    </span>
                    Edit Seller Profile
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Update your on-chain business information
                  </p>
                </div>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Business Name
                  </label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3"
                    defaultValue={userProfile?.displayName || ""}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Contact Email
                  </label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3"
                    defaultValue={userProfile?.email || "contact@example.com"}
                    type="email"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Contact Phone
                  </label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3"
                    defaultValue={userProfile?.contactNumber || "+880 (123) 456-7890"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Business Address
                  </label>
                  <textarea
                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 resize-none"
                    rows="2"
                    defaultValue="Blockchain RMG Distributed Ledger"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">
                    Product Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Electronics",
                      "Textiles",
                      "Agriculture",
                      "Manufacturing",
                    ].map((cat) => (
                      <label
                        key={cat}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark text-sm cursor-pointer hover:border-primary/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 text-primary bg-background-dark border-border-dark rounded focus:ring-primary"
                          defaultChecked={
                            cat === "Electronics" || cat === "Manufacturing"
                          }
                        />
                        <span className="text-text-secondary">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-500 text-[20px] mt-0.5">
                    info
                  </span>
                  <p className="text-xs text-yellow-500/80">
                    Profile updates require a blockchain transaction (est. 0.001
                    ETH gas fee). Your TIN and wallet address cannot be changed.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-end gap-3">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="px-5 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
                >
                  Cancel
                </button>
                <button className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    save
                  </span>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ── REQUEST SHIPMENT MODAL ── */}
        {showRequestShipment && shipmentOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowRequestShipment(false)}
          >
            <div
              className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">
                      local_shipping
                    </span>
                    Request Shipment
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    Assign a Freight Forwarder for Batch #{shipmentOrder.batchId}
                  </p>
                </div>
                <button
                  onClick={() => setShowRequestShipment(false)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">Order</span>
                      <p className="text-white font-mono font-medium">{shipmentOrder.id}</p>
                    </div>
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">Batch</span>
                      <p className="text-white font-mono">#{shipmentOrder.batchId}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">Freight Forwarder Wallet</label>
                  <input
                    className="w-full bg-background-dark border border-border-dark text-white font-mono text-sm rounded-lg focus:ring-primary focus:border-primary p-3"
                    placeholder="0x... (Leave empty for default network FF)"
                    value={freightForwarderAddress}
                    onChange={(e) => setFreightForwarderAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center">
                <p className="text-xs text-text-secondary">FF will handle export documentation.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRequestShipment(false)}
                    disabled={requestingShipment}
                    className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShipmentSubmit}
                    disabled={requestingShipment}
                    className="px-5 py-2 text-sm font-bold text-background-dark bg-green-500 hover:bg-green-400 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {requestingShipment ? "Requesting..." : "Assign Forwarder"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RoleGuard>
  );
}
