// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

contract IpfsStorage {

  address immutable owner;
  string public PartSecret;
  string public Assignment;

  struct HashIPFS {
    string CommittedRank;
    string DecryptionC1;
    string Ranks;
  }
  mapping(address => HashIPFS) public mapHash;

  constructor() {
    owner = msg.sender;
  }

  // These functions stores IPFS hash relative to file that has been added on IPFS
  function setCypher(string calldata hashIpfs) external {
    require(owner == msg.sender && keccak256(bytes(PartSecret)) == keccak256(''), "Writing denied");
    PartSecret = hashIpfs;
  }
  function setAssignment(string calldata hashIpfs) external {
    require(owner == msg.sender && keccak256(bytes(Assignment)) == keccak256(''), "Writing denied");
    Assignment = hashIpfs;
  }
  function setRank(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].CommittedRank)) == keccak256(''), "Writing denied");
    mapHash[addr].CommittedRank = hashIpfs;
  }
  function setDecC1(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].DecryptionC1)) == keccak256(''), "Writing denied");
    mapHash[addr].DecryptionC1 = hashIpfs;
  }
  function setRevealRanks(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].Ranks)) == keccak256(''), "Writing denied");
    mapHash[addr].Ranks = hashIpfs;
  }

}