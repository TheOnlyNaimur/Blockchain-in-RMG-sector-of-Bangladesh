// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MyContract.sol";

contract DeployContract is Script {
    function run() external returns (MyContract) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address certifier        = vm.envAddress("CERTIFIER_ADDRESS");
        address qualitychecker   = vm.envAddress("QUALITY_CHECKER_ADDRESS");
        address freightForwarder = vm.envAddress("FREIGHT_FORWARDER_ADDRESS");
        address exportCustoms    = vm.envAddress("EXPORT_CUSTOMS_ADDRESS");
        address importCustoms    = vm.envAddress("IMPORT_CUSTOMS_ADDRESS");
        address complianceChkr   = vm.envAddress("COMPLIANCE_CHECKER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address pyusd = vm.envAddress("USDT_ADDRESS");

        console.log("PYUSD token address:", pyusd);

        // Deploy MyContract with the configured PYUSD address
        MyContract deployedContract = new MyContract(
            certifier,
            qualitychecker,
            freightForwarder,
            exportCustoms,
            importCustoms,
            complianceChkr,
            pyusd
        );

        console.log("MyContract deployed to:", address(deployedContract));
        console.log("  certifier        :", certifier);
        console.log("  qualitychecker   :", qualitychecker);
        console.log("  freightForwarder :", freightForwarder);
        console.log("  exportCustoms    :", exportCustoms);
        console.log("  importCustoms    :", importCustoms);
        console.log("  complianceChecker:", complianceChkr);
        console.log("  usdt             :", pyusd);

        vm.stopBroadcast();

        return deployedContract;
    }
}
