// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RMGSupplyChain.sol";

contract RMGSupplyChainTest is Test {
    RMGSupplyChain public supplyChain;
    address public owner;
    address public supplier;
    address public manufacturer;
    address public buyer;

    function setUp() public {
        owner = address(this);
        supplier = address(0x1);
        manufacturer = address(0x2);
        buyer = address(0x3);

        supplyChain = new RMGSupplyChain();
    }

    function testOwnerIsSet() public view {
        assertEq(supplyChain.owner(), owner);
    }

    function testRegisterUser() public {
        supplyChain.registerUser(supplier, RMGSupplyChain.Role.Supplier, "Supplier 1");
        
        (address walletAddress, RMGSupplyChain.Role role, string memory name, bool isActive) = 
            supplyChain.users(supplier);
        
        assertEq(walletAddress, supplier);
        assertTrue(uint8(role) == uint8(RMGSupplyChain.Role.Supplier));
        assertEq(name, "Supplier 1");
        assertTrue(isActive);
    }

    function testCreateProduct() public {
        supplyChain.registerUser(supplier, RMGSupplyChain.Role.Supplier, "Supplier 1");
        
        vm.prank(supplier);
        uint256 productId = supplyChain.createProduct("Cotton T-Shirt", "100% cotton, Made in Bangladesh");
        
        assertEq(productId, 1);
        assertEq(supplyChain.productCounter(), 1);
    }

    function testUpdateStage() public {
        supplyChain.registerUser(manufacturer, RMGSupplyChain.Role.Manufacturer, "Manufacturer 1");
        
        vm.prank(manufacturer);
        uint256 productId = supplyChain.createProduct("Denim Jeans", "Blue denim jeans");
        
        vm.prank(manufacturer);
        supplyChain.updateStage(productId, RMGSupplyChain.Stage.Manufacturing, "Started manufacturing");
        
        (,, , RMGSupplyChain.Stage stage, ) = supplyChain.getProduct(productId);
        assertTrue(uint8(stage) == uint8(RMGSupplyChain.Stage.Manufacturing));
    }

    function testFailUnauthorizedAccess() public {
        vm.prank(buyer);
        supplyChain.createProduct("Unauthorized Product", "Should fail");
    }

    function testTransferOwnership() public {
        supplyChain.registerUser(supplier, RMGSupplyChain.Role.Supplier, "Supplier 1");
        supplyChain.registerUser(manufacturer, RMGSupplyChain.Role.Manufacturer, "Manufacturer 1");
        
        vm.prank(supplier);
        uint256 productId = supplyChain.createProduct("T-Shirt", "White T-Shirt");
        
        vm.prank(supplier);
        supplyChain.transferOwnership(productId, manufacturer);
        
        (,, address currentOwner,,) = supplyChain.getProduct(productId);
        assertEq(currentOwner, manufacturer);
    }

    function testGetProductHistory() public {
        supplyChain.registerUser(supplier, RMGSupplyChain.Role.Supplier, "Supplier 1");
        
        vm.prank(supplier);
        uint256 productId = supplyChain.createProduct("Shirt", "Formal Shirt");
        
        vm.prank(supplier);
        supplyChain.updateStage(productId, RMGSupplyChain.Stage.Manufacturing, "In production");
        
        RMGSupplyChain.StageHistory[] memory history = supplyChain.getProductHistory(productId);
        assertEq(history.length, 2);
    }
}
