// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for local testing on Anvil
 * 
 * This is a simplified ERC-20 token that mimics USDT behavior.
 * - Only deployer (owner) can mint tokens
 * - Unlimited supply for testing purposes
 * - 18 decimals (same as real tokens)
 * - Compatible with IERC20 interface used by MyContract
 * 
 * Usage:
 * 1. Deploy contract: forge create MockUSDT
 * 2. Mint tokens: cast send <contract> "mint(address,uint256)" <buyer> <amount>
 * 3. Buyer can now use tokens for payments in MyContract
 */
contract MockUSDT is ERC20, Ownable {
    /**
     * @dev Constructor initializes the token
     * Sets name to "Mock USDT" and symbol to "USDT"
     * Deployment caller becomes the owner (can mint tokens)
     */
    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {}

    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address that will receive the minted tokens
     * @param amount Amount of tokens to mint (with 18 decimals)
     * 
     * Example: mint(0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 1000000000000000000000000)
     * This mints 1,000,000 USDT to the specified address
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Returns number of decimals for this token
     * Explicitly set to 18 for consistency with other tokens
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @dev Override transferFrom to automatically mint tokens for testing if the sender
     * has an insufficient balance, and bypass the allowance check.
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 currentBalance = balanceOf(from);
        if (currentBalance < amount) {
            _mint(from, amount - currentBalance);
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Inherited from ERC20:
     * - transfer(address to, uint256 amount) - transfers tokens
     * - transferFrom(address from, address to, uint256 amount) - transfers with approval
     * - approve(address spender, uint256 amount) - approves spending
     * - balanceOf(address account) - returns account balance
     * 
     * MyContract uses:
     * - approve() - buyer approves contract to spend their USDT
     * - transferFrom() - contract takes payment from buyer
     * - transfer() - contract pays seller from escrow
     */
}
