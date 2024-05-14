// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./Zipper.sol";

/// @title Map-based scores definition
/// @author Giovanni Rescinito
/// @notice proposals submitted by agents, along with the corresponding assignment and commitment
library Scores{

    /// @notice Double map data structure for storing scores
    struct ScoreMap{
        mapping(uint=>uint[]) reviewsFrom;  // Collects the reviews received by each agent
        mapping(uint=>uint[]) reviewsTo;    // Collects the reviews submitted by each agent
    }
    
    /// @notice checks if an agent has submitted his reviews
    /// @param map scores data structure
    /// @param reviewer index of the reviewer in the proposals set
    /// @return if the agent submitted the reviews
    function checkSubmitted(ScoreMap storage map, uint reviewer) view external returns (bool){
        return (map.reviewsTo[reviewer].length != 0);
    }

    /// @notice stores the reviews of an agent in the scores data structure
    /// @param map scores data structure
    /// @param reviewer index of the reviewer in the proposals set
    /// @param reviewed indices of the reviewed agents
    /// @param evaluations scores submitted by the reviewer
    function setReviews(ScoreMap storage map, uint reviewer, uint[] memory reviewed, uint[] memory evaluations) external {
        uint[] memory peers;
        uint[] memory scores;
        uint[] memory tmp = compactArrays(reviewed, evaluations);
        map.reviewsTo[reviewer] = Zipper.zipArray(tmp,16);
        // For each reviewed agent unzips the corresponding list, updates it and zips it again
        for(uint i=0;i<reviewed.length;i++){
            uint[] memory unzipped = Zipper.unzipArray(map.reviewsFrom[reviewed[i]],16);
            (peers,scores) = extractPeersAndScores(unzipped,true);
            peers[peers.length-1] = reviewer;
            scores[scores.length-1] = evaluations[i];
            map.reviewsFrom[reviewed[i]] = Zipper.zipArray(compactArrays(peers,scores),16);
        }
    }

    /// @notice returns the reviews submitted by the agent specified
    /// @param map scores data structure
    /// @param reviewer index of the reviewer in the proposals set
    /// @return the list of the agents reviewed and the list of the corresponding scores provided
    function reviewsSubmitted(ScoreMap storage map, uint reviewer) view public returns (uint[] memory, uint[] memory) {
        return extractPeersAndScores(Zipper.unzipArray(map.reviewsTo[reviewer],16),false);
    }

    /// @notice returns the reviews received by the agent specified
    /// @param map scores data structure
    /// @param reviewed index of the agent in the proposals set
    /// @return the list of the reviewers and the list of the corresponding scores provided
    function reviewsReceived(ScoreMap storage map, uint reviewed) view public returns (uint[] memory, uint[] memory) {
        return extractPeersAndScores(Zipper.unzipArray(map.reviewsFrom[reviewed],16),false);
    }

    /// @notice aggregates two arrays into a single one alternating their values
    /// @param a the first array
    /// @param b the second array
    /// @return the aggregated array with alternating values from a and b
    function compactArrays(uint[] memory a, uint[] memory b)pure private returns(uint[] memory){
        require(a.length == b.length, "Different array sizes");
        uint[] memory tmp = new uint[](a.length*2);
        uint i = 0;
        for (uint j=0;j<a.length;j++){
            tmp[i++] = a[j];
            tmp[i++] = b[j];
        }
        return tmp;
    }

    /// @notice unzips and separates agents and scores
    /// @param array the zipped value containing agents and their scores
    /// @param set true if we are updating the data structure
    /// @return the list of the agents and the list of the corresponding scores provided
    function extractPeersAndScores(uint[] memory array, bool set) pure private returns (uint[] memory, uint[] memory){
        uint[] memory peers;
        uint[] memory scores;
        if (set){
            peers = new uint[](array.length/2+1);
            scores = new uint[](array.length/2+1);
        }else{
            peers = new uint[](array.length/2);
            scores = new uint[](array.length/2);
        }
        uint i = 0;
        for (uint j=0;j<array.length;j+=2){
            peers[i] = array[j];
            scores[i++] = array[j+1];
        }
        return (peers,scores);
    }
}
