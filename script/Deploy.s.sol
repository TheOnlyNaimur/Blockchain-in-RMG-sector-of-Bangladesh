// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RMGSupplyChain.sol";

contract DeployRMGSupplyChain is Script {
    function run() external returns (RMGSupplyChain) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        RMGSupplyChain supplyChain = new RMGSupplyChain();
        
        console.log("RMGSupplyChain deployed to:", address(supplyChain));
        
        vm.stopBroadcast();
        
        return supplyChain;
    }
}
