#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# deploy.sh — One-command deploy + auto-config
#
# Usage:  ./deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

RPC_URL=${RPC_URL:-http://localhost:8545}

echo "═══════════════════════════════════════════════════════════"
echo "  TradeChain — Auto Deploy & Configure"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "📦 Building contracts..."
forge build --force 2>/dev/null
echo "   ✅ Build successful"

echo ""
echo "🚀 Deploying to network ($RPC_URL)..."
CHAIN_ID=$(cast chain-id --rpc-url "$RPC_URL")

forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --legacy \
  2>/dev/null

echo "   ✅ Deployment script ran"

echo ""
echo "🔍 Extracting deployed addresses..."

BROADCAST_FILE="$PROJECT_DIR/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
  echo "   ❌ Broadcast file not found: $BROADCAST_FILE"
  exit 1
fi

CONTRACT_ADDRESS=$(python3 -c "
import json
with open('$BROADCAST_FILE') as f:
    data = json.load(f)
creates = [tx for tx in data['transactions'] if tx['transactionType'] == 'CREATE']
print(creates[0]['contractAddress'])
")

echo "   MyContract   : $CONTRACT_ADDRESS"

echo ""
echo "📝 Updating .env files..."

update_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

update_env "$PROJECT_DIR/.env" "CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
echo "   ✅ .env (root)"

update_env "$PROJECT_DIR/backend/.env" "CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
echo "   ✅ backend/.env"

update_env "$PROJECT_DIR/frontend/.env" "VITE_CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_USDT_ADDRESS" "$USDT_ADDRESS"

# Inject Role Addresses to frontend
update_env "$PROJECT_DIR/frontend/.env" "VITE_CERTIFIER_ADDRESS" "$CERTIFIER_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_QUALITY_CHECKER_ADDRESS" "$QUALITY_CHECKER_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_FREIGHT_FORWARDER_ADDRESS" "$FREIGHT_FORWARDER_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_EXPORT_CUSTOMS_ADDRESS" "$EXPORT_CUSTOMS_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_IMPORT_CUSTOMS_ADDRESS" "$IMPORT_CUSTOMS_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_COMPLIANCE_CHECKER_ADDRESS" "$COMPLIANCE_CHECKER_ADDRESS"

echo "   ✅ frontend/.env"

echo ""
echo "📋 Updating ABI..."
ABI_SOURCE="$PROJECT_DIR/out/MyContract.sol/MyContract.json"
ABI_DEST="$PROJECT_DIR/backend/abi/MyContract.json"

python3 -c "
import json
with open('$ABI_SOURCE') as f:
    data = json.load(f)
with open('$ABI_DEST', 'w') as f:
    json.dump(data['abi'], f, indent=2)
"
echo "   ✅ backend/abi/MyContract.json"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
