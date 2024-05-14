// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;


import "./ExactDollarPartition.sol";

/// @title Exact Dollar Partition matrix implementation
/// @author Giovanni Rescinito
/// @notice implements the matrix specific functions related to Exact Dollar Partition
library ExactDollarPartitionMatrix {

    /// @notice initializes the scores data structure
    /// @param n numbers of proposals submitted
    /// @return a nxn empty matrix to store scores
    function initializeScoreMatrix(uint n) pure external returns (uint[][] memory){
        return new uint[][](n);
    }

    /// @notice checks if all users revealed their evaluations, otherwise sets them according to Exact Dollar Partition
    /// @param scoreMatrix data structure containing the scores
    /// @param partition zipped matrix of the clusters in which proposals are divided
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    function finalizeScoreMatrix(uint[][] storage scoreMatrix, uint[][] storage partition, mapping(uint=>uint) storage scoreAccumulated) external{
        uint n = scoreMatrix.length;
        uint[][] memory part = Zipper.unzipMatrix(partition,16);
        uint smallerSize = n % part.length;
        uint[] memory row = new uint[](0);
        bool modified;
        uint[] memory array;
        uint[] memory accumulator = new uint[](n);
        uint value;
        uint c = Utils.C;
        for (uint i=0;i<part.length;i++){
            modified = false;
            if (i == smallerSize){
                row = new uint[](0);
            }
            for (uint j=0;j<part[i].length;j++){
                uint id = part[i][j];
                if (scoreMatrix[id].length == 0){
                    if (!modified){
                        if (row.length == 0){
                            value = c/(n-part[i].length);
                            row = new uint[](n);
                            for (uint k=0;k<n;k++){
                                row[k] = value;
                            }
                        }
                        array = new uint[](2*(n-part[i].length));
                        for (uint k=0;k<part[i].length;k++){
                            row[part[i][k]] = 0;
                        }
                        uint idx = 0;
                        for (uint k=0;k<row.length;k++){
                            if (row[k] != 0){
                                array[idx++] = k;
                                array[idx++] = value;
                            }
                        }    
                        modified = true;
                    }
                    for (uint k=0;k<n;k++){
                        if (row[k]!=0){
                            accumulator[k] += value;
                        }
                    }
                    scoreMatrix[id] = Zipper.zipArray(array, 16);
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
    
    /// @notice normalizes the scores received by a user when revealing and adds them to the corresponding data structure
    /// @param scoreMatrix data structure containing the scores
    /// @param scoreAccumulated accumulators containing the cumulative score received by each user
    /// @param index index of the agent who submitted the reviews
    /// @param assignments list of the works reviewed
    /// @param evaluations scores provided
    function addToScoreMatrix(uint[][] storage scoreMatrix, mapping(uint=>uint) storage scoreAccumulated, uint index, uint[] calldata assignments, uint[] memory evaluations) external{
        uint sum = 0;
        uint c = Utils.C;
        for (uint j=0;j<assignments.length;j++){
            sum += evaluations[j];
        }
        uint[] memory array = new uint[](2*assignments.length);
        if (sum != 0){
            uint idx = 0;
            for (uint j=0;j<assignments.length;j++){
                array[idx++] = assignments[j];
                evaluations[j] = evaluations[j]*c/sum;
                array[idx++] = evaluations[j];
                scoreAccumulated[assignments[j]] += evaluations[j];
            }
            scoreMatrix[index] = Zipper.zipArray(array,16);
        }
    }
}
