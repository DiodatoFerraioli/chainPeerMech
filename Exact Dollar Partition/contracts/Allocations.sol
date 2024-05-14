// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./Zipper.sol";


/// @title Dictionary storing allocations
/// @author Giovanni Rescinito
/// @notice Data structure implemented as an iterable map, produced during the apportionment algorithm to store allocations
library Allocations {
    //Data Structures

    /// @notice Data structure related to a single allocation
    struct Allocation {
        uint240 shares;     // winners per cluster
        uint16 p;           // probability of the allocation
    }

    /// @notice Dictionary containing allocations
    struct Map {
        Allocation[] elements;          // list of allocations
        mapping (bytes32 => uint) idx;  // maps key to index in the list
    }

    //Setters

    /// @notice creates a new allocation or updates the probability of an existing one
    /// @param map dictionary containing allocations
    /// @param a winners per cluster to insert/modify
    /// @param p probability of the specific allocation
    function setAllocation(Map storage map, uint[] calldata a, uint p) external {
        bytes32 h = keccak256(abi.encodePacked(a));
        uint index = map.idx[h];
        if (index == 0) {
            map.elements.push(Allocation(uint240(Zipper.zipArrayWithSize(a,8)), uint16(p)));
            map.idx[h] = map.elements.length;
        }else {
            map.elements[index - 1].p = uint16(p);
        }
    }

    /// @notice updates the winners per cluster of an allocation specified by its index
    /// @param map dictionary containing allocations
    /// @param index index of the allocation to modify
    /// @param shares winners per cluster to update
    function updateShares(Map storage map, uint index, uint[] calldata shares) external {
        require(index >= 0 && index < map.elements.length, "Map out of bounds"); 
        map.elements[index].shares = uint240(Zipper.zipArrayWithSize(shares,8));
    }

    //Getters

    /// @param map dictionary containing allocations
    /// @return the number of allocations stored
    function length(Map storage map) view external returns (uint){
        return map.elements.length;
    }

    /// @param map dictionary containing allocations
    /// @return the list of allocations and the list of corresponding probabilities
    function getAllocations(Map storage map) view external returns (uint[][] memory, uint[] memory) {
        uint n = map.elements.length;
        uint[][] memory allocations = new uint[][](n);
        uint[] memory p = new uint[](n);
        for (uint i=0;i<n;i++){
            allocations[i] = getShares(map.elements[i]);
            p[i] = map.elements[i].p;
        }
        return (allocations,p);
    }

    /// @param a allocation for which the probability is required
    /// @return the probability associated to the allocation
    function getP(Allocation calldata a) pure external returns (uint) {
        return a.p;
    }

    /// @param a allocation for which the winners per cluster are required
    /// @return the winners per cluster associated to the allocation
    function getShares(Allocation memory a) pure public returns (uint[] memory) {
        return Zipper.unzipArrayWithSize(a.shares,8);
    }

    /// @param map dictionary containing allocations
    /// @param index allocation for which the probability is required
    /// @return the allocation stored at a specified index
    function getAllocationAt(Map storage map, uint index) view external returns (Allocation memory) {
        require(index >= 0 && index < map.elements.length, "Map out of bounds"); 
        return map.elements[index];
    }
}
