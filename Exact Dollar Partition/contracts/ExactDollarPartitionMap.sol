// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;


import "./ExactDollarPartition.sol";
import "./Scores.sol";

/// @title Exact Dollar Partition map implementation
/// @author Giovanni Rescinito
/// @notice implements the map specific functions related to Exact Dollar Partition
library ExactDollarPartitionMap {

    /// @notice checks if all users revealed their evaluations, otherwise sets them according to Exact Dollar Partition
    /// @param scoreMap data structure containing the scores
    /// @param partition zipped matrix of the clusters in which proposals are divided
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    function finalizeScoreMap(Scores.ScoreMap storage scoreMap, uint[][] storage partition,mapping(uint=>uint) storage scoreAccumulated) external{
        uint[][] memory part = Zipper.unzipMatrix(partition,16);
        uint n = 0;
        for (uint i=0;i<partition.length;i++){
            n += part[i].length;
        }
        uint[] memory row = new uint[](0);
        bool modified;
        uint[] memory eval;
        uint[] memory assign;
        uint[] memory accumulator = new uint[](n);
        uint value;
        for (uint i=0;i<part.length;i++){
            modified = false;
            if (i == n % part.length){
                row = new uint[](0);
            }
            for (uint j=0;j<part[i].length;j++){
                uint id = part[i][j];
                // (peers,) = Scores.reviewsSubmitted(scoreMap, id);
                if (!Scores.checkSubmitted(scoreMap,id)){
                    if (!modified){
                        if (row.length == 0){
                            value = Utils.C/(n-part[i].length);
                            row = new uint[](n);
                            for (uint k=0;k<n;k++){
                                row[k] = value;
                            }
                        }
                        eval = new uint[](n-part[i].length);
                        assign = new uint[](n-part[i].length);
                        for (uint k=0;k<part[i].length;k++){
                            row[part[i][k]] = 0;
                        }
                        uint idx = 0;
                        for (uint k=0;k<row.length;k++){
                            if (row[k] != 0){
                                assign[idx] = k;
                                eval[idx++] = value;
                            }
                        }    
                        modified = true;
                    }
                    for (uint k=0;k<n;k++){
                        if (row[k]!=0){
                            accumulator[k] += value;
                        }
                    }
                    Scores.setReviews(scoreMap,id,assign,eval);
                }
            }
            if (modified){
                for (uint k=0;k<part[i].length;k++){
                    row[part[i][k]] = value;
                }
            }
        }
        for (uint k=0;k<n;k++){
            if (accumulator[k]!=0){
                scoreAccumulated[k] += accumulator[k];
            }
        }
    }

    /// @notice normalize the scores received by a user when revealing and adds them to the corresponding data structure
    /// @param scoreMap data structure containing the scores
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    /// @param index index of the agent who submitted the reviews
    /// @param assignments list of the works reviewed
    /// @param evaluations scores provided
    function addToScoreMap(Scores.ScoreMap storage scoreMap, mapping(uint=>uint) storage scoreAccumulated, uint index, uint[] calldata assignments, uint[] memory evaluations) external{
        uint sum = 0;
        uint c = Utils.C;
        for (uint j=0;j<assignments.length;j++){
            sum += evaluations[j];
        }
        if (sum != 0){
            for (uint j=0;j<assignments.length;j++){
                evaluations[j] = evaluations[j]*c/sum;
                scoreAccumulated[assignments[j]] += evaluations[j];
            }
            Scores.setReviews(scoreMap, index, assignments, evaluations);
        }
    }
}
