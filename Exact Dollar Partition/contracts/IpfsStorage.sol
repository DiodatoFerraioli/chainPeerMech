// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

contract IpfsStorage {

  mapping (address => string) hashIpfs_Enc;
  mapping (address => string) hashIpfs_Proof;

  // This function stores hash returned by IPFS relative to encrypted matrix
  function setEnc(address addr, string calldata hashIpfs) public {
    require(addr == msg.sender, "Writing denied!");
    hashIpfs_Enc[addr] = hashIpfs;
  }

  // This function returns IPFS hash relative to encrypted matrix
  function getEnc(address addr) public view returns (string memory) {
    return hashIpfs_Enc[addr];
  }

  // This function stores hash returned by IPFS relative to proof
  function setProof(address addr, string calldata hashIpfs) public {
    require(addr == msg.sender, "Writing denied!");
    hashIpfs_Proof[addr] = hashIpfs;
  }

  // This function returns IPFS hash relative to proof
  function getProof(address addr) public view returns (string memory) {
    return hashIpfs_Proof[addr];
  }

}