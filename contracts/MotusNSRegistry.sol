// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/**
 * @title MotusNSRegistry
 * @notice ENS-style hierarchical registry for agent and subagent identities.
 * @dev Supports EOA and smart-wallet (ERC-1271) signatures for permit grants.
 */
contract MotusNSRegistry is AccessControl, EIP712 {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    uint256 public constant PERMIT_EXECUTE = 1 << 0;
    uint256 public constant PERMIT_UPDATE_METADATA = 1 << 1;
    uint256 public constant PERMIT_SPAWN_SUBAGENT = 1 << 2;
    uint256 public constant PERMIT_GRANT = 1 << 3;
    uint256 public constant PERMIT_REVOKE = 1 << 4;

    bytes32 private constant PERMIT_TYPEHASH = keccak256(
        "AgentPermit(bytes32 node,address grantee,uint256 permissions,uint64 expiry,uint256 nonce,uint256 deadline)"
    );

    struct NodeRecord {
        bytes32 parentNode;
        bytes32 labelHash;
        address controller;
        address resolver;
        string metadataURI;
        bool exists;
        bool revoked;
    }

    bytes32 public immutable ROOT_NODE;
    string public rootLabel;

    // node => record
    mapping(bytes32 => NodeRecord) public nodes;
    // node => signer => nonce
    mapping(bytes32 => mapping(address => uint256)) public nonces;
    // node => actor => permission bitmask
    mapping(bytes32 => mapping(address => uint256)) public permissions;
    // node => actor => unix expiry
    mapping(bytes32 => mapping(address => uint64)) public permissionExpiry;

    event NodeRegistered(
        bytes32 indexed node,
        bytes32 indexed parentNode,
        bytes32 indexed labelHash,
        address controller,
        address resolver,
        string metadataURI
    );
    event NodeRevoked(bytes32 indexed node, address indexed revokedBy);
    event NodeControllerUpdated(bytes32 indexed node, address indexed oldController, address indexed newController);
    event NodeResolverUpdated(bytes32 indexed node, address indexed oldResolver, address indexed newResolver);
    event NodeMetadataUpdated(bytes32 indexed node, string oldMetadataURI, string newMetadataURI);
    event AgentPermissionSet(
        bytes32 indexed node,
        address indexed actor,
        uint256 permissionsMask,
        uint64 expiry,
        address indexed setBy
    );
    event AgentPermissionRevoked(bytes32 indexed node, address indexed actor, address indexed revokedBy);

    error InvalidLabel();
    error NodeAlreadyExists();
    error NodeNotFound();
    error NodeRevokedError();
    error Unauthorized();
    error ExpiredPermit();
    error InvalidPermitSignature();
    error InvalidController();

    constructor(bytes32 rootNode_, string memory rootLabel_, address admin) EIP712("MotusNSRegistry", "1") {
        require(admin != address(0), "admin=0");
        ROOT_NODE = rootNode_;
        rootLabel = rootLabel_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerAgent(
        string calldata label,
        address controller,
        address resolver,
        string calldata metadataURI
    ) external onlyRole(REGISTRAR_ROLE) returns (bytes32 node) {
        node = _registerNode(ROOT_NODE, label, controller, resolver, metadataURI);
    }

    function registerSubagent(
        bytes32 parentNode,
        string calldata label,
        address controller,
        address resolver,
        string calldata metadataURI
    ) external returns (bytes32 node) {
        _revertIfNodeMissingOrRevoked(parentNode);

        if (!(hasRole(REGISTRAR_ROLE, msg.sender) || _hasPermission(parentNode, msg.sender, PERMIT_SPAWN_SUBAGENT))) {
            revert Unauthorized();
        }

        node = _registerNode(parentNode, label, controller, resolver, metadataURI);
    }

    function setAgentPermission(
        bytes32 node,
        address actor,
        uint256 permissionMask,
        uint64 expiry
    ) external {
        _revertIfNodeMissingOrRevoked(node);
        if (!_canGrant(node, msg.sender)) revert Unauthorized();

        permissions[node][actor] = permissionMask;
        permissionExpiry[node][actor] = expiry;
        emit AgentPermissionSet(node, actor, permissionMask, expiry, msg.sender);
    }

    function setAgentPermissionBySig(
        bytes32 node,
        address signer,
        address grantee,
        uint256 permissionMask,
        uint64 expiry,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _revertIfNodeMissingOrRevoked(node);
        if (block.timestamp > deadline) revert ExpiredPermit();
        if (!_canGrant(node, signer)) revert Unauthorized();

        uint256 nonce = nonces[node][signer];
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, node, grantee, permissionMask, expiry, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        bool ok = SignatureChecker.isValidSignatureNow(signer, digest, signature);
        if (!ok) revert InvalidPermitSignature();

        nonces[node][signer] = nonce + 1;
        permissions[node][grantee] = permissionMask;
        permissionExpiry[node][grantee] = expiry;
        emit AgentPermissionSet(node, grantee, permissionMask, expiry, signer);
    }

    function revokeAgentPermission(bytes32 node, address actor) external {
        _revertIfNodeMissingOrRevoked(node);
        if (!_canGrant(node, msg.sender)) revert Unauthorized();

        permissions[node][actor] = 0;
        permissionExpiry[node][actor] = 0;
        emit AgentPermissionRevoked(node, actor, msg.sender);
    }

    function revokeNode(bytes32 node) external {
        _revertIfNodeMissingOrRevoked(node);
        if (!_canRevoke(node, msg.sender)) revert Unauthorized();

        nodes[node].revoked = true;
        emit NodeRevoked(node, msg.sender);
    }

    function setNodeController(bytes32 node, address newController) external {
        _revertIfNodeMissingOrRevoked(node);
        if (newController == address(0)) revert InvalidController();
        if (!_canGrant(node, msg.sender)) revert Unauthorized();

        address old = nodes[node].controller;
        nodes[node].controller = newController;
        emit NodeControllerUpdated(node, old, newController);
    }

    function setNodeResolver(bytes32 node, address newResolver) external {
        _revertIfNodeMissingOrRevoked(node);
        if (!_canGrant(node, msg.sender)) revert Unauthorized();

        address old = nodes[node].resolver;
        nodes[node].resolver = newResolver;
        emit NodeResolverUpdated(node, old, newResolver);
    }

    function setNodeMetadataURI(bytes32 node, string calldata newMetadataURI) external {
        _revertIfNodeMissingOrRevoked(node);
        if (!(nodes[node].controller == msg.sender || _hasPermission(node, msg.sender, PERMIT_UPDATE_METADATA))) {
            revert Unauthorized();
        }

        string memory old = nodes[node].metadataURI;
        nodes[node].metadataURI = newMetadataURI;
        emit NodeMetadataUpdated(node, old, newMetadataURI);
    }

    function hasPermission(bytes32 node, address actor, uint256 permissionBit) external view returns (bool) {
        return _hasPermission(node, actor, permissionBit);
    }

    function computeNode(bytes32 parentNode, string calldata label) external pure returns (bytes32) {
        bytes32 labelHash = keccak256(bytes(label));
        return keccak256(abi.encodePacked(parentNode, labelHash));
    }

    function _registerNode(
        bytes32 parentNode,
        string calldata label,
        address controller,
        address resolver,
        string calldata metadataURI
    ) internal returns (bytes32 node) {
        if (bytes(label).length == 0) revert InvalidLabel();
        if (controller == address(0)) revert InvalidController();

        bytes32 labelHash = keccak256(bytes(label));
        node = keccak256(abi.encodePacked(parentNode, labelHash));
        if (nodes[node].exists) revert NodeAlreadyExists();

        nodes[node] = NodeRecord({
            parentNode: parentNode,
            labelHash: labelHash,
            controller: controller,
            resolver: resolver,
            metadataURI: metadataURI,
            exists: true,
            revoked: false
        });

        emit NodeRegistered(node, parentNode, labelHash, controller, resolver, metadataURI);
    }

    function _canGrant(bytes32 node, address actor) internal view returns (bool) {
        return actor == nodes[node].controller || hasRole(DEFAULT_ADMIN_ROLE, actor) || _hasPermission(node, actor, PERMIT_GRANT);
    }

    function _canRevoke(bytes32 node, address actor) internal view returns (bool) {
        return actor == nodes[node].controller || hasRole(DEFAULT_ADMIN_ROLE, actor) || _hasPermission(node, actor, PERMIT_REVOKE);
    }

    function _hasPermission(bytes32 node, address actor, uint256 permissionBit) internal view returns (bool) {
        uint64 expires = permissionExpiry[node][actor];
        if (expires != 0 && block.timestamp > expires) return false;
        return (permissions[node][actor] & permissionBit) != 0;
    }

    function _revertIfNodeMissingOrRevoked(bytes32 node) internal view {
        if (!nodes[node].exists) revert NodeNotFound();
        if (nodes[node].revoked) revert NodeRevokedError();
    }
}
