// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./DecimalMath.sol";

contract PeerNomination {

  using DecimalMath for *;

  uint88 countUsers;
  uint8 boolean; // Nan, Nan, Nan, selectionPhase, revealPhase, commitPhase, assignmentPhase, registrationPhase
  address immutable owner;

  mapping(address => bytes) public publicKey;
  mapping(uint => uint) public count;

  error Unauthorized();
  error NotRegistrationPhase();
  error NotCommitPhase();
  error NotCountingPhase();

  // Function constructor is used to initialize state variables of a contract
  constructor() {
    owner = msg.sender;
  }

  // These functions update election's status
  function registrationPhaseOn() external {
    if(owner != msg.sender) {
      revert Unauthorized();
    }
    boolean = 1;
  }
  function assignmentPhaseOn() external {
    if(owner != msg.sender && boolean != 1) {
      revert Unauthorized();
    }
    boolean = 2;
  }
  function commitPhaseOn() external {
    if(owner != msg.sender && boolean != 2) {
      revert Unauthorized();
    }
    boolean = 4;
  }
  function revealPhaseOn() external {
    if(owner != msg.sender && boolean != 4) {
      revert Unauthorized();
    }
    boolean = 8;
  }
  function selectionPhaseOn() external {
    if(owner != msg.sender && boolean != 8) {
      revert Unauthorized();
    }
    boolean = 16;
  }

  // These functions store voters and oracles
  function insertUsers(bytes calldata _publicKey) external {
    if(boolean != 1) {
      revert NotRegistrationPhase();
    }
    publicKey[msg.sender] = _publicKey;
    unchecked {
      ++countUsers;
    }
  }

  // This function carries out the count
  function countPeer(uint[][] calldata ranks, uint[] calldata rand, uint prob) external {
    if(owner != msg.sender && boolean != 16) {
      revert NotCountingPhase();
    }
    uint len = ranks[0].length;
    uint latest = len - 1;
    for(uint i; i < countUsers;) {
      for(uint j; j < len;) {
        if(j == latest) {
          if(rand[i] < prob) {
            count[ranks[i][j]]++;
          }
        }
        else {
          count[ranks[i][j]]++;
        }
        unchecked {
          ++j;
        }
      }
      unchecked {
        ++i;
      }
    }
  }

  function selectionWinners(uint threshold, uint len) external view returns (uint[] memory) {
    if(boolean != 16) {
      revert NotCountingPhase();
    }
    uint[] memory winners = new uint[](len);
    uint i;
    for(uint u; u < countUsers;) {
      if(count[u] >= threshold) {
        winners[i] = u;
        unchecked {
          ++i;
          if(i == len) {
            break;
          }
        }
      }
      unchecked {
        ++u;
      }
    }
    return winners;
  }

}