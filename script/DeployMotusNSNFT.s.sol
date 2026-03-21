// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MotusNSRegistryNFT} from "../contracts/MotusNSRegistryNFT.sol";

contract DeployMotusNSNFTScript is Script {
    function run() external returns (MotusNSRegistryNFT deployed) {
        address admin = vm.envAddress("MOTUSNS_ADMIN");
        uint256 deployerPk = vm.envUint("CELO_DEPLOYER_PRIVATE_KEY");

        string[] memory labels = new string[](2);
        labels[0] = "eth";
        labels[1] = "motusns";
        bytes32 rootNode = _namehash(labels);

        vm.startBroadcast(deployerPk);
        deployed = new MotusNSRegistryNFT(rootNode, "motusns.eth", admin);
        vm.stopBroadcast();

        console2.log("MotusNSRegistryNFT deployed:", address(deployed));
        console2.logBytes32(rootNode);
    }

    function _namehash(string[] memory labels) internal pure returns (bytes32 node) {
        node = bytes32(0);
        for (uint256 i = 0; i < labels.length; i++) {
            node = keccak256(abi.encodePacked(node, keccak256(bytes(labels[i]))));
        }
    }
}
