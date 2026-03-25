import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks";

const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || "31337";

export default function ConnectWallet() {
  const navigate = useNavigate();
  const { isConnected, address, connect, error, status } = useWallet();
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-navigate once connected
  useEffect(() => {
    if (isConnected && address) {
      // Connection successful - redirect to role selection
      setTimeout(() => {
        navigate("/connect-role");
      }, 1000);
    }
  }, [isConnected, address, navigate]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      setErrorMessage(error.message || "Failed to connect wallet");
    }
  }, [error]);

  const handleConnect = () => {
    setErrorMessage("");
    connect();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/95 backdrop-blur supports-[backdrop-filter]:bg-background-dark/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-xl">token</span>
            </div>
            <h2 className="text-white text-lg font-bold tracking-tight">
              TradeChain
            </h2>
          </div>
          <nav className="hidden md:flex flex-1 justify-center gap-8">
            <a
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
              href="#"
            >
              Platform
            </a>
            <a
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
              href="#"
            >
              Governance
            </a>
            <a
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
              href="#"
            >
              Docs
            </a>
            <a
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
              href="#"
            >
              Support
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border-dark bg-surface-dark px-3 py-1.5 text-xs font-medium text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Anvil Local Network
            </div>
            <button
              onClick={handleConnect}
              disabled={isConnected || status === "connecting"}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-[#111813] transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[20px] animate-none">
                {status === "connecting"
                  ? "sync"
                  : isConnected
                    ? "check_circle"
                    : "account_balance_wallet"}
              </span>
              <span className="truncate">
                {status === "connecting"
                  ? "Connecting..."
                  : isConnected
                    ? "Connected"
                    : "Connect Wallet"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-[128px]"></div>

        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 w-full max-w-md rounded-lg bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">
                error
              </span>
              <div className="text-left">
                <p className="text-sm font-medium text-red-400">
                  Connection Error
                </p>
                <p className="text-xs text-red-300/80 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {isConnected && address && (
            <div className="mb-6 w-full max-w-md rounded-lg bg-primary/10 border border-primary/30 p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">
                check_circle
              </span>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-primary">
                  Wallet Connected!
                </p>
                <p className="text-xs text-primary/80 mt-1 break-all font-mono">
                  {address}
                </p>
                <p className="text-xs text-text-secondary mt-2">
                  Redirecting to role selection...
                </p>
              </div>
            </div>
          )}

          {/* Hero */}
          <div className="mb-10 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Connect to <span className="text-primary">TradeChain</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Access the decentralized supply chain network for international
              trade. Secure, transparent, and immutable logistics data at your
              fingertips.
            </p>
          </div>

          {/* Wallet Card */}
          <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-dark p-1 shadow-2xl shadow-black/50">
            <div className="rounded-lg bg-background-dark p-6 sm:p-8">
              <div className="flex flex-col items-center gap-6">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full bg-surface-dark border border-border-dark shadow-inner ${status === "connecting" ? "animate-spin" : ""}`}
                >
                  <span className="material-symbols-outlined text-4xl text-primary">
                    {status === "connecting"
                      ? "cached"
                      : isConnected
                        ? "check_circle"
                        : "link"}
                  </span>
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-lg font-semibold text-white">
                    {isConnected
                      ? "Wallet Connected!"
                      : status === "connecting"
                        ? "Connecting to MetaMask..."
                        : "Wallet Not Connected"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isConnected
                      ? "Proceed to role selection"
                      : status === "connecting"
                        ? "Please approve the connection in your wallet"
                        : "Please connect your Web3 wallet to continue."}
                  </p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isConnected || status === "connecting"}
                  className={`group relative flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${isConnected ? "bg-primary/50 text-[#111813]/60 cursor-default" : status === "connecting" ? "bg-primary/50 text-[#111813]/60 cursor-wait" : "bg-primary text-[#111813] hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(19,236,91,0.3)]"}`}
                >
                  <span
                    className={`material-symbols-outlined ${status === "connecting" ? "animate-spin" : ""}`}
                  >
                    {status === "connecting"
                      ? "cached"
                      : isConnected
                        ? "check_circle"
                        : "account_balance_wallet"}
                  </span>
                  {status === "connecting"
                    ? "Connecting..."
                    : isConnected
                      ? "Connected"
                      : "Connect MetaMask"}
                </button>
                <div className="flex w-full items-center justify-between text-xs text-slate-500 border-t border-border-dark pt-4">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`material-symbols-outlined text-[16px] ${status === "connecting" || isConnected ? "text-primary" : "text-yellow-400"}`}
                    >
                      {status === "connecting" || isConnected
                        ? "check_circle"
                        : "info"}
                    </span>
                    {status === "connecting"
                      ? "Connecting..."
                      : isConnected
                        ? "Network OK"
                        : "Network: Anvil Local"}
                  </span>
                  <span>Chain: {CHAIN_ID}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Options */}
          <div className="mt-16 w-full">
            <div className="relative mb-8">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-border-dark"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background-dark px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  New to TradeChain?
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Link
                to="/register/seller"
                className="group relative flex flex-col gap-4 rounded-xl border border-border-dark bg-surface-dark/50 p-6 transition-all hover:bg-surface-dark hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                    <span className="material-symbols-outlined">
                      inventory_2
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                    Register as Seller
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    List products, manage inventory, and track shipments
                    worldwide.
                  </p>
                </div>
              </Link>

              <Link
                to="/register/buyer"
                className="group relative flex flex-col gap-4 rounded-xl border border-border-dark bg-surface-dark/50 p-6 transition-all hover:bg-surface-dark hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                    <span className="material-symbols-outlined">
                      shopping_cart
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                    Register as Buyer
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Source verified goods, create purchase orders, and monitor
                    delivery.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-dark bg-surface-dark py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              System Operational
            </span>
            <span className="hidden md:inline text-border-dark">|</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">
                block
              </span>
              Block Height: 18,245,901
            </span>
          </div>
          <div className="flex gap-4">
            <a className="hover:text-primary transition-colors" href="#">
              Terms of Service
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
