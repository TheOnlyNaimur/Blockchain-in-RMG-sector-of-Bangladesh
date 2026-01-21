// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {


    // constructor (address _add){
    //     certifier = _add;
    // }

    address  certifier = 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2; //here i define it in default who gives company approval also green factory approval;
    address  qualitychecker = 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db ; //quality check by thirdparty after batch production
    address  freightForwarder = 0x03C6FcED478cBbC9a4FAB34eF9f40767739D1Ff7;
    address  exportCustoms = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; 
    address  importCustoms = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;


    enum applicationstatus { Pending, approved, rejected }

    struct seller {
        string name;
        uint256 tinid;
        uint256 number;
        address add;
        applicationstatus status;
        uint256 batchid;
    }

   

    mapping(address => seller) sellers;
    

    uint256  orderCount; // Sequential ID counter

    // Events for your Backend to record records off-chain
    event SellerRegistered(address indexed seller, string name);
    event OrderCreated(uint256 indexed orderId, address indexed seller, address indexed buyer);
    event OrderAccepted(uint256 indexed orderId);

    modifier certifierhouse() {
        require(certifier == msg.sender, "Unauthorized: Only certifier can access");
        _;
    }

    // Logic: Only the buyer assigned to a specific order can approve it
    modifier onlyOrderBuyer(uint256 _orderId) {
        require(orders[_orderId].buyeradd == msg.sender, "Only assigned buyer can approve this");
        _;
    }

    modifier onlyRegisteredSeller() {
        require(sellers[msg.sender].add != address(0), "Seller must be registered");
        require(sellers[msg.sender].status == applicationstatus.approved, "Seller must be approved");
        _;
    }

    modifier onlyRegisteredBuyer() {
        require(buyers[msg.sender].add != address(0), "Buyer must be registered");
        _;
    }

//sller or Menufactureer get certification from certification house



//seller created
    function registrationseller(string memory _name, uint256 _tinid, uint256 _number) public {
        require(sellers[msg.sender].add == address(0), "Seller already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_tinid > 0, "TIN ID must be valid");
        require(_number > 0, "Number must be valid");
        
        sellers[msg.sender] = seller({
            name: _name,
            tinid: _tinid,
            number: _number,
            add: msg.sender,
            status: applicationstatus.Pending,
            batchid:0
        });
        emit SellerRegistered(msg.sender, _name);
    }

    function approveseller(address _address, uint assign) public certifierhouse {
        require(sellers[_address].add != address(0), "seller is not registered");
        require(sellers[_address].status == applicationstatus.Pending, "Seller already processed");
        require(assign == 1 || assign == 2, "Invalid assignment value: use 1 for approve, 2 for reject");
        
        sellers[_address].status = (assign == 1) ? applicationstatus.approved : applicationstatus.rejected;
    }


//buyer created

    struct buyer {
            string name;
            address add;
        }

    mapping(address => buyer) buyers;

    function registrationbuyer(string memory _name) public {
        require(buyers[msg.sender].add == address(0), "Buyer already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        buyers[msg.sender] = buyer({
            name: _name,
            add: msg.sender
        });
    }

//deal part
    struct order {
        uint256 orderid;
        string details;
        address buyeradd;
        address selleradd;
        uint256 status; // 0: Created, 1: Accepted
        uint256 delivered;
    }

     mapping(uint256 => order) orders;
    // A seller creates a deal/order for a specific buyer
    function createdealforbuyers(string memory _details, address _buyer_add) public onlyRegisteredSeller returns(uint256) {

        require(buyers[_buyer_add].add != address(0), "Buyer must be registered");
        require(_buyer_add != msg.sender, "Seller cannot create order for themselves");
        require(bytes(_details).length > 0, "Order details cannot be empty");

        orderCount++; // Increment counter for unique ID
        
        orders[orderCount] = order({
            orderid: orderCount,
            details: _details,
            selleradd: msg.sender,
            buyeradd: _buyer_add,
            status: 0,
            delivered:0
        });

        emit OrderCreated(orderCount, msg.sender, _buyer_add);
        return orderCount;
    }

    // Buyer accepts the specific order using its ID
    function acceptorder(uint256 _orderId) public onlyRegisteredBuyer onlyOrderBuyer(_orderId) {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        require(orders[_orderId].status == 0, "Order already accepted or invalid");
        
        orders[_orderId].status = 1;
        
        // FIXED: msg.sender is the Buyer; we must increment batchid for the Seller associated with this order
        address sellerAddr = orders[_orderId].selleradd;
        sellers[sellerAddr].batchid++;
        
        emit OrderAccepted(_orderId);
    }


