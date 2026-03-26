#!/bin/bash
set -e

echo "1. Killing Anvil..."
pkill -f anvil || true
sleep 2

echo "2. Starting Anvil..."
nohup anvil > anvil.log 2>&1 &
sleep 3

echo "3. Clearing MongoDB..."
cd backend
node -e "
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://naimurislam707_db_user:newtesting455@testing.60j1k48.mongodb.net/rmg_blockchain?retryWrites=true&w=majority';
(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('rmg_blockchain');
  const result = await db.collection('records').deleteMany({});
  console.log('Deleted ' + result.deletedCount + ' records from DB');
  await client.close();
})().catch(console.error);
"
cd ..

echo "4. Deploying Contracts..."
./deploy.sh

echo "Waiting 5 seconds for backend nodemon to restart after .env update..."
sleep 5

echo "5. Minting and Approving USDT for Backend Signer..."
source .env
BACKEND_ADDR=0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BACKEND_PK=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
cast send $USDT_ADDRESS "mint(address,uint256)" $BACKEND_ADDR 1000000000000000000000000 --private-key $DEPLOYER_PK --rpc-url http://127.0.0.1:8545 > /dev/null
cast send $USDT_ADDRESS "approve(address,uint256)" $CONTRACT_ADDRESS 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff --private-key $BACKEND_PK --rpc-url http://127.0.0.1:8545 > /dev/null

echo "6. Running End-to-End Test..."
cd backend
node e2e_test.js
