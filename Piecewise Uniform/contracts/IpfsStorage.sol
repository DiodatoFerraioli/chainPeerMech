// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

contract IpfsStorage {

  address immutable owner;
  string public PartSecret;

  struct HashIPFS {
    string CommittedPartition;
    string ReEncryption;
    string DecryptionC1;
    string Proofs;
    string Partitions;
    string SortedPartitions;
  }
  mapping(address => HashIPFS) public mapHash;

  constructor() {
    owner = msg.sender;
  }

  // These functions (whose name comes from the stored file) stores IPFS hash relative to file that has been added on IPFS
  function setCypher(string calldata hashIpfs) external {
    require(owner == msg.sender && keccak256(bytes(PartSecret)) == keccak256(''), "Writing denied");
    PartSecret = hashIpfs;
  }
  function setCommitPartition(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].CommittedPartition)) == keccak256(''), "Writing denied");
    mapHash[addr].CommittedPartition = hashIpfs;
  }
  function setCommitReEnc(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].ReEncryption)) == keccak256(''), "Writing denied");
    mapHash[addr].ReEncryption = hashIpfs;
  }
  function setProof(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].Proofs)) == keccak256(''), "Writing denied");
    mapHash[addr].Proofs = hashIpfs;
  }
  function setDecC1(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].DecryptionC1)) == keccak256(''), "Writing denied");
    mapHash[addr].DecryptionC1 = hashIpfs;
  }
  function setRevealPartitions(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].Partitions)) == keccak256(''), "Writing denied");
    mapHash[addr].Partitions = hashIpfs;
  }
  function setSortedPartitions(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender, "Writing denied");
    mapHash[addr].SortedPartitions = hashIpfs;
  }
  
}