// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./DecimalMath.sol";

contract PiecewiseUniform {

    using DecimalMath for *;

    uint64 numUsers;
    uint24 numOracles;
    uint8 boolean; // Nan, Nan, finish, revealPhase, verifyPhase, mixnetPhase, commitPhase, registrationPhase
    address immutable owner;

    address[] usersAddress;
    address[] oraclesAddress;

    struct Phantom {
        DecimalMath.UFixed offsetBlack;
        DecimalMath.UFixed startRed;
        DecimalMath.UFixed offsetRed;
    }

    mapping(address => bytes) public publicKey;
    mapping(address => Phantom) phantom;
    mapping(address => DecimalMath.UFixed) result;

    error Unauthorized();
    error NotRegistrationPhase();
    error NotCommitPhase();
    error AlreadyCommitted();

    // Constructor initializes variables
    constructor() {
        owner = msg.sender;
    }

    // These functions update phases
    function registrationPhaseOn() external {
        if(owner != msg.sender) {
            revert Unauthorized();
        }
        boolean = 1;
    }
    function commitPhaseOn() external {
        if(owner != msg.sender && boolean != 1) {
            revert Unauthorized();
        }
        boolean = 2;
    }
    function mixnetPhaseOn() external {
        if(owner != msg.sender && boolean != 2) {
            revert Unauthorized();
        }
        boolean = 4;
    }
    function verifyPhaseOn() external {
        if(owner != msg.sender && boolean != 4) {
            revert Unauthorized();
        }
        boolean = 8;
    }
    function revealPhaseOn() external {
        if(owner != msg.sender && boolean != 8) {
            revert Unauthorized();
        }
        boolean = 16;
    }

    // This functions store users
    function insertUsers(bytes calldata _publicKey) external {
        if(boolean != 1) {
            revert NotRegistrationPhase();
        }
        usersAddress.push(msg.sender);
        publicKey[msg.sender] = _publicKey;
        ++numUsers;
    }

    // This function computes phantom values for a given t
    function computePhantomValues(uint num, uint den) external {
        Phantom storage f = phantom[msg.sender];
        uint threshold = (numUsers >> 1) + 1;
        uint doublenum = num << 1;
        uint nUden = numUsers * den;
        uint dNnU = doublenum * numUsers;
        uint ddn = doublenum << 1;
        uint td = 3 * den;
        if(DecimalMath.divd(num, den).lt(DecimalMath.toUFixed(1).divd(2))) {
            f.offsetBlack = DecimalMath.toUFixed(0);
            f.startRed = DecimalMath.divd((ddn * threshold) - dNnU, nUden);
            f.offsetRed = DecimalMath.divd(ddn, nUden);
        }
        else {
            f.offsetBlack = DecimalMath.divd((doublenum - den), nUden);
            f.startRed = DecimalMath.divd(dNnU + (threshold * td) - (doublenum * threshold) - (2 * nUden), nUden);
            f.offsetRed = DecimalMath.divd(td - doublenum, nUden);
        }
    }

    // This function computes median for each project
    function computePartition(uint[][] calldata allPartitions, uint percentageAccuracy, uint p, address addr) external view returns (DecimalMath.UFixed[] memory) {
        uint len = (numUsers << 1) + 1;
        uint offset = numUsers + 1;
        uint bound = (numUsers >> 1) + 1;
        uint lastPos;
        uint max = 10**percentageAccuracy;
        DecimalMath.UFixed[] memory tmp = new DecimalMath.UFixed[](len);
        tmp[0] = DecimalMath.UFixed(0);
        for(uint i = 1; i < len;) {
            if(i < bound) {
                tmp[i] = DecimalMath.addd(tmp[lastPos], phantom[addr].offsetBlack);
            }
            else if(i == bound) {
                tmp[i] = phantom[addr].startRed;
            }
            else if(i > bound && i <= numUsers) {
                tmp[i] = DecimalMath.addd(tmp[lastPos], phantom[addr].offsetRed);
            }
            else {
                tmp[i] = DecimalMath.divd(allPartitions[i-offset][p], max);
            }
            unchecked {
                ++lastPos;
                ++i;
            }
        }
        return tmp;
    }

    // This function sorts in increasing order given partition
    function sort(DecimalMath.UFixed[] memory a, uint len) external pure returns (DecimalMath.UFixed[] memory) {
        for(uint i = 1; i < len;) {
        DecimalMath.UFixed memory temp = a[i];
        uint k = i;
        while((k >= 1) && (temp.lt(a[k - 1]))) {
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

    // This function verifies that medians' normalization is achieved
    function verify(DecimalMath.UFixed[] calldata medians, uint numProjects) external {
        DecimalMath.UFixed memory count;
        for(uint p; p < numProjects;) {
            count = DecimalMath.addd(medians[p], count);
            unchecked {
                ++p;
            }
        }
        if(count.eq(1)) {
            boolean = 32;
        }
        result[msg.sender] = count;
    }

    // This function returns phantom values
    function getPhantoms(address addr) external view returns (DecimalMath.UFixed[3] memory) {
        return [phantom[addr].offsetBlack, phantom[addr].startRed, phantom[addr].offsetRed];
    }

    // These functions returns respectively sum of medians and flag that defines if process is ended or not
    function getSumMedians(address addr) external view returns (DecimalMath.UFixed memory) {
        return result[addr];
    }
    function getVerify() external view returns (bool) {
        if(boolean == 32) {
            return true;
        }
        else {
            return false;
        }
    }

}