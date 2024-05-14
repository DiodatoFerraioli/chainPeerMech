// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./BigNumbers.sol";

contract Election {

  uint88 countVoters;
  uint8 boolean; // Nan, countingPhase, revealPhase, verifyPhase, mixnetPhase, samplingPhase, commitPhase, registrationPhase
  address immutable owner;

  address[] public votersAddress;

  struct Voter {
    bytes publicKey;
    bool checkAddress;
    uint winner;
  }
  mapping(address => Voter) mapVoters;

  // Function constructor is used to initialize state variables of a contract
  constructor() {
    owner = msg.sender;
  }

  // These functions update election's status
  function registrationPhaseOn() external {
    require(owner == msg.sender, "Unauthorized");
    boolean = 1;
  }
  function commitPhaseOn() external {
    require(owner == msg.sender && boolean == 1, "Unauthorized");
    boolean = 2;
  }
  function samplingPhaseOn() external {
    require(owner == msg.sender && boolean == 2, "Unauthorized");
    boolean = 4;
  }
  function mixnetPhaseOn() external {
    require(owner == msg.sender && boolean == 4, "Unauthorized");
    boolean = 8;
  }
  function verifyPhaseOn() external {
    require(owner == msg.sender && boolean == 8, "Unauthorized");
    boolean = 16;
  }
  function revealPhaseOn() external {
    require(owner == msg.sender && boolean == 16, "Unauthorized");
    boolean = 32;
  }
  function countingPhaseOn() external {
    require(owner == msg.sender && boolean == 32, "Unauthorized");
    boolean = 64;
  }

  // This functions store voters
  function insertVoters(bytes calldata _publicKey) external {
    require(boolean == 1, "NotRegistrationPhase");
    votersAddress.push(msg.sender);
    Voter storage v = mapVoters[msg.sender];
    v.publicKey = _publicKey;
    v.checkAddress = true;
    unchecked {
      ++countVoters;
    }
  }

  // This function sorts in increasing order given revealed votes
  function sort(uint[] memory a, uint len) external view returns (uint[] memory) {
    require(mapVoters[msg.sender].checkAddress, "Unauthorized");
    for(uint i = 1; i < len;) {
      uint temp = a[i];
      uint k = i;
      while((k >= 1) && (temp < a[k - 1])) {
        a[k] = a[k - 1];
        --k;
      }
      a[k] = temp;
      unchecked {
        ++i;
      }
    }
    return a;
  }

  // This function carries out the electoral count
  function countWinner(uint[] calldata revealedVotes) external {
    require(mapVoters[msg.sender].checkAddress, "Unauthorized");
    require(boolean == 64, "NotCountingPhase");
    uint max;
    uint tmpWinner;
    uint lastPos;
    uint len = revealedVotes.length;
    for(uint i; i < countVoters;) {
      uint count;
      for(uint j = lastPos; j < len;) {
        if(i == revealedVotes[j]) {
          unchecked {
            ++lastPos;
            ++count;
          }
        }
        else {
          break;
        }
        unchecked {
          ++j;
        }
      }
      if(count > max) {
        max = count;
        tmpWinner = i;
      }
      unchecked {
        ++i;
      }
    }
    mapVoters[msg.sender].winner  = tmpWinner;
  }

  
  function getPublicKey(address addr) external view returns (bytes memory) {
    require(mapVoters[msg.sender].checkAddress, "Unauthorized");
    return mapVoters[addr].publicKey;
  }

  // Voters can verify that the winner is the same for all other voters
  function getWinner(address addr) external view returns (address) {
    require(mapVoters[msg.sender].checkAddress, "Unauthorized");
    return votersAddress[mapVoters[addr].winner];
  }

}