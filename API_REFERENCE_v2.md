# Registration System API Reference

## Overview

This API handles buyer and seller registration on the blockchain. All requests must include signed transactions from the user's wallet.

**Base URL**: `http://localhost:3000`  
**Protocol**: HTTPS (in production)  
**Content-Type**: `application/json`

---

## Buyer Registration

### Endpoint

```
POST /api/buyers/register
```

### Description

Registers a new buyer on the blockchain. The signed transaction must be created by the buyer's wallet and only needs to call the `registrationbuyer()` contract function with the organization name.

### Request

**Content-Type**: `application/json`

```json
{
  "signedTx": "0x02f875823039128477359400850d08e87aa483045d178680a94d687d2d3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f1234",
  "userAddress": "0x71C39A2E70d86D8e7B3A823b8f4eB13c0f96E6B2",
  "name": "Acme Corp Pvt Ltd",
  "license": "LIC-2024-001",
  "contact": "+88-01-XXXXXXX"
}
```

### Request Fields

| Field         | Type   | Required | Description                             | Example       |
| ------------- | ------ | -------- | --------------------------------------- | ------------- |
| `signedTx`    | string | Yes      | Signed transaction hex (starts with 0x) | `0x02f875...` |
| `userAddress` | string | Yes      | Buyer's wallet address                  | `0x71C39A...` |
| `name`        | string | Yes      | Business organization name              | `Acme Corp`   |
| `license`     | string | Yes      | Business license number                 | `LIC-123`     |
| `contact`     | string | Yes      | Contact number                          | `+880123456`  |

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "txHash": "0xabcd1234ef5678901234567890123456789012345678901234567890123456",
  "blockNumber": 12345,
  "message": "Buyer registered successfully."
}
```

### Response Fields

| Field         | Type    | Description                                 |
| ------------- | ------- | ------------------------------------------- |
| `success`     | boolean | Operation successful                        |
| `txHash`      | string  | Blockchain transaction hash                 |
| `blockNumber` | number  | Block number where transaction was included |
| `message`     | string  | Human-readable status message               |

### Error Responses

**Status**: `400 Bad Request`  
_Missing or invalid required fields_

```json
{
  "success": false,
  "error": "signedTx, userAddress, and name are required"
}
```

**Status**: `400 Bad Request`  
_Invalid transaction format_

```json
{
  "success": false,
  "error": "Invalid signed transaction hex format"
}
```

**Status**: `500 Internal Server Error`  
_Transaction execution failed_

```json
{
  "success": false,
  "error": "Transaction failed: insufficient gas"
}
```

### Example Request (cURL)

```bash
curl -X POST http://localhost:3000/api/buyers/register \
  -H "Content-Type: application/json" \
  -d '{
    "signedTx": "0x02f875...",
    "userAddress": "0x71C39A...",
    "name": "Acme Corp",
    "license": "LIC-001",
    "contact": "+880123456"
  }'
```

### Example Request (JavaScript)

```javascript
const response = await fetch("http://localhost:3000/api/buyers/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signedTx: "0x02f875...",
    userAddress: "0x71C39A...",
    name: "Acme Corp",
    license: "LIC-001",
    contact: "+880123456",
  }),
});

const data = await response.json();
console.log(data.txHash); // Transaction hash
```

### Frontend Integration

```javascript
import { useWalletClient } from "wagmi";
import { Interface } from "ethers";

const { data: walletClient } = useWalletClient();
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const handleRegister = async (name, license, contact) => {
  // 1. Create contract interface
  const iface = new Interface([
    "function registrationbuyer(string calldata _name)",
  ]);

  // 2. Encode function call
  const txData = iface.encodeFunctionData("registrationbuyer", [name]);

  // 3. Sign with MetaMask
  const signedTx = await walletClient.signTransaction({
    to: CONTRACT_ADDRESS,
    data: txData,
    value: BigInt(0),
  });

  // 4. Send to backend
  const response = await fetch("http://localhost:3000/api/buyers/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signedTx,
      userAddress: address,
      name,
      license,
      contact,
    }),
  });

  return response.json();
};
```

---

## Seller Registration

### Endpoint

```
POST /api/sellers/register
```

### Description

Registers a new seller on the blockchain. The signed transaction must call the `registrationseller()` contract function with name, TIN (Tax Identification Number), and contact number.

### Request

**Content-Type**: `application/json`

```json
{
  "signedTx": "0x02f875823039128477359400850d08e87aa483045d178680a94d687d2d3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f1234",
  "userAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "name": "Bangladesh Textiles Ltd",
  "tinid": "12345678",
  "number": "8801234567890"
}
```

### Request Fields

| Field         | Type   | Required | Description              | Example         |
| ------------- | ------ | -------- | ------------------------ | --------------- |
| `signedTx`    | string | Yes      | Signed transaction hex   | `0x02f875...`   |
| `userAddress` | string | Yes      | Seller's wallet address  | `0x70997970...` |
| `name`        | string | Yes      | Business name            | `Textiles Ltd`  |
| `tinid`       | string | Yes      | Tax ID (numeric)         | `12345678`      |
| `number`      | string | Yes      | Contact number (numeric) | `8801234567`    |

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "txHash": "0xabcd1234ef5678901234567890123456789012345678901234567890123456",
  "blockNumber": 12346,
  "message": "Seller registered successfully. Awaiting certifier approval."
}
```

### Error Responses

**Status**: `400 Bad Request`  
_Missing required fields_

```json
{
  "success": false,
  "error": "signedTx, userAddress, name, tinid and number are required"
}
```

**Status**: `400 Bad Request`  
_Invalid numeric field_

