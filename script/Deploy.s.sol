// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/MyContract.sol";

contract DeployContract is Script {
    function run() external returns (MyContract) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address testBuyer        = vm.envAddress("TEST_BUYER_ADDRESS");
        address certifier        = vm.envAddress("CERTIFIER_ADDRESS");
        address qualitychecker   = vm.envAddress("QUALITY_CHECKER_ADDRESS");
        address freightForwarder = vm.envAddress("FREIGHT_FORWARDER_ADDRESS");
        address exportCustoms    = vm.envAddress("EXPORT_CUSTOMS_ADDRESS");
        address importCustoms    = vm.envAddress("IMPORT_CUSTOMS_ADDRESS");
        address complianceChkr   = vm.envAddress("COMPLIANCE_CHECKER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Calculate deployer address from private key
        address deployerAddress = vm.addr(deployerPrivateKey);

        // Step 1: Deploy MockUSDT
        MockUSDT mockUsdt = new MockUSDT();
        
        // Split 1,000,000 USDT 50-50 between deployer and test buyer
        uint256 totalMint = 1_000_000 * 10**18;
        mockUsdt.mint(deployerAddress, totalMint / 2);
        mockUsdt.mint(testBuyer, totalMint / 2);

        console.log("MockUSDT deployed to:", address(mockUsdt));
        console.log("  Minted to Deployer :", totalMint / 2);
        console.log("  Minted to Buyer    :", totalMint / 2);

        // Step 2: Deploy MyContract with MockUSDT address
        MyContract deployedContract = new MyContract(
            certifier,
            qualitychecker,
            freightForwarder,
            exportCustoms,
            importCustoms,
            complianceChkr,
            address(mockUsdt)
        );

        console.log("MyContract deployed to:", address(deployedContract));
        console.log("  certifier        :", certifier);
        console.log("  qualitychecker   :", qualitychecker);
        console.log("  freightForwarder :", freightForwarder);
        console.log("  exportCustoms    :", exportCustoms);
        console.log("  importCustoms    :", importCustoms);
        console.log("  complianceChecker:", complianceChkr);
        console.log("  usdt             :", address(mockUsdt));

        // Approve backend (deployer) tokens to be spent by the contract to simulate escrow bridging
        mockUsdt.approve(address(deployedContract), type(uint256).max);

        vm.stopBroadcast();

        return deployedContract;
    }
}
