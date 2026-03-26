#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# deploy.sh — One-command deploy + auto-config
#
# Usage:  ./deploy.sh
#
# What it does:
#   1. Compiles contracts (forge build)
#   2. Deploys MockUSDT + MyContract to Anvil
#   3. Extracts deployed addresses from broadcast JSON
#   4. Updates CONTRACT_ADDRESS & USDT_ADDRESS in:
#      - .env (root)
#      - backend/.env
#      - frontend/.env
#   5. Copies fresh ABI to backend/abi/MyContract.json
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════════════════════"
echo "  TradeChain — Auto Deploy & Configure"
echo "═══════════════════════════════════════════════════════════"

# ─── Step 1: Build ────────────────────────────────────────────────────────────
echo ""
echo "📦 Building contracts..."
forge build --force 2>/dev/null
echo "   ✅ Build successful"

# ─── Step 2: Deploy ───────────────────────────────────────────────────────────
echo ""
echo "🚀 Deploying to Anvil (localhost:8545)..."
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  2>/dev/null

echo "   ✅ Deployment successful"

# ─── Step 3: Extract addresses from broadcast JSON ───────────────────────────
echo ""
echo "🔍 Extracting deployed addresses..."

BROADCAST_FILE="$PROJECT_DIR/broadcast/Deploy.s.sol/31337/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
  echo "   ❌ Broadcast file not found: $BROADCAST_FILE"
  exit 1
fi

# Extract addresses: first CREATE is MockUSDT, second is MyContract
USDT_ADDRESS=$(python3 -c "
import json
with open('$BROADCAST_FILE') as f:
    data = json.load(f)
creates = [tx for tx in data['transactions'] if tx['transactionType'] == 'CREATE']
print(creates[0]['contractAddress'])
")

CONTRACT_ADDRESS=$(python3 -c "
import json
with open('$BROADCAST_FILE') as f:
    data = json.load(f)
creates = [tx for tx in data['transactions'] if tx['transactionType'] == 'CREATE']
print(creates[1]['contractAddress'])
")

echo "   MockUSDT     : $USDT_ADDRESS"
echo "   MyContract   : $CONTRACT_ADDRESS"

# ─── Step 4: Update .env files ───────────────────────────────────────────────
echo ""
echo "📝 Updating .env files..."

# Helper: update or add a key=value in a file
update_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # macOS sed requires '' after -i
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# Root .env
update_env "$PROJECT_DIR/.env" "CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
update_env "$PROJECT_DIR/.env" "USDT_ADDRESS" "$USDT_ADDRESS"
echo "   ✅ .env (root)"

# Backend .env
update_env "$PROJECT_DIR/backend/.env" "CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
echo "   ✅ backend/.env"

# Frontend .env
update_env "$PROJECT_DIR/frontend/.env" "VITE_CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
update_env "$PROJECT_DIR/frontend/.env" "VITE_USDT_ADDRESS" "$USDT_ADDRESS"
echo "   ✅ frontend/.env"

# ─── Step 5: Copy ABI ────────────────────────────────────────────────────────
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

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo ""
echo "  MockUSDT     : $USDT_ADDRESS"
echo "  MyContract   : $CONTRACT_ADDRESS"
echo ""
echo "  All .env files and ABI updated automatically."
echo "  Just restart your backend & frontend servers."
echo "═══════════════════════════════════════════════════════════"
