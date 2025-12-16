// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

contract UserRegistration {

    // -------------------------
    // ROLES
    // -------------------------
    enum Role { Buyer, Seller }

    // -------------------------
    // COMMON USER STRUCT
    // -------------------------
    struct CommonUser {
        address userAddress;
        string orgName;
        string country;
        Role role;
        bool isVerified;      // default false
        uint256 registeredAt;
        bool exists;
    }

    // -------------------------
    // BUYER STRUCT
    // -------------------------
    struct BuyerProfile {
        string buyerCode;
        string preferredCurrency;
        string bankName;
    }

    // -------------------------
    // SELLER STRUCT
    // -------------------------
    struct SellerProfile {
        string sellerCode;
        string certificationBody;
        string[] productCategories;
    }

    // -------------------------
    // STORAGE MAPPINGS
    // -------------------------
    mapping(address => CommonUser) private commonUsers;
    mapping(address => BuyerProfile) private buyers;
    mapping(address => SellerProfile) private sellers;

    // -------------------------
    // EVENTS
    // -------------------------
    event UserRegistered(address user, Role role, string orgName, uint256 timestamp);
    event BuyerDetailsAdded(address buyer);
    event SellerDetailsAdded(address seller);

    // -------------------------
    // COMMON REGISTRATION
    // -------------------------
    function registerCommon( Role _role, string memory _orgName, string memory _country) public {

        require(!commonUsers[msg.sender].exists, "User already registered");

        commonUsers[msg.sender] = CommonUser({
            userAddress: msg.sender,
            orgName: _orgName,
            country: _country,
            role: _role,
            isVerified: false,     // initially false
            registeredAt: block.timestamp,
            exists: true
        });

        emit UserRegistered(msg.sender, _role, _orgName, block.timestamp);
    }

    // -------------------------
    // BUYER REGISTRATION DETAILS
    // -------------------------
    function registerBuyerDetails( string memory _buyerCode, string memory _preferredCurrency, string memory _bankName) public {

        require(commonUsers[msg.sender].exists, "Register common profile first");
        require(commonUsers[msg.sender].role == Role.Buyer, "Not a Buyer");

        buyers[msg.sender] = BuyerProfile({
            buyerCode: _buyerCode,
            preferredCurrency: _preferredCurrency,
            bankName: _bankName
        });

        emit BuyerDetailsAdded(msg.sender);
    }

    // -------------------------
    // SELLER REGISTRATION DETAILS
    // -------------------------
    function registerSellerDetails( string memory _sellerCode, string memory _certificationBody, string[] memory _productCategories) public {

        require(commonUsers[msg.sender].exists, "Register common profile first");
        require(commonUsers[msg.sender].role == Role.Seller, "Not a Seller");

        sellers[msg.sender] = SellerProfile({
            sellerCode: _sellerCode,
            certificationBody: _certificationBody,
            productCategories: _productCategories
        });

        emit SellerDetailsAdded(msg.sender);
    }

    // --------------------------------------------------
    // 🔍 VIEW FUNCTIONS — ACCESSED BY OTHER CONTRACTS
    // --------------------------------------------------

    // Returns all common profile fields
    function getCommon(address user) external view returns (CommonUser memory){
        require(commonUsers[user].exists, "User not found");
        return commonUsers[user];
    }

    // Returns buyer-specific fields
    function getBuyer(address user) external view returns (BuyerProfile memory){
        require(commonUsers[user].role == Role.Buyer, "Not a Buyer");
        return buyers[user];
    }

    // Returns seller-specific fields
    function getSeller(address user) external view returns (SellerProfile memory){
        require(commonUsers[user].role == Role.Seller, "Not a Seller");
        return sellers[user];
    }

    // Check if user is verified
    function isVerified(address user) external view returns (bool){
        return commonUsers[user].isVerified;
    }

    // --------------------------------------------------
    // INTERNAL — WILL BE CALLED BY CERTIFIER CONTRACT
    // --------------------------------------------------

    function markVerified(address user) external {
        // NOTE: Access control will be added in CertificationContract
        require(commonUsers[user].exists, "User not found");
        commonUsers[user].isVerified = true;
    }
}
