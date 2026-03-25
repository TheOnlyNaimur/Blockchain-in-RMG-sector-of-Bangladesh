// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ─── Minimal ERC-20 interface ─────────────────────────────────────────────────
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MyContract {

    // ─── Roles ────────────────────────────────────────────────────────────────
    address immutable certifier;
    address immutable qualitychecker;
    address immutable freightForwarderRole;
    address immutable exportCustoms;
    address immutable importCustoms;

    // ─── USDT Token ───────────────────────────────────────────────────────────
    // ERC-20 token address (6 decimals) - passed at deployment
    IERC20 immutable usdt;

    // ─── Constructor ──────────────────────────────────────────────────────────
    // @param _certifier Address with certifier role
    // @param _qualitychecker Address with quality checker role
    // @param _freightForwarder Address with freight forwarder role
    // @param _exportCustoms Address with export customs role
    // @param _importCustoms Address with import customs role
    // @param _usdt Address of the USDT token contract (6 decimals)
    constructor(
        address _certifier,
        address _qualitychecker,
        address _freightForwarder,
        address _exportCustoms,
        address _importCustoms,
        address _usdt
    ) {
        require(_certifier != address(0), "Invalid certifier address");
        require(_qualitychecker != address(0), "Invalid qualitychecker address");
        require(_freightForwarder != address(0), "Invalid freightForwarder address");
        require(_exportCustoms != address(0), "Invalid exportCustoms address");
        require(_importCustoms != address(0), "Invalid importCustoms address");
        require(_usdt != address(0), "Invalid USDT address");

        certifier            = _certifier;
        qualitychecker       = _qualitychecker;
        freightForwarderRole = _freightForwarder;
        exportCustoms        = _exportCustoms;
        importCustoms        = _importCustoms;
        usdt                 = IERC20(_usdt);
    }

    // ─── Custom Errors ────────────────────────────────────────────────────────
    error Unauthorized();
    error AlreadyRegistered();
    error NotRegistered();
    error NotApproved();
    error InvalidInput();
    error InvalidStatus();
    error InvalidOrder();
    error InsufficientPayment();
    error TransferFailed();

    // ─── Enums ────────────────────────────────────────────────────────────────
    enum ApplicationStatus { Pending, Approved, Rejected }
    enum ShipStatus { ReadyForExport, ExportCleared, ImportCleared }

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct Seller {
        address add;
        ApplicationStatus status;
        uint56  batchid;
        uint64  tinid;
        uint64  number;
        bytes32 certHash;
        string  name;
    }

    mapping(address => Seller) sellers;

    event SellerRegistered(address indexed seller, string name);

    modifier certifierOnly() {
        if (msg.sender != certifier) revert Unauthorized();
        _;
    }

    modifier onlyRegisteredSeller() {
        if (sellers[msg.sender].add == address(0)) revert NotRegistered();
        if (sellers[msg.sender].status != ApplicationStatus.Approved) revert NotApproved();
        _;
    }

    modifier onlyRegisteredBuyer() {
        if (buyers[msg.sender].add == address(0)) revert NotRegistered();
        _;
    }

    function registrationseller(string calldata _name, uint64 _tinid, uint64 _number) external {
        if (sellers[msg.sender].add != address(0)) revert AlreadyRegistered();
        if (bytes(_name).length == 0 || _tinid == 0 || _number == 0) revert InvalidInput();

        sellers[msg.sender] = Seller({
            name:     _name,
            tinid:    _tinid,
            number:   _number,
            add:      msg.sender,
            status:   ApplicationStatus.Pending,
            batchid:  0,
            certHash: bytes32(0)
        });
        emit SellerRegistered(msg.sender, _name);
    }

    function approveseller(address _address, uint8 assign) external certifierOnly {
        Seller storage s = sellers[_address];
        if (s.add == address(0)) revert NotRegistered();
        if (s.status != ApplicationStatus.Pending) revert InvalidStatus();
        if (assign != 1 && assign != 2) revert InvalidInput();

        if (assign == 1) {
            s.status = ApplicationStatus.Approved;
            s.certHash = keccak256(
                abi.encodePacked(_address, s.tinid, s.number, s.name, block.timestamp)
            );
        } else {
            s.status = ApplicationStatus.Rejected;
        }
    }

    // ─── Buyer ────────────────────────────────────────────────────────────────
    struct Buyer {
        address add;
        string  name;
    }

    mapping(address => Buyer) buyers;

    function registrationbuyer(string calldata _name) external {
        if (buyers[msg.sender].add != address(0)) revert AlreadyRegistered();
        if (bytes(_name).length == 0) revert InvalidInput();

        buyers[msg.sender] = Buyer({ name: _name, add: msg.sender });
    }

    // ─── Orders ───────────────────────────────────────────────────────────────
    struct Order {
        address buyeradd;
        uint8   status;
        uint8   delivered;
        address selleradd;
        uint128 orderid;
        uint128 escrowed;   // USDT amount locked (in USDT's 6-decimal units)
        string  details;
    }

    mapping(uint128 => Order) orders;
    uint128 orderCount;

    event OrderCreated(uint128 indexed orderId, address indexed seller, address indexed buyer);
    event OrderAccepted(uint128 indexed orderId, uint128 amount);
    event PaymentReleased(uint128 indexed orderId, address seller, uint128 amount);

    modifier onlyOrderBuyer(uint128 _orderId) {
        if (orders[_orderId].buyeradd != msg.sender) revert Unauthorized();
        _;
    }

    function createdealforbuyers(string calldata _details, address _buyer_add)
        external
        onlyRegisteredSeller
        returns (uint128)
    {
        if (buyers[_buyer_add].add == address(0)) revert NotRegistered();
        if (_buyer_add == msg.sender) revert InvalidInput();
        if (bytes(_details).length == 0) revert InvalidInput();

        uint128 newId = ++orderCount;

        orders[newId] = Order({
            orderid:   newId,
            details:   _details,
            selleradd: msg.sender,
            buyeradd:  _buyer_add,
            status:    0,
            delivered: 0,
            escrowed:  0
        });

        emit OrderCreated(newId, msg.sender, _buyer_add);
        return newId;
    }

    // ─── CHANGED: no longer payable; buyer passes USDT amount explicitly.
    //             Buyer must call usdt.approve(contractAddress, _amount) first.
    function acceptorder(uint128 _orderId, uint128 _amount)
        external
        onlyRegisteredBuyer
        onlyOrderBuyer(_orderId)
    {
        if (_orderId == 0 || _orderId > orderCount) revert InvalidOrder();

        Order storage o = orders[_orderId];
        if (o.status != 0)  revert InvalidStatus();
        if (_amount == 0)   revert InsufficientPayment();

        // Pull USDT from buyer wallet into this contract
        bool ok = usdt.transferFrom(msg.sender, address(this), _amount);
        if (!ok) revert TransferFailed();

        o.status   = 1;
        o.escrowed = _amount;

        sellers[o.selleradd].batchid++;

        emit OrderAccepted(_orderId, _amount);
    }

    // ─── Batch ────────────────────────────────────────────────────────────────
    struct Batch {
        uint128 batchId;
        uint128 orderId;
        uint40  timestamp;
        bool    isCreated;
        bool    qualityApproved;
        string  productInfo;
    }

    mapping(uint128 => Batch) batches;
    uint128 batchCount;

    event BatchCreated(uint128 indexed batchId, uint128 indexed orderId, string productInfo);
    event BatchQualityUpdated(uint128 indexed batchId, bool status);

    function batchCreate(uint128 _orderId, string calldata _productInfo) external onlyRegisteredSeller {
        if (_orderId == 0 || _orderId > orderCount) revert InvalidOrder();
        if (orders[_orderId].selleradd != msg.sender) revert Unauthorized();
        if (orders[_orderId].status != 1) revert InvalidStatus();
        if (bytes(_productInfo).length == 0) revert InvalidInput();

        uint128 bid = ++batchCount;
        batches[bid] = Batch({
            batchId:         bid,
            orderId:         _orderId,
            productInfo:     _productInfo,
            timestamp:       uint40(block.timestamp),
            isCreated:       true,
            qualityApproved: false
        });

        emit BatchCreated(bid, _orderId, _productInfo);
    }

    function bqualitycheck(uint128 _batchId, bool _status) external {
        if (msg.sender != qualitychecker) revert Unauthorized();
        if (_batchId == 0 || _batchId > batchCount) revert InvalidOrder();
        if (!batches[_batchId].isCreated) revert InvalidInput();

        batches[_batchId].qualityApproved = _status;
        emit BatchQualityUpdated(_batchId, _status);
    }

    // ─── Shipment ─────────────────────────────────────────────────────────────
    struct Shipment {
        uint128    Orderid;
        uint128    shipId;
        uint128    batchId;
        ShipStatus status;
        bool       isDocUploaded;
        address    freightForwarder;
        bytes32    docHash;
    }

    mapping(uint128 => Shipment) public shipments;
    uint128 public shipCount;

    event ShipmentRequested(uint128 indexed shipId, uint128 indexed batchId, address freightForwarder);
    event DocumentUploaded(uint128 indexed shipId, bytes32 docHash);
    event CustomsCleared(uint128 indexed shipId, string authorityType);

    function shipReq(uint128 _batchId, address _ff) external {
        if (!batches[_batchId].qualityApproved) revert InvalidStatus();

        uint128 orderId = batches[_batchId].orderId;
        if (orders[orderId].selleradd != msg.sender) revert Unauthorized();

        uint128 sid = ++shipCount;
        shipments[sid] = Shipment({
            Orderid:          orderId,
            shipId:           sid,
            batchId:          _batchId,
            freightForwarder: _ff,
            docHash:          bytes32(0),
            isDocUploaded:    false,
            status:           ShipStatus.ReadyForExport
        });
        emit ShipmentRequested(sid, _batchId, _ff);
    }

    function docUpload(uint128 _shipId, bytes32 _docHash) external {
        if (msg.sender != shipments[_shipId].freightForwarder) revert Unauthorized();

        shipments[_shipId].docHash       = _docHash;
        shipments[_shipId].isDocUploaded = true;
        emit DocumentUploaded(_shipId, _docHash);
    }

    function expVerify(uint128 _shipId) external {
        if (msg.sender != exportCustoms) revert Unauthorized();
        if (!shipments[_shipId].isDocUploaded) revert InvalidInput();

        shipments[_shipId].status = ShipStatus.ExportCleared;
        emit CustomsCleared(_shipId, "Export");
    }

    function impVerify(uint128 _shipId) external {
        if (msg.sender != importCustoms) revert Unauthorized();
        if (shipments[_shipId].status != ShipStatus.ExportCleared) revert InvalidStatus();

        shipments[_shipId].status = ShipStatus.ImportCleared;
        emit CustomsCleared(_shipId, "Import");

        _releaseEscrow(shipments[_shipId].Orderid);
    }

    // ─── CHANGED: sends USDT instead of ETH ──────────────────────────────────
    function _releaseEscrow(uint128 _orderId) private {
        Order storage o = orders[_orderId];
        if (o.delivered == 1) return;  // double-release guard

        o.delivered = 1;

        uint128 amount = o.escrowed;
        if (amount == 0) return;

        o.escrowed = 0;  // zero before transfer (re-entrancy guard)

        bool ok = usdt.transfer(o.selleradd, amount);
        if (!ok) revert TransferFailed();

        emit PaymentReleased(_orderId, o.selleradd, amount);
    }

    // ─── CHANGED: manual pay also uses USDT; no longer payable ───────────────
    function pay(address _seller, uint128 _amount, uint128 _orderId) external {
        if (msg.sender != orders[_orderId].buyeradd) revert Unauthorized();
        if (orders[_orderId].delivered != 1)         revert InvalidStatus();

        bool ok = usdt.transferFrom(msg.sender, _seller, _amount);
        if (!ok) revert TransferFailed();
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getSellerCertHash(address _seller) external view returns (bytes32) {
        return sellers[_seller].certHash;
    }

    function getEscrowed(uint128 _orderId) external view returns (uint128) {
        return orders[_orderId].escrowed;
    }
}