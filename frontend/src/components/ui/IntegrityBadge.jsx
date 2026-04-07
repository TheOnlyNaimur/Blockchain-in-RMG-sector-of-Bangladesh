import React, { useState } from "react";
import { useIntegrityVerification } from "../../hooks/useIntegrityVerification";

/**
 * IntegrityBadge — visual indicator of data integrity.
 *
 * Shows:
 *   ✅ green  = hash matches (data is authentic)
 *   ❌ red    = hash mismatch (data may be tampered)
 *   ⏳ gray   = not yet verified / loading
 *
 * @param txHash - transaction hash of the record to verify
 * @param compact - if true, shows only the icon (no text)
 */
export default function IntegrityBadge({
  txHash,
  compact = false,
}) {
  const { isVerified, loading, error, storedHash, recomputedHash, verify } =
    useIntegrityVerification(txHash);
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = async () => {
    if (isVerified === null && !loading) {
      await verify();
    }
    setShowDetails(!showDetails);
  };

  // Determine display state
  let icon;
  let bgColor;
  let textColor;
  let label;

  if (loading) {
    icon = "⏳";
    bgColor = "bg-gray-700/50";
    textColor = "text-gray-400";
    label = "Verifying...";
  } else if (isVerified === true) {
    icon = "✅";
    bgColor = "bg-green-900/30";
    textColor = "text-green-400";
    label = "Verified";
  } else if (isVerified === false) {
    icon = "❌";
    bgColor = "bg-red-900/30";
    textColor = "text-red-400";
    label = "Integrity Failed";
  } else {
    icon = "🔍";
    bgColor = "bg-gray-700/30";
    textColor = "text-gray-400";
    label = "Click to verify";
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${bgColor} ${textColor} hover:opacity-80 transition-opacity cursor-pointer border border-transparent hover:border-gray-600`}
        title={label}
      >
        <span>{icon}</span>
        {!compact && <span>{label}</span>}
      </button>

      {/* Details popup */}
      {showDetails && isVerified !== null && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 p-3 rounded-lg bg-gray-800 border border-gray-600 shadow-xl text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-semibold ${textColor}`}>
              {isVerified ? "✅ Data Integrity Valid" : "❌ Data Integrity Failed"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
              className="text-gray-500 hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {error && <p className="text-red-400 mb-2">{error}</p>}

          <div className="space-y-1.5 text-gray-400">
            <div>
              <span className="text-gray-500">Stored Hash: </span>
              <span className="font-mono break-all">
                {storedHash ? `${storedHash.substring(0, 20)}...` : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Recomputed: </span>
              <span className="font-mono break-all">
                {recomputedHash ? `${recomputedHash.substring(0, 20)}...` : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Match: </span>
              <span className={isVerified ? "text-green-400" : "text-red-400"}>
                {isVerified ? "Yes ✓" : "No ✗ (possible tampering)"}
              </span>
            </div>
          </div>

          {isVerified && (
            <p className="mt-2 text-green-500/70 text-[10px]">
              This record's off-chain data matches its stored hash.
              The data has not been tampered with since it was recorded on the blockchain.
            </p>
          )}
          {!isVerified && (
            <p className="mt-2 text-red-500/70 text-[10px]">
              WARNING: The re-computed hash does not match the stored hash.
              This could indicate the off-chain data was modified after being recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
