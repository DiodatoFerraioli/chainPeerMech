// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

/// @title Utility functions
/// @author Giovanni Rescinito
/// @notice math utilities and sorting functions
library Utils {
    //Constants
    uint constant public C = 2**16-1;       // constant used to scale value
    
    //Data Structures

    /// @notice container used to maintain agent id and score together
    struct Element {
        uint id;                        // agent id
        uint value;                     // score
    }

    //Math functions

    /// @notice returns the smallest integer value that is bigger than or equal to a number, using scaling by C
    /// @param x the value to be rounded
    /// @return the rounded value
    function ceil(uint x) pure public returns (uint){
        return ((x + C - 1) / C) * C;
    }

    /// @notice returns the largest integer value that is less than or equal to a number, using scaling by C
    /// @param x the value to be rounded
    /// @return the rounded value
    function floor(uint x) pure public returns (uint){
        return (x/C)*C;
    }

    /// @notice returns the nearest integer to a number, using scaling by C
    /// @param x the value to be rounded
    /// @return the rounded value
    function round(uint x) pure public returns (uint){
        if (x-floor(x) < C/2){
            return floor(x);
        }else{
            return ceil(x);
        }
    }

    /// @notice produces a range of n values, from 0 to n-1
    /// @param upper the number values to produce
    /// @return a list of integer values, from 0 to upper-1
    function range(uint upper) pure external returns (uint[] memory) {
        uint[] memory a = new uint[](upper);
        for (uint i=0;i<upper;i++){
            a[i] = i;
        }
        return a;
    }
    
    //Sorting functions

    /// @notice sorts a list of values in ascending order
    /// @param data the list of values to order
    /// @return the ordered values with the corresponding ordered indices
    /// base implementation provided by https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f
    function sort(uint[] calldata data) pure external returns(Element[] memory) {
        Element[] memory dataElements = new Element[](data.length);
        for (uint i=0; i<data.length; i++){
            dataElements[i] = Element(i,data[i]);
        }
       quickSort(dataElements, int(0), int(dataElements.length - 1));
       return dataElements;
    }
    
    /// @notice implements sorting using quicksort algorithm
    /// @param arr the list of elements to order
    /// @param left the starting index of the subset of values ordered
    /// @param right the final index of the subset of values ordered
    /// base implementation provided by https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f
    function quickSort(Element[] memory arr, int left, int right) pure internal{
        int i = left;
        int j = right;
        if(i==j) return;
        uint pivot = arr[uint(left + (right - left) / 2)].value;
        while (i <= j) {
            while (arr[uint(i)].value < pivot) i++;
            while (pivot < arr[uint(j)].value) j--;
            if (i <= j) {
                (arr[uint(i)], arr[uint(j)]) = (arr[uint(j)], arr[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSort(arr, left, j);
        if (i < right)
            quickSort(arr, i, right);
    }
}