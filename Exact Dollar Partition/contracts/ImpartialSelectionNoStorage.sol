// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./ImpartialSelection.sol";
import "./ExactDollarPartitionNoStorage.sol";

/// @title Impartial Selection noStorage implementation
/// @author Giovanni Rescinito
/// @notice smart contract implementing the system proposed, using no data structures for storing scores
contract ImpartialSelectionNoStorage is ImpartialSelection{
    mapping(uint=>bool) private revealed;       // dictionary containing information about whether a proposal's commitment was revealed
    
    /// @notice creates a new instance of the contract
    /// @param tokenAddress address of the PET token to connect to the contract
    constructor(address tokenAddress) ImpartialSelection(tokenAddress) public{}

    /// @notice ends the reveal phase and checks that everyone submitted their scores
    function endRevealPhase() public override{
        super.endRevealPhase();
        ExactDollarPartitionNoStorage.finalizeScores(revealed,partition,scoreAccumulated);
    }

    /// @notice performs the reveal operation and updates the scores
    /// @param tokenId token used during the commitment phase, to retrieve the corresponding commitment
    /// @param randomness randomness used to generate the commitment
    /// @param evaluations scores used to generate the commitment
    /// @return the evaluations provided
    function revealEvaluations(uint tokenId, uint randomness, uint[] calldata evaluations, uint[] calldata assignments) public override returns (uint[] memory){
        uint id = Proposals.getIdFromToken(proposals,tokenId);
        require(!revealed[id], "Already revealed");
        super.revealEvaluations(tokenId, randomness, evaluations, assignments);
        ExactDollarPartitionNoStorage.addScores(revealed,scoreAccumulated,id, assignments, evaluations);
        return evaluations;
    }
}