//production part
    struct Batch {
        uint256 batchId;
        uint256 orderId;
        string productInfo;
        uint256 timestamp;
        bool isCreated;
        bool qualityApproved; // New field for verification status
    }

    mapping(uint256 => Batch) batches;
    uint256 batchCount;

    event BatchCreated(uint256 indexed batchId, uint256 indexed orderId, string productInfo);
    event BatchQualityUpdated(uint256 indexed batchId, bool status);

    // Manufacturer records batch creation linked to POID
    function batchCreate(uint256 _orderId, string memory _productInfo) public onlyRegisteredSeller {
        require(_orderId > 0 && _orderId <= orderCount, "Invalid order ID");
        require(orders[_orderId].selleradd == msg.sender, "Only the assigned seller can start production");
        require(orders[_orderId].status == 1, "Order must be accepted before production");
        require(bytes(_productInfo).length > 0, "Product info cannot be empty");

        batchCount++;
        batches[batchCount] = Batch({
            batchId: batchCount,
            orderId: _orderId,
            productInfo: _productInfo,
            timestamp: block.timestamp,
            isCreated: true,
            qualityApproved: false
        });

        emit BatchCreated(batchCount, _orderId, _productInfo);
    }

    // Quality check after production 
    function bqualitycheck(uint256 _batchId, bool _status) public {
        require(msg.sender == qualitychecker, "Unauthorized: Only Quality Checker can verify batch");
        require(_batchId > 0 && _batchId <= batchCount, "Invalid batch ID");
        require(batches[_batchId].isCreated, "Batch does not exist");
        
        batches[_batchId].qualityApproved = _status;
        emit BatchQualityUpdated(_batchId, _status);
    }


    //i am confuced here frigtforword will be consider ase shipment or currier agent?
    struct Shipment {
        uint256 Orderid;
        uint256 shipId;
        uint256 batchId;
        address freightForwarder;
        string docHash; 
        bool isDocUploaded;
        string status;
    }

    mapping(uint256 => Shipment) public shipments;
    uint256 public shipCount;

    event ShipmentRequested(uint256 indexed shipId, uint256 indexed batchId, address freightForwarder);
    event DocumentUploaded(uint256 indexed shipId, string docHash);
    event CustomsCleared(uint256 indexed shipId, string authorityType);

    
    function shipReq(uint256 _batchId, address _ff) public {
        require(batches[_batchId].qualityApproved == true, "Quality must be approved first");
        uint256 orderId = batches[_batchId].orderId;
        require(orders[orderId].selleradd == msg.sender, "Only the seller can request shipment");

        shipCount++;
        shipments[shipCount] = Shipment({
            Orderid: orderId,
            shipId: shipCount,
            batchId: _batchId,
            freightForwarder: _ff,
            docHash: "",
            isDocUploaded: false,
            status: "ReadyForExport"
        });
        emit ShipmentRequested(shipCount, _batchId, _ff);
    }


    function docUpload(uint256 _shipId, string memory _docHash) public {
        require(msg.sender == shipments[_shipId].freightForwarder, "Only assigned FF can upload docs");
        shipments[_shipId].docHash = _docHash;
        shipments[_shipId].isDocUploaded = true;
        emit DocumentUploaded(_shipId, _docHash);
    }


    function expVerify(uint256 _shipId) public {
        require(msg.sender == exportCustoms, "Unauthorized: Only Export Customs");
        require(shipments[_shipId].isDocUploaded, "Documentation missing");
        
        shipments[_shipId].status = "ExportCleared";
        emit CustomsCleared(_shipId, "Export");
    }

    // 
    function impVerify(uint256 _shipId) public {
        require(msg.sender == importCustoms, "Unauthorized: Only Import Customs");
        // Logic: Cannot clear import if export hasn't happened 
        require(keccak256(abi.encodePacked(shipments[_shipId].status)) == keccak256(abi.encodePacked("ExportCleared")), "Must clear export first");
        
        shipments[_shipId].status = "ImportCleared";
       
        emit CustomsCleared(_shipId, "Import");
        uint256 orderId = shipments[_shipId].Orderid;
        escrow(orderId, _shipId);
        
    }


    function escrow(uint256 orderno, uint256 _shipId) private {

       require(keccak256(abi.encodePacked(shipments[_shipId].status)) == keccak256(abi.encodePacked("ImportCleared")), "Must clear export first");

        orders[orderno].delivered=1;

    }



    //here we can use 2 trypes logic one from buyer end we can release the fund to the buyer manually or with logic update we can autoamtic release the fund
    //we can set a timer like 7 days after it will automatic release
    function  pay(address payable _seller, uint _amount) public payable {
        require(msg.sender == orders[orderCount].buyeradd, "Only buyer can pay");
        require(orders[orderCount].delivered==1, "Order not delivered");
        require(msg.value >= _amount, "Insufficient payment");
        
        _seller.transfer(_amount);

    }


    // function transferfund()

    
  
}





    
//what are not considered on this contract
    //  multisignature macanism
    //  Usdt transaction rather then ether
    //  multi role access
    //  sharedvariable access
    //  data ecryption
    //  retrive data by emit event record here i am not using array for store address data 
    //  signature based approval
    //  gasfee optimization
    //  optimized fromat
    //  true / false overhead
