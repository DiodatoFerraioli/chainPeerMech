// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

/// @title Interface for the impartial peer selection mechanism
/// @author Giovanni Rescinito
/// @notice defines the prototypes of the functions an impartial peer selection contract should implement
interface ImpartialSelectionInterface{
    
    function isImpartialSelection() external view returns (bool);
    
    function finalizeCreation() external;
    function getTokenAddress() external view returns (address);

    function setCurrentPhase(uint8) external;
    function getCurrentPhase() external view returns (uint8);
    
    function endSubmissionPhase() external;
    function endAssignmentPhase() external;
    function endCommitmentPhase() external;
    function endRevealPhase() external;
    
    function getPartition() external view returns(uint[][] memory);
    function getAllocations() external view returns (uint[][] memory, uint[] memory);
    function getAssignmentByToken(uint tokenId) external view returns(uint[] memory);
    function getAssignmentById(uint id) external view returns(uint[] memory);
    function getWorkById(uint id) external view returns(bytes memory);

    function submitWork(bytes calldata work) external;
    function createPartition(uint l) external;
    function providePartition(uint[][] calldata part) external;
    function generateAssignments(uint m) external;
    function provideAssignments(uint[][] calldata assignments) external;
    function commitEvaluations(bytes32 commitment, uint tokenId) external;
    function revealEvaluations(uint tokenId, uint randomness, uint[] calldata evaluations, uint[] calldata assignments) external returns (uint[] memory);
    function impartialSelection(uint k, uint randomness) external;

}