# RMG Caliper Starter

This folder is a starter Caliper workspace tailored to the contract in this repo.

What is inside:
- `workload/` contains 8 workload scripts.
- `networkconfig.yaml` points Caliper at your Anvil RPC and deployed contract.
- `benchmark.yaml` runs the workloads in a dependency-safe order.

How these scripts are designed:
- They use deterministic synthetic seller and buyer addresses.
- Each round uses the same case index formula, so later rounds can find the records created earlier.
- Some scripts bundle a small sequence of contract calls because this contract has workflow dependencies.

Expected round order:
1. `seller_register.js`
2. `certifier_approve.js`
3. `compliance_issue.js` with `certType: 0`
4. `compliance_issue.js` with `certType: 1`
5. `compliance_issue.js` with `certType: 2`
6. `compliance_issue.js` with `certType: 3`
7. `buyer_order_setup.js`
8. `seller_batch_create.js`
9. `quality_check.js`
10. `freight_docs_flow.js`
11. `customs_clearance.js`

Before you run this:
- Update `networkconfig.yaml` with your deployed contract address and ABI path.
- Fill in the role addresses and private keys in `benchmark.yaml`.
- Keep the same worker count and transaction count across dependent rounds if you want the synthetic IDs to line up cleanly.

Run example:

```bash
npx caliper launch manager ^
  --caliper-workspace .\caliper ^
  --caliper-networkconfig .\caliper\networkconfig.yaml ^
  --caliper-benchconfig .\caliper\benchmark.yaml
```

Notes:
- These workload files assume the Ethereum connector accepts per-request `fromAddress` and `privateKey` fields. If your Caliper version does not, keep the scripts and split the benchmark into role-specific runs or role-specific network configs.
- The contract functions in this repo allow synthetic `_seller` and `_buyer` addresses to be passed as parameters, so a benchmark can create many logical actors without needing 100 funded Anvil wallets up front.
