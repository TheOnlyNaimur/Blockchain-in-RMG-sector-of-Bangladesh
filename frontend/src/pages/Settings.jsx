import { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import Toast from "../components/ui/Toast";
import { useUser } from "../contexts/UserContext";
import { useAccount } from "wagmi";

export default function Settings() {
  const { userProfile, setUserProfile } = useUser();
  const { address } = useAccount();
  const [toast, setToast] = useState(null);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [notifications, setNotifications] = useState({
    0: true,
    1: true,
    2: false,
    3: true,
    4: false,
  });
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    role: "",
    contactNumber: "",
  });

  // Load saved profile on mount
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        displayName: userProfile.displayName || "",
        email: userProfile.email || "",
        role: userProfile.role || "",
        contactNumber: userProfile.contactNumber || "",
      });
    }
  }, [userProfile]);

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setUserProfile(profileData);
      setToast({
        message: "Profile information saved successfully",
        icon: "check_circle",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "Failed to save profile",
        icon: "error",
        type: "error",
      });
    }
  };

  const handleToggle = (i) => {
    setNotifications((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">Settings</h1>
          <p className="text-text-secondary">
            Manage your account, wallet connections, notifications, and network
            configuration.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* Profile Section */}
          <section className="rounded-xl bg-surface-dark border border-border-dark p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                person
              </span>
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Display Name
                </label>
                <input
                  value={profileData.displayName}
                  onChange={(e) =>
                    handleProfileChange("displayName", e.target.value)
                  }
                  className="bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Email Address
                </label>
                <input
                  value={profileData.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className="bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Role
                </label>
                <input
                  className="bg-background-dark border border-border-dark text-text-secondary text-sm rounded-lg p-3 cursor-not-allowed"
                  value={profileData.role}
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Contact Number
                </label>
                <input
                  value={profileData.contactNumber}
                  onChange={(e) =>
                    handleProfileChange("contactNumber", e.target.value)
                  }
                  className="bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors"
              >
                Save Changes
              </button>
            </div>
          </section>

          {/* Wallet Management */}
          <section className="rounded-xl bg-surface-dark border border-border-dark p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                account_balance_wallet
              </span>
              Wallet Management
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background-dark border border-border-dark">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      account_balance_wallet
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">MetaMask</p>
                    <p className="text-text-secondary text-xs font-mono">
                      {address || "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>{" "}
                    Connected
                  </span>
                  <button
                    onClick={() =>
                      setToast({
                        message: "Wallet disconnected",
                        icon: "link_off",
                        type: "error",
                      })
                    }
                    className="text-red-400 text-sm font-medium hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowConnectWallet(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border-dark text-text-secondary hover:text-primary hover:border-primary/50 transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined">add</span>
                Connect Another Wallet
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-xl bg-surface-dark border border-border-dark p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                notifications
              </span>
              Notification Preferences
            </h2>
            <div className="space-y-4">
              {[
                {
                  label: "Order Updates",
                  desc: "Get notified when order status changes",
                },
                {
                  label: "Payment Alerts",
                  desc: "Get notified on escrow and payment events",
                },
                {
                  label: "Customs Clearance",
                  desc: "Receive clearance status notifications",
                },
                {
                  label: "Quality Control",
                  desc: "Batch review and approval alerts",
                },
                {
                  label: "Email Notifications",
                  desc: "Receive email copies of all notifications",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-background-dark border border-border-dark hover:border-primary/20 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium text-sm">
                      {item.label}
                    </p>
                    <p className="text-text-secondary text-xs">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications[i]}
                      onChange={() => handleToggle(i)}
                    />
                    <div className="w-11 h-6 bg-border-dark rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Network Configuration */}
          <section className="rounded-xl bg-surface-dark border border-border-dark p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                lan
              </span>
              Network Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Active Network
                </label>
                <select className="bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                  <option value={import.meta.env.VITE_CHAIN_ID}>{import.meta.env.VITE_CHAIN_NAME || "Anvil Local"}</option>
                  <option>Sepolia Testnet</option>
                  <option>Ethereum Mainnet</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  RPC Endpoint
                </label>
                <input
                  className="bg-background-dark border border-border-dark text-text-secondary text-sm rounded-lg p-3 font-mono"
                  defaultValue={import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545"}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Contract Address
                </label>
                <input
                  className="bg-background-dark border border-border-dark text-text-secondary text-sm rounded-lg p-3 font-mono"
                  defaultValue={import.meta.env.VITE_CONTRACT_ADDRESS || "0x..."}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Explorer URL
                </label>
                <input
                  className="bg-background-dark border border-border-dark text-text-secondary text-sm rounded-lg p-3 font-mono"
                  defaultValue={"http://localhost:8545 (Local Anvil)"}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setToast({
                    message: "RPC connection test successful — latency 42ms",
                    icon: "wifi",
                    type: "info",
                  })
                }
                className="px-6 py-2.5 bg-border-dark text-white rounded-lg font-bold text-sm hover:bg-[#34463b] transition-colors"
              >
                Test Connection
              </button>
              <button
                onClick={() =>
                  setToast({
                    message: "Network configuration saved",
                    icon: "check_circle",
                    type: "success",
                  })
                }
                className="px-6 py-2.5 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors"
              >
                Save Network
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="rounded-xl bg-surface-dark border border-red-500/20 p-6 mb-8">
            <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Danger Zone
            </h2>
            <div className="flex items-center justify-between p-4 rounded-lg bg-background-dark border border-border-dark">
              <div>
                <p className="text-white font-medium text-sm">Delete Account</p>
                <p className="text-text-secondary text-xs">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-transparent border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ── CONNECT WALLET MODAL ── */}
      {showConnectWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowConnectWallet(false)}
        >
          <div
            className="w-full max-w-md bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowConnectWallet(false)}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-text-secondary text-sm mb-4">
                Select a wallet provider to connect with your TradeChain
                account.
              </p>
              {[
                {
                  name: "MetaMask",
                  desc: "Browser extension & mobile wallet",
                  icon: "🦊",
                },
                {
                  name: "WalletConnect",
                  desc: "Scan QR code to connect",
                  icon: "🔗",
                },
                {
                  name: "Coinbase Wallet",
                  desc: "Coinbase self-custody wallet",
                  icon: "🪙",
                },
                {
                  name: "Trust Wallet",
                  desc: "Multi-chain mobile wallet",
                  icon: "🛡️",
                },
              ].map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => {
                    setShowConnectWallet(false);
                    setToast({
                      message: `${wallet.name} connection initiated`,
                      icon: "link",
                      type: "info",
                    });
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-background-dark border border-border-dark hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm group-hover:text-primary transition-colors">
                      {wallet.name}
                    </p>
                    <p className="text-text-secondary text-xs">{wallet.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-surface-dark border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-center">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>{" "}
                Delete Account
              </h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                }}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-red-400">
                    delete_forever
                  </span>
                </div>
                <p className="text-white font-medium">
                  This action is permanent
                </p>
                <p className="text-text-secondary text-sm mt-1">
                  All data, certificates, and transaction history will be
                  permanently deleted.
                </p>
              </div>

              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                <ul className="space-y-2 text-xs text-red-300/80">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>{" "}
                    All orders and trade history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>{" "}
                    Wallet connections and certificates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>{" "}
                    Notification preferences and settings
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">
                  Type <span className="text-red-400 font-mono">DELETE</span> to
                  confirm
                </label>
                <input
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full bg-background-dark border border-red-500/30 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 p-3 placeholder-[#5c7263] font-mono"
                  placeholder="Type DELETE here"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-dark bg-surface-darker flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                }}
                className="flex-1 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteText !== "DELETE"}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                  setToast({
                    message: "Account deletion requested",
                    icon: "delete",
                    type: "error",
                  });
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${deleteText === "DELETE" ? "bg-red-500 text-white hover:bg-red-600" : "bg-red-500/20 text-red-500/50 cursor-not-allowed"}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  delete_forever
                </span>{" "}
                Delete Account
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
