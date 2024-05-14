// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

contract IpfsStorage {
  
  address immutable owner;
  string public PartSecret;
  string public SampleSet;

  struct HashIPFS {
    string CommittedVotes;
    string ReEncryption;
    string DecryptionC1;
    string Proofs;
    string Votes;
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
  function setCommitVotes(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].CommittedVotes)) == keccak256(''), "Writing denied");
    mapHash[addr].CommittedVotes = hashIpfs;
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
  function setRevealVotes(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(mapHash[addr].Votes)) == keccak256(''), "Writing denied");
    mapHash[addr].Votes = hashIpfs;
  }
  function setSampleSet(address addr, string calldata hashIpfs) external {
    require(addr == msg.sender && keccak256(bytes(SampleSet)) == keccak256(''), "Writing denied");
    SampleSet = hashIpfs;
  }

}