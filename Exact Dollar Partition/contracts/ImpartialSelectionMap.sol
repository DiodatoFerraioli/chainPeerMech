// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./ImpartialSelection.sol";
import "./ExactDollarPartitionMap.sol";

/// @title Impartial Selection Map implementation
/// @author Giovanni Rescinito
/// @notice smart contract implementing the system proposed, using a map as support data structure for scores
contract ImpartialSelectionMap is ImpartialSelection{
    Scores.ScoreMap private scoreMap;   // scores data structure implemented as a double map
    
    /// @notice creates a new instance of the contract
    /// @param tokenAddress address of the PET token to connect to the contract
    constructor(address tokenAddress) ImpartialSelection(tokenAddress) public{}

    /// @notice ends the reveal phase and checks that everyone submitted their scores
    function endRevealPhase() override public{
        super.endRevealPhase();
        ExactDollarPartitionMap.finalizeScoreMap(scoreMap,partition,scoreAccumulated);
    }

    /// @notice performs the reveal operation and updates the scores
    /// @param tokenId token used during the commitment phase, to retrieve the corresponding commitment
    /// @param randomness randomness used to generate the commitment
    /// @param evaluations scores used to generate the commitment
    /// @return the evaluations provided
    function revealEvaluations(uint tokenId, uint randomness, uint[] calldata evaluations, uint[] calldata assignments) override public returns (uint[] memory){
        uint id = Proposals.getIdFromToken(proposals,tokenId);
        require(!Scores.checkSubmitted(scoreMap,id), "Already revealed");
        super.revealEvaluations(tokenId, randomness, evaluations, assignments);
        ExactDollarPartitionMap.addToScoreMap(scoreMap,scoreAccumulated,Proposals.getIdFromToken(proposals,tokenId), assignments, evaluations);
        return evaluations;
    }

    /// @notice returns a representation of the scores provided
    /// @return the scores submitted by users organized in a matrix where each row contains the reviews submitted by a user,
    ///         while each column contains the reviews received by a user
    function getScores() view external returns(uint[][] memory){
        uint n = Proposals.length(proposals);
        uint[][] memory map= new uint[][](n);
        uint[] memory peers;
        uint[] memory scores;
        for (uint i=0;i<n;i++){
            (peers,scores) = Scores.reviewsSubmitted(scoreMap,i);
            map[i] = new uint[](n);
            for (uint j=0;j<peers.length;j++){
                map[i][peers[j]] = scores[j];
            }
        }
        return map;
    }
}