// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MotusNSRegistry} from "../contracts/MotusNSRegistry.sol";

contract BootstrapMotusNSScript is Script {
    function run() external {
        address registryAddr = vm.envAddress("MOTUSNS_REGISTRY");
        address registrar = vm.envAddress("MOTUSNS_REGISTRAR");
        uint256 signerPk = vm.envOr("MOTUSNS_ADMIN_PRIVATE_KEY", vm.envUint("CELO_DEPLOYER_PRIVATE_KEY"));

        MotusNSRegistry registry = MotusNSRegistry(registryAddr);
        bytes32 registrarRole = registry.REGISTRAR_ROLE();

        vm.startBroadcast(signerPk);
        registry.grantRole(registrarRole, registrar);
        vm.stopBroadcast();

        console2.log("Granted REGISTRAR_ROLE to:", registrar);
    }
}
