import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";
import { useUser } from "../contexts/UserContext";

export default function ConnectWalletRole() {
  const navigate = useNavigate();
  const { connect, isLoading: connecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { setUserRole } = useUser();

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-border-dark bg-[#111813]">
        <div className="flex flex-col h-full p-4">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">link</span>
              </div>
              <h1 className="text-white text-lg font-bold tracking-tight">
                ChainTrade
              </h1>
            </div>
            <p className="text-text-secondary text-xs font-normal">
              Global Supply Chain Network
            </p>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            <a
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-dark text-white border border-border-dark/50"
              href="#"
            >
              <span className="material-symbols-outlined text-primary">
                home
              </span>
              <span className="text-sm font-medium">Home</span>
            </a>
            <a
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface-dark hover:text-white transition-colors"
              href="#"
            >
              <span className="material-symbols-outlined">
                wifi_tethering_off
              </span>
              <span className="text-sm font-medium">Network Status</span>
            </a>
            <a
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface-dark hover:text-white transition-colors"
              href="#"
            >
              <span className="material-symbols-outlined">bar_chart</span>
              <span className="text-sm font-medium">Platform Stats</span>
            </a>
            <a
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface-dark hover:text-white transition-colors"
              href="#"
            >
              <span className="material-symbols-outlined">menu_book</span>
              <span className="text-sm font-medium">Documentation</span>
            </a>
          </nav>
          <div className="mt-auto flex flex-col gap-3 py-4 border-t border-border-dark">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
              Live Metrics
            </h3>
            <div className="p-3 rounded-lg bg-surface-dark border border-border-dark">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-text-secondary">
                  Total Volume
                </span>
                <span className="text-xs text-primary font-medium">+12%</span>
              </div>
              <p className="text-white text-lg font-bold">$4.2B</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-dark border border-border-dark">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-text-secondary">
                  Active Nodes
                </span>
                <span className="text-xs text-primary font-medium">+5%</span>
              </div>
              <p className="text-white text-lg font-bold">1,240</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border-dark">
            <Link
              to="/settings"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-dark relative">
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#13ec5b 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        ></div>
        <div className="absolute top-0 right-0 p-8 z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-dark border border-border-dark text-xs text-primary font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Mainnet Beta
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-8 py-12 max-w-5xl mx-auto w-full">
          {/* Hero */}
          <div className="text-center mb-16 max-w-2xl">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-surface-dark border border-border-dark mb-6 shadow-xl shadow-primary/5">
              <span className="material-symbols-outlined text-primary text-4xl">
                hub
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              Decentralized Trade Network
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              Connect your wallet to access the global supply chain marketplace.
              Secure, transparent, and efficient trade for verified entities.
            </p>
          </div>

          {/* Connection Area */}
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Wallet Connect */}
            <div
              className={`bg-[#111813] border rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 shadow-lg shadow-black/20 group ${isConnected ? "border-primary/50" : "border-border-dark hover:border-primary/30"}`}
            >
              <div
                className={`w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mb-6 transition-transform duration-300 border ${isConnected ? "border-primary scale-110" : "border-border-dark group-hover:scale-110"}`}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${isConnected ? "text-primary" : "text-white"} ${connecting ? "animate-spin" : ""}`}
                >
                  {connecting
                    ? "progress_activity"
                    : isConnected
                      ? "check_circle"
                      : "account_balance_wallet"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {isConnected ? "Wallet Connected" : "Connect Wallet"}
              </h2>
              <p className="text-text-secondary text-sm mb-8 px-4">
                {isConnected ? (
                  <>
                    <span className="font-mono text-primary text-xs">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <br />
                    Sepolia Testnet — Ready to trade
                  </>
                ) : (
                  "Link your verified blockchain identity to start trading. Supports MetaMask, WalletConnect, and Coinbase."
                )}
              </p>
              {isConnected ? (
                <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                  <span className="material-symbols-outlined text-[18px]">
                    verified
                  </span>{" "}
                  Connected Successfully
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className={`w-full py-3.5 px-6 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mb-4 ${connecting ? "bg-primary/50 text-background-dark/60 cursor-wait" : "bg-primary hover:bg-primary-hover text-background-dark"}`}
                >
                  <span
                    className={`material-symbols-outlined ${connecting ? "animate-spin" : ""}`}
                  >
                    {connecting ? "progress_activity" : "login"}
                  </span>
                  {connecting ? "Connecting..." : "Connect Web3 Wallet"}
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-text-secondary mt-4">
                <span className="material-symbols-outlined text-[16px]">
                  lock
                </span>
                <span>End-to-end encrypted connection</span>
              </div>
            </div>

            {/* Right: Role Selection */}
            <div className="flex flex-col gap-4">
              <Link
                to="/register/seller"
                onClick={() => setUserRole("seller", null)}
                className={`bg-surface-dark border rounded-xl p-6 transition-colors cursor-pointer group h-full flex flex-col justify-center ${isConnected ? "border-border-dark hover:border-primary/40" : "border-border-dark/50 opacity-60 pointer-events-none"}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-background-dark text-primary border border-border-dark">
                    <span className="material-symbols-outlined">
                      storefront
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary bg-background-dark px-2 py-1 rounded border border-border-dark">
                    Role Selection
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                  Register as Seller
                </h3>
                <p className="text-sm text-text-secondary">
                  For manufacturers and suppliers. List products, manage
                  inventory, and receive secure payments.
                </p>
              </Link>

              <Link
                to="/register/buyer"
                onClick={() => setUserRole("buyer", null)}
                className={`bg-surface-dark border rounded-xl p-6 transition-colors cursor-pointer group h-full flex flex-col justify-center ${isConnected ? "border-border-dark hover:border-primary/40" : "border-border-dark/50 opacity-60 pointer-events-none"}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-background-dark text-primary border border-border-dark">
                    <span className="material-symbols-outlined">
                      shopping_cart
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary bg-background-dark px-2 py-1 rounded border border-border-dark">
                    Role Selection
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                  Register as Buyer
                </h3>
                <p className="text-sm text-text-secondary">
                  For retailers and distributors. Browse verified catalogs,
                  place orders, and track shipments.
                </p>
              </Link>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="mt-16 w-full pt-8 border-t border-border-dark flex flex-wrap justify-center gap-8 md:gap-16 opacity-70">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-secondary text-3xl">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">100%</span>
                <span className="text-xs text-text-secondary uppercase tracking-wider">
                  Verified Entities
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-secondary text-3xl">
                public
              </span>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">142</span>
                <span className="text-xs text-text-secondary uppercase tracking-wider">
                  Countries Served
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-secondary text-3xl">
                bolt
              </span>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">&lt; 2s</span>
                <span className="text-xs text-text-secondary uppercase tracking-wider">
                  Block Time
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
