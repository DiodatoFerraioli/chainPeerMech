// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./BigNumbers.sol";

contract Crypto is IBigNumbers {

    using BigNumbers for *;

    BigNumber public prime;        // prime
    BigNumber public g;            // generator
    BigNumber public publicKey;    // public key relative to secret key that has been splitted and shared with each user

    address immutable owner;

    // Constructor stores address of owner and cryptographic parameters
    constructor(bytes memory primeVal, bytes memory gVal) {
        owner = msg.sender;
        prime = primeVal.init(false);
        g = gVal.init(false);
    }
  
    // This function stores public key
    function setPublicKey(bytes calldata publicKeyVal) external {
        require(owner == msg.sender, "Unauthorized");
        publicKey = publicKeyVal.init(false);
    }
    
    // These function carry out El Gamal algorithm
    function ElGamalEnc(bytes calldata yVal, bytes calldata publicKeyVal, bytes calldata plaintext1Val, bytes calldata plaintext2Val) external view returns (bytes memory, bytes memory) {
        BigNumber memory y = yVal.init(false);
        return (((plaintext1Val.init(false)).modmul(g.prepare_modexp(y, prime), prime)).val, ((plaintext2Val.init(false)).modmul((publicKeyVal.init(false)).prepare_modexp(y, prime), prime)).val);
    }
    function ElGamalDecPart1(bytes calldata c1Val, bytes calldata secretKeyVal) external view returns (bytes memory) {
        return ((c1Val.init(false)).prepare_modexp(secretKeyVal.init(false), prime)).val;
    }
    function ElGamalDecPart2(bytes calldata c2Val, bytes calldata mulDecPart1Val, bytes calldata userResultVal) external view returns (bytes memory) {
        return ((c2Val.init(false)).modmul((mulDecPart1Val.init(false)).mod_inverse(prime, userResultVal.init(false)), prime)).val;
    }

    // This function verifies the generated proofs by oracles
    function verifyProof(bytes memory sVal, bytes memory cVal, bytes memory tVal, bytes[] calldata oldVal, bytes[] calldata newVal, bytes calldata userResult1Val, bytes calldata userResult2Val) external view returns (bool) {
        BigNumber memory s = sVal.init(false);
        BigNumber memory t = tVal.init(false);
        BigNumber memory c = cVal.init(false);
        BigNumber memory c1_old = oldVal[0].init(false);
        BigNumber memory c2_old = oldVal[1].init(false);
        BigNumber memory c1_new = newVal[0].init(false);
        BigNumber memory c2_new = newVal[1].init(false);
        BigNumber memory res1 = userResult1Val.init(false);
        BigNumber memory res2 = userResult2Val.init(false);
        if( (g.prepare_modexp(t, prime)).cmp((g.prepare_modexp(s, prime)).modmul((c1_new.modmul(c1_old.mod_inverse(prime, res1), prime)).prepare_modexp(c, prime) , prime), false) == 0) {
            if( (publicKey.prepare_modexp(t, prime)).cmp((publicKey.prepare_modexp(s, prime)).modmul((c2_new.modmul(c2_old.mod_inverse(prime, res2), prime)).prepare_modexp(c, prime), prime), false) == 0 ) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    // This function performs mixing with random permutation
    function shuffle(bytes[][] memory a) external view returns (bytes[][] memory) {
        uint currentIndex = a.length;
        bytes[] memory tmp;
        uint randomIndex;
        while(currentIndex != 0) {
            randomIndex = uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % currentIndex;
            currentIndex--;
            tmp = a[currentIndex];
            a[currentIndex] = a[randomIndex];
            a[randomIndex] = tmp;
        }
        return a;
    }
    
}