// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MotusNSRegistry} from "../contracts/MotusNSRegistry.sol";

contract GrantAgentPermitScript is Script {
    function run() external {
        address registryAddr = vm.envAddress("MOTUSNS_REGISTRY");
        bytes32 node = vm.envBytes32("MOTUSNS_NODE");
        address actor = vm.envAddress("MOTUSNS_ACTOR");
        uint256 permissionMask = vm.envUint("MOTUSNS_PERMISSION_MASK");
        uint64 expiry = uint64(vm.envUint("MOTUSNS_PERMISSION_EXPIRY"));
        uint256 signerPk = vm.envOr("MOTUSNS_ADMIN_PRIVATE_KEY", vm.envUint("CELO_DEPLOYER_PRIVATE_KEY"));

        vm.startBroadcast(signerPk);
        MotusNSRegistry(registryAddr).setAgentPermission(node, actor, permissionMask, expiry);
        vm.stopBroadcast();

        console2.log("Permission set for actor:", actor);
        console2.logUint(permissionMask);
        console2.logUint(expiry);
    }
}
