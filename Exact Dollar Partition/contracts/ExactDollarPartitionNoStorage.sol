// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;


import "./ExactDollarPartition.sol";

/// @title Exact Dollar Partition noStorage implementation
/// @author Giovanni Rescinito
/// @notice implements specific functions related to Exact Dollar Partition implementation using no data structures for scores
library ExactDollarPartitionNoStorage {

    /// @notice checks if all users revealed their evaluations, otherwise sets them according to Exact Dollar Partition
    /// @param revealed containing information about users who already revealed scores
    /// @param partition zipped matrix of the clusters in which proposals are divided
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    function finalizeScores(mapping(uint=>bool) storage revealed, uint[][] storage partition, mapping(uint=>uint) storage scoreAccumulated) external{
        uint[][] memory part = Zipper.unzipMatrix(partition,16);
        uint n = 0;
        for (uint i=0;i<partition.length;i++){
            n += part[i].length;
        }
        uint smallerSize = n % part.length;
        uint[] memory accumulator = new uint[](n);
        uint c = Utils.C;
        uint value = c/(n-part[0].length);
        for (uint i=0;i<part.length;i++){
            if (i == smallerSize){
                value = c/(n-part[i].length);
            }
            for (uint j=0;j<part[i].length;j++){
                uint id = part[i][j];
                if (!revealed[id]){
                    for (uint k=0;k<part.length;k++){
                        if (i!=k){
                            for (uint x=0;x<part[k].length;x++){
                                accumulator[part[k][x]] += value;
                            }
                        }
                    }
                }
            }
        }
        for (uint k=0;k<n;k++){
            if (accumulator[k]!=0){
                scoreAccumulated[k] += accumulator[k];
            }
        }
    }
    
    /// @notice normalizes the scores received by a user when revealing and adds them to the corresponding data structure
    /// @param revealed containing information about users who already revealed scores
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    /// @param index index of the agent who submitted the reviews
    /// @param assignments list of the works reviewed
    /// @param evaluations scores provided
    function addScores(mapping(uint=>bool) storage revealed, mapping(uint=>uint) storage scoreAccumulated, uint index, uint[] calldata assignments, uint[] memory evaluations) external{
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
            revealed[index] = true;
        }
    }
}
