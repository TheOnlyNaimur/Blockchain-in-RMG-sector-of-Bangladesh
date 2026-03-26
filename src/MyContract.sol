// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ─── Minimal ERC-20 interface ─────────────────────────────────────────────────
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title  RMGSupplyChain
 * @notice Blockchain-Based Unified Platform for Trust, Regulatory Compliance,
 *         and Traceability in Bangladesh's RMG Sector (Export Only)
 *
 * Architecture pillars enforced on-chain:
 *   1. TRUST          – multi-party verification, digital signatures, hash anchoring
 *   2. COMPLIANCE     – 4 mandatory compliance types gate production; 4 export docs gate clearance
 *   3. TRACEABILITY   – every action emits a TraceEvent for a complete audit trail
 */
contract MyContract {

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Roles ────────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    address immutable certifier;
    address immutable qualitychecker;
    address immutable freightForwarderRole;
    address immutable exportCustoms;
    address immutable importCustoms;
    address immutable complianceChecker;   // NEW: issues regulatory compliance certs

    // ─── USDT Token ───────────────────────────────────────────────────────────
    IERC20Minimal immutable usdt;

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _certifier,
        address _qualitychecker,
        address _freightForwarder,
        address _exportCustoms,
        address _importCustoms,
        address _complianceChecker,
        address _usdt
    ) {
        require(_certifier != address(0),          "Invalid certifier");
        require(_qualitychecker != address(0),     "Invalid qualitychecker");
        require(_freightForwarder != address(0),   "Invalid freightForwarder");
        require(_exportCustoms != address(0),      "Invalid exportCustoms");
        require(_importCustoms != address(0),      "Invalid importCustoms");
        require(_complianceChecker != address(0),  "Invalid complianceChecker");
        require(_usdt != address(0),               "Invalid USDT");

        certifier            = _certifier;
        qualitychecker       = _qualitychecker;
        freightForwarderRole = _freightForwarder;
        exportCustoms        = _exportCustoms;
        importCustoms        = _importCustoms;
        complianceChecker    = _complianceChecker;
        usdt                 = IERC20Minimal(_usdt);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Custom Errors ────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    error Unauthorized();
    error AlreadyRegistered();
    error NotRegistered();
    error NotApproved();
    error InvalidInput();
    error InvalidStatus();
    error InvalidOrder();
    error InsufficientPayment();
    error TransferFailed();
    error ComplianceNotMet();      // NEW: seller lacks required compliance certs
    error ExportDocsIncomplete();  // NEW: not all 4 export docs uploaded

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Enums ────────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    enum ApplicationStatus { Pending, Approved, Rejected }
    enum ShipStatus { ReadyForExport, ExportCleared, ImportCleared }

    // NEW: 4 mandatory compliance types for Bangladesh RMG export
    enum ComplianceType { FireSafety, BuildingSafety, LaborStandards, Environmental }

    // NEW: 4 mandatory export document types
    enum ExportDocType { CommercialInvoice, PackingList, BillOfLading, CertificateOfOrigin }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── On-Chain Audit Trail (TRACEABILITY) ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * @dev Emitted at EVERY significant action. Indexed by orderId for timeline queries.
     *      orderId=0 for registration/compliance events not tied to a specific order.
     */
    event TraceEvent(
        uint128 indexed orderId,
        string  eventType,
        address indexed actor,
        uint40  timestamp,
        bytes32 dataHash
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Seller Registration (TRUST) ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct Seller {
        address add;
        ApplicationStatus status;
        uint56  batchid;
        uint64  tinid;
        uint64  number;
        bytes32 certHash;
        bytes32 dataHash;
    }

    mapping(address => Seller) sellers;

    event SellerRegistered(address indexed seller, bytes32 dataHash);

    modifier certifierOnly() {
        if (msg.sender != certifier) revert Unauthorized();
        _;
    }

    modifier complianceCheckerOnly() {
        if (msg.sender != complianceChecker) revert Unauthorized();
        _;
    }

    modifier onlyRegisteredSeller(address _seller) {
        if (sellers[_seller].add == address(0)) revert NotRegistered();
        if (sellers[_seller].status != ApplicationStatus.Approved) revert NotApproved();
        _;
    }

    modifier onlyRegisteredBuyer(address _buyer) {
        if (buyers[_buyer].add == address(0)) revert NotRegistered();
        _;
    }

    function registrationseller(address _seller, bytes32 _dataHash, uint64 _tinid, uint64 _number) external {
        if (sellers[_seller].add != address(0)) revert AlreadyRegistered();
        if (_dataHash == bytes32(0) || _tinid == 0 || _number == 0) revert InvalidInput();

        sellers[_seller] = Seller({
            dataHash: _dataHash,
            tinid:    _tinid,
            number:   _number,
            add:      _seller,
            status:   ApplicationStatus.Pending,
            batchid:  0,
            certHash: bytes32(0)
        });
        emit SellerRegistered(_seller, _dataHash);
        emit TraceEvent(0, "SELLER_REGISTERED", _seller, uint40(block.timestamp), _dataHash);
    }

    function approveseller(address _address, uint8 assign) external certifierOnly {
        Seller storage s = sellers[_address];
        if (s.add == address(0)) revert NotRegistered();
        if (s.status != ApplicationStatus.Pending) revert InvalidStatus();
        if (assign != 1 && assign != 2) revert InvalidInput();

        if (assign == 1) {
            s.status = ApplicationStatus.Approved;
            s.certHash = keccak256(
                abi.encodePacked(_address, s.tinid, s.number, s.dataHash, block.timestamp)
            );
            emit TraceEvent(0, "SELLER_APPROVED", msg.sender, uint40(block.timestamp), s.certHash);
        } else {
            s.status = ApplicationStatus.Rejected;
            emit TraceEvent(0, "SELLER_REJECTED", msg.sender, uint40(block.timestamp), s.dataHash);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Compliance Certification System (REGULATORY COMPLIANCE) ──────────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct ComplianceCert {
        ComplianceType certType;
        address        seller;
        bytes32        certDocHash;   // keccak256 of IPFS CID of certificate document
        uint40         issuedAt;
        uint40         expiresAt;
        bool           isValid;
    }

    // seller => ComplianceType => ComplianceCert
    mapping(address => mapping(ComplianceType => ComplianceCert)) public complianceCerts;

    event ComplianceIssued(address indexed seller, ComplianceType indexed certType, bytes32 certDocHash);
    event ComplianceRevoked(address indexed seller, ComplianceType indexed certType);

    /**
     * @notice Issue a compliance certificate to a seller.
     * @dev    Only the compliance checker can call. Certificate is tied to an IPFS doc hash.
     */
    function issueCompliance(
        address _seller,
        ComplianceType _certType,
        bytes32 _certDocHash,
        uint40 _expiresAt
    ) external complianceCheckerOnly {
        if (sellers[_seller].add == address(0)) revert NotRegistered();
        if (sellers[_seller].status != ApplicationStatus.Approved) revert NotApproved();
        if (_certDocHash == bytes32(0)) revert InvalidInput();
        if (_expiresAt <= uint40(block.timestamp)) revert InvalidInput();

        complianceCerts[_seller][_certType] = ComplianceCert({
            certType:    _certType,
            seller:      _seller,
            certDocHash: _certDocHash,
            issuedAt:    uint40(block.timestamp),
            expiresAt:   _expiresAt,
            isValid:     true
        });

        emit ComplianceIssued(_seller, _certType, _certDocHash);
        emit TraceEvent(0, "COMPLIANCE_ISSUED", msg.sender, uint40(block.timestamp), _certDocHash);
    }

    /**
     * @notice Revoke a compliance certificate from a seller.
     */
    function revokeCompliance(address _seller, ComplianceType _certType) external complianceCheckerOnly {
        ComplianceCert storage cert = complianceCerts[_seller][_certType];
        if (!cert.isValid) revert InvalidStatus();

        cert.isValid = false;

        emit ComplianceRevoked(_seller, _certType);
        emit TraceEvent(0, "COMPLIANCE_REVOKED", msg.sender, uint40(block.timestamp), cert.certDocHash);
    }

    /**
     * @notice Check if a seller has ALL 4 compliance types valid and not expired.
     * @return True only if FireSafety, BuildingSafety, LaborStandards, and Environmental are all valid.
     */
    function isSellerCompliant(address _seller) public view returns (bool) {
        for (uint8 i = 0; i < 4; i++) {
            ComplianceCert storage cert = complianceCerts[_seller][ComplianceType(i)];
            if (!cert.isValid || cert.expiresAt <= uint40(block.timestamp)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Get compliance status for each of the 4 types.
     * @return Array of 4 booleans: [FireSafety, BuildingSafety, LaborStandards, Environmental]
     */
    function getSellerCompliance(address _seller) external view returns (bool[4] memory) {
        bool[4] memory result;
        for (uint8 i = 0; i < 4; i++) {
            ComplianceCert storage cert = complianceCerts[_seller][ComplianceType(i)];
            result[i] = cert.isValid && cert.expiresAt > uint40(block.timestamp);
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Buyer Registration ───────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct Buyer {
        address add;
        bytes32 dataHash;
    }

    mapping(address => Buyer) buyers;

    function registrationbuyer(address _buyer, bytes32 _dataHash) external {
        if (buyers[_buyer].add != address(0)) revert AlreadyRegistered();
        if (_dataHash == bytes32(0)) revert InvalidInput();

        buyers[_buyer] = Buyer({ dataHash: _dataHash, add: _buyer });
        emit TraceEvent(0, "BUYER_REGISTERED", _buyer, uint40(block.timestamp), _dataHash);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Orders (TRACEABILITY: HS Code + Destination) ─────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct Order {
        address buyeradd;
        uint8   status;        // 0=Created, 1=Accepted
        uint8   delivered;     // 0=Pending, 1=Delivered
        address selleradd;
        uint128 orderid;
        uint128 escrowed;
        bytes32 details;
        bytes32 hsCodeHash;        // NEW: HS tariff classification hash
        bytes32 destinationHash;   // NEW: destination country/port hash
    }

    mapping(uint128 => Order) orders;
    uint128 orderCount;

    event OrderCreated(uint128 indexed orderId, address indexed seller, address indexed buyer);
    event OrderAccepted(uint128 indexed orderId, uint128 amount);
    event PaymentReleased(uint128 indexed orderId, address seller, uint128 amount);

    modifier onlyOrderBuyer(uint128 _orderId, address _buyer) {
        if (orders[_orderId].buyeradd != _buyer) revert Unauthorized();
        _;
    }

    function createdealforbuyers(
        address _seller,
        bytes32 _detailsHash,
        address _buyer_add,
        bytes32 _hsCodeHash,
        bytes32 _destinationHash
    )
        external
        onlyRegisteredSeller(_seller)
        returns (uint128)
    {
        if (buyers[_buyer_add].add == address(0)) revert NotRegistered();
        if (_buyer_add == _seller) revert InvalidInput();
        if (_detailsHash == bytes32(0)) revert InvalidInput();

        uint128 newId = ++orderCount;

        orders[newId] = Order({
            orderid:         newId,
            details:         _detailsHash,
            selleradd:       _seller,
            buyeradd:        _buyer_add,
            status:          0,
            delivered:       0,
            escrowed:        0,
            hsCodeHash:      _hsCodeHash,
            destinationHash: _destinationHash
        });

        emit OrderCreated(newId, _seller, _buyer_add);
        emit TraceEvent(newId, "ORDER_CREATED", _seller, uint40(block.timestamp), _detailsHash);
        return newId;
    }

    function acceptorder(address _buyer, uint128 _orderId, uint128 _amount)
        external
        onlyRegisteredBuyer(_buyer)
        onlyOrderBuyer(_orderId, _buyer)
    {
        if (_orderId == 0 || _orderId > orderCount) revert InvalidOrder();

        Order storage o = orders[_orderId];
        if (o.status != 0)  revert InvalidStatus();
        if (_amount == 0)   revert InsufficientPayment();

        bool ok = usdt.transferFrom(_buyer, address(this), _amount);
        if (!ok) revert TransferFailed();

        o.status   = 1;
        o.escrowed = _amount;

        sellers[o.selleradd].batchid++;

        emit OrderAccepted(_orderId, _amount);
        emit TraceEvent(_orderId, "ORDER_ACCEPTED", _buyer, uint40(block.timestamp), bytes32(uint256(_amount)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Batch (COMPLIANCE GATE: seller must be fully compliant) ──────────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct Batch {
        uint128 batchId;
        uint128 orderId;
        uint40  timestamp;
        bool    isCreated;
        bool    qualityApproved;
        bytes32 productInfoHash;
    }

    mapping(uint128 => Batch) batches;
    uint128 batchCount;

    event BatchCreated(uint128 indexed batchId, uint128 indexed orderId, bytes32 productInfoHash);
    event BatchQualityUpdated(uint128 indexed batchId, bool status);

    /**
     * @notice Create a production batch. COMPLIANCE GATE: seller must have all 4
     *         compliance certifications valid before they can produce.
     */
    function batchCreate(address _seller, uint128 _orderId, bytes32 _productInfoHash) external onlyRegisteredSeller(_seller) {
        if (_orderId == 0 || _orderId > orderCount) revert InvalidOrder();
        if (orders[_orderId].selleradd != _seller) revert Unauthorized();
        if (orders[_orderId].status != 1) revert InvalidStatus();
        if (_productInfoHash == bytes32(0)) revert InvalidInput();

        // ── COMPLIANCE GATE: all 4 certifications required ──
        if (!isSellerCompliant(_seller)) revert ComplianceNotMet();

        uint128 bid = ++batchCount;
        batches[bid] = Batch({
            batchId:         bid,
            orderId:         _orderId,
            productInfoHash: _productInfoHash,
            timestamp:       uint40(block.timestamp),
            isCreated:       true,
            qualityApproved: false
        });

        emit BatchCreated(bid, _orderId, _productInfoHash);
        emit TraceEvent(_orderId, "BATCH_CREATED", _seller, uint40(block.timestamp), _productInfoHash);
    }

    function bqualitycheck(uint128 _batchId, bool _status) external {
        if (msg.sender != qualitychecker) revert Unauthorized();
        if (_batchId == 0 || _batchId > batchCount) revert InvalidOrder();
        if (!batches[_batchId].isCreated) revert InvalidInput();

        batches[_batchId].qualityApproved = _status;
        emit BatchQualityUpdated(_batchId, _status);

        uint128 oid = batches[_batchId].orderId;
        string memory evtType = _status ? "QUALITY_APPROVED" : "QUALITY_REJECTED";
        emit TraceEvent(oid, evtType, msg.sender, uint40(block.timestamp), bytes32(uint256(_batchId)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Shipment & Export Documentation (COMPLIANCE + TRACEABILITY) ──────────
    // ═══════════════════════════════════════════════════════════════════════════
    struct ExportDocSet {
        bytes32 commercialInvoiceHash;
        bytes32 packingListHash;
        bytes32 billOfLadingHash;
        bytes32 certificateOfOriginHash;
        uint8   uploadedCount;   // must be 4 before export clearance
    }

    struct Shipment {
        uint128    Orderid;
        uint128    shipId;
        uint128    batchId;
        ShipStatus status;
        address    freightForwarder;
        bytes32    docHash;          // legacy single doc (kept for backward compat)
        bool       isDocUploaded;    // legacy flag
    }

    mapping(uint128 => Shipment) public shipments;
    mapping(uint128 => ExportDocSet) public exportDocs;   // shipId => export doc set
    uint128 public shipCount;

    event ShipmentRequested(uint128 indexed shipId, uint128 indexed batchId, address freightForwarder);
    event ExportDocUploaded(uint128 indexed shipId, ExportDocType docType, bytes32 docHash);
    event CustomsCleared(uint128 indexed shipId, string authorityType);

    function shipReq(address _seller, uint128 _batchId, address _ff) external {
        if (!batches[_batchId].qualityApproved) revert InvalidStatus();

        uint128 orderId = batches[_batchId].orderId;
        if (orders[orderId].selleradd != _seller) revert Unauthorized();

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

        // Initialize empty export doc set
        exportDocs[sid] = ExportDocSet({
            commercialInvoiceHash:    bytes32(0),
            packingListHash:          bytes32(0),
            billOfLadingHash:         bytes32(0),
            certificateOfOriginHash:  bytes32(0),
            uploadedCount:            0
        });

        emit ShipmentRequested(sid, _batchId, _ff);
        emit TraceEvent(orderId, "SHIPMENT_REQUESTED", _seller, uint40(block.timestamp), bytes32(uint256(sid)));
    }

    /**
     * @notice Upload an export document (one of 4 types).
     * @dev    Each doc type can only be uploaded once per shipment.
     *         Replaces the old single-doc `docUpload` function.
     * @param _shipId  Shipment ID
     * @param _docType 0=CommercialInvoice, 1=PackingList, 2=BillOfLading, 3=CertificateOfOrigin
     * @param _docHash keccak256 of the IPFS CID of the document
     */
    function uploadExportDoc(uint128 _shipId, ExportDocType _docType, bytes32 _docHash) external {
        if (msg.sender != shipments[_shipId].freightForwarder) revert Unauthorized();
        if (_docHash == bytes32(0)) revert InvalidInput();

        ExportDocSet storage docs = exportDocs[_shipId];

        // Ensure each doc type is uploaded only once
        if (_docType == ExportDocType.CommercialInvoice) {
            if (docs.commercialInvoiceHash != bytes32(0)) revert InvalidStatus();
            docs.commercialInvoiceHash = _docHash;
        } else if (_docType == ExportDocType.PackingList) {
            if (docs.packingListHash != bytes32(0)) revert InvalidStatus();
            docs.packingListHash = _docHash;
        } else if (_docType == ExportDocType.BillOfLading) {
            if (docs.billOfLadingHash != bytes32(0)) revert InvalidStatus();
            docs.billOfLadingHash = _docHash;
        } else if (_docType == ExportDocType.CertificateOfOrigin) {
            if (docs.certificateOfOriginHash != bytes32(0)) revert InvalidStatus();
            docs.certificateOfOriginHash = _docHash;
        }

        docs.uploadedCount++;

        // Also set legacy fields for backward compat
        shipments[_shipId].docHash       = _docHash;
        shipments[_shipId].isDocUploaded = true;

        uint128 oid = shipments[_shipId].Orderid;
        emit ExportDocUploaded(_shipId, _docType, _docHash);
        emit TraceEvent(oid, "EXPORT_DOC_UPLOADED", msg.sender, uint40(block.timestamp), _docHash);
    }

    /**
     * @notice Export customs clearance. COMPLIANCE GATE: all 4 export docs must be uploaded.
     */
    function expVerify(uint128 _shipId) external {
        if (msg.sender != exportCustoms) revert Unauthorized();

        // ── COMPLIANCE GATE: all 4 export documents required ──
        if (exportDocs[_shipId].uploadedCount < 4) revert ExportDocsIncomplete();

        shipments[_shipId].status = ShipStatus.ExportCleared;

        uint128 oid = shipments[_shipId].Orderid;
        emit CustomsCleared(_shipId, "Export");
        emit TraceEvent(oid, "EXPORT_CLEARED", msg.sender, uint40(block.timestamp), bytes32(uint256(_shipId)));
    }

    function impVerify(uint128 _shipId) external {
        if (msg.sender != importCustoms) revert Unauthorized();
        if (shipments[_shipId].status != ShipStatus.ExportCleared) revert InvalidStatus();

        shipments[_shipId].status = ShipStatus.ImportCleared;

        uint128 oid = shipments[_shipId].Orderid;
        emit CustomsCleared(_shipId, "Import");
        emit TraceEvent(oid, "IMPORT_CLEARED", msg.sender, uint40(block.timestamp), bytes32(uint256(_shipId)));

        // NOTE: escrow is NOT auto-released. Buyer must call buyerConfirmDelivery().
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Payment (USDT Escrow) ────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Buyer confirms goods received → releases escrowed USDT to seller.
     * @dev    Requires import customs to have cleared first.
     */
    function buyerConfirmDelivery(address _buyer, uint128 _orderId, uint128 _shipId) external {
        Order storage o = orders[_orderId];
        if (_buyer != o.buyeradd) revert Unauthorized();
        if (o.delivered == 1) revert InvalidStatus();

        // Verify the shipment belongs to this order and is cleared
        if (shipments[_shipId].Orderid != _orderId) revert InvalidStatus();
        if (shipments[_shipId].status != ShipStatus.ImportCleared) revert InvalidStatus();

        emit TraceEvent(_orderId, "BUYER_CONFIRMED_DELIVERY", _buyer, uint40(block.timestamp), bytes32(uint256(o.escrowed)));
        _releaseEscrow(_orderId);
    }

    /**
     * @notice Import customs can force-release escrow if buyer does not confirm.
     *         Safety fallback to prevent funds being locked indefinitely.
     */
    function forceReleaseEscrow(uint128 _orderId, uint128 _shipId) external {
        if (msg.sender != importCustoms) revert Unauthorized();

        Order storage o = orders[_orderId];
        if (o.delivered == 1) revert InvalidStatus();

        // Verify the shipment belongs to this order and is cleared
        if (shipments[_shipId].Orderid != _orderId) revert InvalidStatus();
        if (shipments[_shipId].status != ShipStatus.ImportCleared) revert InvalidStatus();

        emit TraceEvent(_orderId, "FORCE_RELEASE_BY_CUSTOMS", msg.sender, uint40(block.timestamp), bytes32(uint256(o.escrowed)));
        _releaseEscrow(_orderId);
    }

    function _releaseEscrow(uint128 _orderId) private {
        Order storage o = orders[_orderId];
        if (o.delivered == 1) return;

        o.delivered = 1;

        uint128 amount = o.escrowed;
        if (amount == 0) return;

        o.escrowed = 0;

        bool ok = usdt.transfer(o.selleradd, amount);
        if (!ok) revert TransferFailed();

        emit PaymentReleased(_orderId, o.selleradd, amount);
        emit TraceEvent(_orderId, "PAYMENT_RELEASED", o.selleradd, uint40(block.timestamp), bytes32(uint256(amount)));
    }

    function pay(address _buyer, address _seller, uint128 _amount, uint128 _orderId) external {
        if (_buyer != orders[_orderId].buyeradd) revert Unauthorized();
        if (orders[_orderId].delivered != 1)         revert InvalidStatus();

        bool ok = usdt.transferFrom(msg.sender, _seller, _amount);
        if (!ok) revert TransferFailed();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── View Functions (TRUST: transparency for all stakeholders) ────────────
    // ═══════════════════════════════════════════════════════════════════════════
    function getSellerCertHash(address _seller) external view returns (bytes32) {
        return sellers[_seller].certHash;
    }

    function getEscrowed(uint128 _orderId) external view returns (uint128) {
        return orders[_orderId].escrowed;
    }

    /**
     * @notice Check if a shipment has all 4 export documents and is ready for export clearance.
     */
    function isExportReady(uint128 _shipId) external view returns (bool) {
        return exportDocs[_shipId].uploadedCount >= 4;
    }

    /**
     * @notice Get the high-level status of an order.
     */
    function getOrderStatus(uint128 _orderId) external view returns (
        uint8 status,
        uint8 delivered,
        uint128 escrowed,
        bytes32 hsCodeHash_,
        bytes32 destinationHash_
    ) {
        Order storage o = orders[_orderId];
        return (o.status, o.delivered, o.escrowed, o.hsCodeHash, o.destinationHash);
    }
}