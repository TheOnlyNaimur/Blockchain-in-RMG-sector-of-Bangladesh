# Stack Overflow Error Analysis

## Error Description

```
Compliance check failed: could not decode result data 
(value="0x", method="isSellerCompliant", code=BAD_DATA)

RPC request failed:
Error: Internal error: EVM error StackOverflow
```

## Root Cause Candidates

### 1. **ComplianceCert Struct Storage Layout Issue** (MOST LIKELY)

The struct definition in MyContract.sol (line ~180):

```solidity
struct ComplianceCert {
    ComplianceType certType;   // uint8  - 1 byte
    address        seller;     // 20 bytes
    bytes32        certDocHash;// 32 bytes
    uint40         issuedAt;   // 5 bytes
    uint40         expiresAt;  // 5 bytes
    bool           isValid;    // 1 byte  
}
```

**Problem**: The packing order creates misalignment:
- Slot 0: certType (1 byte) + seller (20 bytes) = 21 bytes used, 11 bytes padding
- Slot 1: certDocHash (32 bytes) = 32 bytes used
- Slot 2: issuedAt (5 bytes) + expiresAt (5 bytes) + isValid (1 byte) = 11 bytes used

**Better packing order**:
```solidity
struct ComplianceCert {
    address        seller;      // 20 bytes - pack with uint40s
    bytes32        certDocHash; // 32 bytes - separate slot
    uint40         expiresAt;   // 5 bytes
    uint40         issuedAt;    // 5 bytes  
    ComplianceType certType;    // uint8 - 1 byte
    bool           isValid;     // 1 byte
}
```

### 2. **Nested Mapping Access Issue**

The mapping access in `isSellerCompliant`:
```solidity
mapping(address => mapping(ComplianceType => ComplianceCert)) public complianceCerts;
```

When accessing: `complianceCerts[_seller][ComplianceType(i)]`

If the storage slots are corrupted or misaligned, the nested mapping access could cause issues.

### 3. **Function Selector Collision**

The error shows a selector `0x95d89b41` in some calls. This is the selector for ERC20 `symbol()`. This might indicate:
- Wrong ABI being used
- Contract code corruption
- USDT being called instead of MyContract

### 4. **Uninitialized ComplianceCert Reading**

When reading a ComplianceCert that was never initialized:
```solidity
ComplianceCert storage cert = complianceCerts[_seller][ComplianceType(i)];
if (!cert.isValid || cert.expiresAt <= uint40(block.timestamp)) {
    return false;
}
```

The uninitialized cert has all zeros, so `cert.isValid` is `false`, which is correct. But if there's a storage alignment issue, reading the wrong slots could cause problems.

## Where Stack Overflow Occurs

**Call Path**:
1. `POST /api/orders` (orderController.js line 41)
2. Calls: `readContract.isSellerCompliant(userAddress)`
3. Anvil executes the function bytecode
4. **STACK OVERFLOW in Anvil VM**

## Affected Endpoints

- `POST /api/orders` - checks compliance before creating order
- `GET /api/buyers/:sellerAddress` - checks compliance status
- `POST /api/batches` - on-chain check with `batchCreate()`

## Solution

**Fix the struct storage packing** in MyContract.sol:

```solidity
struct ComplianceCert {
    bytes32        certDocHash;   // 32 bytes - slot 0
    address        seller;        // 20 bytes - slot 1 (can fit 20+12 padding)
    uint40         expiresAt;     // 5 bytes  - slot 1
    uint40         issuedAt;      // 5 bytes  - slot 1  
    ComplianceType certType;      // 1 byte   - slot 2
    bool           isValid;       // 1 byte   - slot 2
}
```

Or reorder in source to be naturally packed by Solidity:

```solidity
struct ComplianceCert {
    bytes32        certDocHash;   // 32 bytes
    address        seller;        // 20 bytes
    uint40         expiresAt;     // 5 bytes
    uint40         issuedAt;      // 5 bytes (fits in slot with address)
    uint8          certType;      // 1 byte
    bool           isValid;       // 1 byte (can fit with uint8)
}
```

## Testing

After recompilation:
```bash
# Test the fixed function
forge test -v --match "isSellerCompliant"

# Test via API
curl -X GET http://localhost:3000/api/buyers/{address}
```

## Files to Modify

- `src/MyContract.sol` - Reorder ComplianceCert struct fields
- Re-compile and re-deploy contract
- Update `backend/abi/MyContract.json` with new ABI