```json
{
  "success": false,
  "error": "tinid and number must be numeric strings"
}
```

**Status**: `500 Internal Server Error`  
_Blockchain error_

```json
{
  "success": false,
  "error": "Transaction failed: Account already registered"
}
```

### Example Request (cURL)

```bash
curl -X POST http://localhost:3000/api/sellers/register \
  -H "Content-Type: application/json" \
  -d '{
    "signedTx": "0x02f875...",
    "userAddress": "0x70997970...",
    "name": "Textiles Ltd",
    "tinid": "12345678",
    "number": "8801234567"
  }'
```

### Frontend Integration

```javascript
const handleSellerRegister = async (name, tinid, number) => {
  // 1. Create contract interface
  const iface = new Interface([
    "function registrationseller(string calldata _name, uint64 _tinid, uint64 _number)",
  ]);

  // 2. Encode function call
  const txData = iface.encodeFunctionData("registrationseller", [
    name,
    BigInt(tinid),
    BigInt(number),
  ]);

  // 3. Sign with MetaMask
  const signedTx = await walletClient.signTransaction({
    to: CONTRACT_ADDRESS,
    data: txData,
    value: BigInt(0),
  });

  // 4. Send to backend
  const response = await fetch("http://localhost:3000/api/sellers/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signedTx,
      userAddress: address,
      name,
      tinid,
      number,
    }),
  });

  return response.json();
};
```

---

## Status Codes

| Code | Meaning               | Typical Cause                               |
| ---- | --------------------- | ------------------------------------------- |
| 200  | OK                    | Successful registration                     |
| 400  | Bad Request           | Missing/invalid fields, wrong data type     |
| 500  | Internal Server Error | Blockchain error, RPC unavailable, DB error |

---

## Common Error Messages

| Error                                            | Cause                               | Solution                                     |
| ------------------------------------------------ | ----------------------------------- | -------------------------------------------- |
| `signedTx, userAddress, and name are required`   | Missing field in request            | Include all required fields                  |
| `Invalid signed transaction hex format`          | signedTx doesn't start with 0x      | Verify MetaMask signature                    |
| `Transaction failed: insufficient gas`           | Not enough gas for transaction      | Increase gas limit                           |
| `Transaction failed: Account already registered` | Address already registered on-chain | Use different wallet or address              |
| `Invalid contract address`                       | CONTRACT_ADDRESS env var wrong      | Verify contract deployed and address correct |
| `TypeError: fetch failed`                        | Backend not running or wrong host   | Verify backend running on correct port       |

---

## Rate Limiting

Currently no rate limiting. In production, should implement:

- Per-address limit: 100 registrations per day
- Per-IP limit: 1000 requests per hour
- Per-subnet limits to prevent abuse

---

## CORS

**Frontend**: http://localhost:3000 (add to whitelist)  
**Production**: Configure allowed origins in backend

```javascript
// backend/index.js
const cors = require("cors");
app.use(
  cors({
    origin: ["https://mytradingapp.com"],
    credentials: true,
  }),
);
```

---

## Request Validation

All requests are validated for:

1. **Required fields present**: All must exist
2. **Correct data types**: String, number as expected
3. **Format validation**:
   - `signedTx`: Hex string starting with 0x
   - `userAddress`: Valid Ethereum address (0x...)
   - `tinid`/`number`: Numeric strings (convertible to uint64)
4. **Length validation**:
   - `name`: Not empty, max 256 chars
   - `license`: Not empty, max 100 chars
   - `contact`: Not empty, max 20 chars

---

## Database Records

After successful registration, these records are stored:

**Buyer Record**

```javascript
{
  eventType: "BUYER_REGISTERED",
  buyerAddress: "0x71C39A...",
  name: "Acme Corp",
  license: "LIC-001",
  contact: "+880123456",
  txHash: "0xabcd1234...",
  blockNumber: 12345,
  timestamp: 1679123456,
}
```

**Seller Record**

```javascript
{
  eventType: "SELLER_REGISTERED",
  sellerAddress: "0x70997970...",
  name: "Textiles Ltd",
  tinid: "12345678",
  number: "8801234567",
  txHash: "0xabcd1234...",
  blockNumber: 12346,
  timestamp: 1679123457,
}
```

---

## Security Considerations

1. **Signature Verification**: Signature cryptographically proves transaction came from user's wallet
2. **No Private Key Exposure**: Backend never receives private key
3. **Transaction Data Immutable**: Signed data cannot be modified
4. **Nonce Protection**: Blockchain prevents replay attacks
5. **HTTPS Required**: In production, enforce HTTPS for all API calls

---

## Testing

### Postman Collection

```json
{
  "info": { "name": "Registration API" },
  "item": [
    {
      "name": "Register Buyer",
      "request": {
        "method": "POST",
        "url": { "raw": "http://localhost:3000/api/buyers/register" },
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{...}"
        }
      }
    }
  ]
}
```

---

## Changelog

### v2.0 (Current - March 23, 2026)

- Changed from backend signing to frontend MetaMask signing
- Removed privateKey from request body
- Added userAddress field
- Updated request/response formats
- Improved security model

### v1.0 (Deprecated - Previous version)

- Backend signs transactions
- Called with privateKey in request
- Caused address mismatch issues

---

## Support

- **Issue with signature**: Ensure MetaMask is connected and wallet unlocked
- **Backend not responding**: Verify server running on correct port
- **Transaction fails**: Check contract address in .env and Anvil running
- **Database error**: Verify MongoDB connection string in .env

---

**API Version**: 2.0  
**Last Updated**: 2026-03-23
