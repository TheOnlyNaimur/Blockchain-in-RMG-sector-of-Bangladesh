// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RMGSupplyChain
 * @dev Smart contract for tracking Ready-Made Garment supply chain in Bangladesh
 * @notice This contract manages the complete lifecycle from raw material to final shipment
 */
contract RMGSupplyChain {
    // Enums
    enum Stage {
        RawMaterial,
        Manufacturing,
        QualityCheck,
        Packaging,
        Shipping,
        Delivered
    }

    enum Role {
        Admin,
        Supplier,
        Manufacturer,
        QualityInspector,
        Logistics,
        Buyer
    }

    // Structs
    struct Product {
        uint256 id;
        string name;
        string description;
        address currentOwner;
        Stage currentStage;
        uint256 timestamp;
        bool exists;
    }

    struct StageHistory {
        Stage stage;
        address handler;
        uint256 timestamp;
        string notes;
    }

    struct User {
        address walletAddress;
        Role role;
        string name;
        bool isActive;
    }

    // State variables
    address public owner;
    uint256 public productCounter;
    
    mapping(uint256 => Product) public products;
    mapping(uint256 => StageHistory[]) public productHistory;
    mapping(address => User) public users;
    mapping(address => bool) public authorizedUsers;

    // Events
    event ProductCreated(uint256 indexed productId, string name, address indexed creator);
    event StageUpdated(uint256 indexed productId, Stage newStage, address indexed handler);
    event OwnershipTransferred(uint256 indexed productId, address indexed from, address indexed to);
    event UserRegistered(address indexed userAddress, Role role);
    event UserStatusChanged(address indexed userAddress, bool isActive);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender], "Not authorized");
        _;
    }

    modifier productExists(uint256 _productId) {
        require(products[_productId].exists, "Product does not exist");
        _;
    }

    modifier hasRole(Role _role) {
        require(users[msg.sender].role == _role, "Insufficient role permissions");
        _;
    }

    constructor() {
        owner = msg.sender;
        users[msg.sender] = User(msg.sender, Role.Admin, "Contract Owner", true);
        authorizedUsers[msg.sender] = true;
    }

    /**
     * @dev Register a new user in the system
     */
    function registerUser(
        address _userAddress,
        Role _role,
        string memory _name
    ) external onlyOwner {
        require(!authorizedUsers[_userAddress], "User already registered");
        
        users[_userAddress] = User(_userAddress, _role, _name, true);
        authorizedUsers[_userAddress] = true;
        
        emit UserRegistered(_userAddress, _role);
    }

    /**
     * @dev Create a new product in the supply chain
     */
    function createProduct(
        string memory _name,
        string memory _description
    ) external onlyAuthorized returns (uint256) {
        productCounter++;
        uint256 newProductId = productCounter;

        products[newProductId] = Product({
            id: newProductId,
            name: _name,
            description: _description,
            currentOwner: msg.sender,
            currentStage: Stage.RawMaterial,
            timestamp: block.timestamp,
            exists: true
        });

        productHistory[newProductId].push(StageHistory({
            stage: Stage.RawMaterial,
            handler: msg.sender,
            timestamp: block.timestamp,
            notes: "Product created"
        }));

        emit ProductCreated(newProductId, _name, msg.sender);
        return newProductId;
    }

    /**
     * @dev Update the stage of a product
     */
    function updateStage(
        uint256 _productId,
        Stage _newStage,
        string memory _notes
    ) external onlyAuthorized productExists(_productId) {
        Product storage product = products[_productId];
        require(uint8(_newStage) > uint8(product.currentStage), "Invalid stage transition");
        
        product.currentStage = _newStage;
        product.timestamp = block.timestamp;

        productHistory[_productId].push(StageHistory({
            stage: _newStage,
            handler: msg.sender,
            timestamp: block.timestamp,
            notes: _notes
        }));

        emit StageUpdated(_productId, _newStage, msg.sender);
    }

    /**
     * @dev Transfer ownership of a product
     */
    function transferOwnership(
        uint256 _productId,
        address _newOwner
    ) external onlyAuthorized productExists(_productId) {
        require(authorizedUsers[_newOwner], "New owner not authorized");
        
        Product storage product = products[_productId];
        address previousOwner = product.currentOwner;
        product.currentOwner = _newOwner;

        emit OwnershipTransferred(_productId, previousOwner, _newOwner);
    }

    /**
     * @dev Get complete history of a product
     */
    function getProductHistory(uint256 _productId) 
        external 
        view 
        productExists(_productId) 
        returns (StageHistory[] memory) 
    {
        return productHistory[_productId];
    }

    /**
     * @dev Get product details
     */
    function getProduct(uint256 _productId) 
        external 
        view 
        productExists(_productId) 
        returns (
            string memory name,
            string memory description,
            address currentOwner,
            Stage currentStage,
            uint256 timestamp
        ) 
    {
        Product memory product = products[_productId];
        return (
            product.name,
            product.description,
            product.currentOwner,
            product.currentStage,
            product.timestamp
        );
    }

    /**
     * @dev Deactivate a user
     */
    function deactivateUser(address _userAddress) external onlyOwner {
        require(authorizedUsers[_userAddress], "User not found");
        users[_userAddress].isActive = false;
        authorizedUsers[_userAddress] = false;
        emit UserStatusChanged(_userAddress, false);
    }
}
