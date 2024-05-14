// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./Zipper.sol";

/// @title Set containing proposals
/// @author Giovanni Rescinito
/// @notice proposals submitted by agents, along with the corresponding assignment and commitment
library Proposals{
    //Data Structures

    /// @notice Data structure related to a single proposal
    struct Proposal {
        uint assignment;        // zipped assignment associated to the proposal
        bytes32 commitment;     // commitment associated to the proposal
        bytes work;             // work submitted
    }

    /// @notice Set data structure containing proposals
    struct Set {
        Proposal[] elements;                    // list of the proposals submitted
        mapping (bytes32 => uint) idx;          // maps the proposal to the index in the list
        mapping (uint => uint) tokenToIndex;    // maps the token associated to the proposal to the corresponding index in the list
    }

    //Events
    event ProposalSubmitted(bytes32 hashedWork, uint ID);
    event Committed(uint tokenId, bytes32 commitment);
    event Revealed(bytes32 commitment,uint randomness, uint[] assignments, uint[] evaluations, uint tokenId);

    /// @notice checks that the index corresponds to an existing value in the set
    /// @param s the set to check
    /// @param index the index to check
    modifier checkIndex(Set storage s, uint index) {
        require(index >= 0 && index < s.elements.length, "Set out of bounds");
        _;
    }

    //Utility

    /// @notice returns the number of proposals submitted
    /// @param s set containing proposals
    /// @return the length of the list contained in the set
    function length(Set storage s) view external returns (uint) {
        return s.elements.length;
    }

    /// @notice hashes the work submitted to obtain the index of the set
    /// @param work the work to be hashed
    /// @return the keccak256 hash of the work
    function encodeWork(bytes calldata work) pure private returns (bytes32){
        return keccak256(abi.encodePacked(work));
    }

    //Setters

    /// @notice stores a proposal in the set
    /// @param s set containing proposals
    /// @param work the work submitted
    /// @return the proposal created from the work
    function propose(Set storage s, bytes calldata work) external returns (Proposal memory){
        bytes32 h = encodeWork(work);
        uint index = s.idx[h];
        require(index == 0, "Work already proposed");
        Proposal memory p = Proposal(0, 0x0, work);
        s.elements.push(p);
        index = s.elements.length;
        s.idx[h] = index;
        emit ProposalSubmitted(h, index - 1);
        return p;
    }

    /// @notice updates the assignment in the set given a specific index
    /// @param s set containing proposals
    /// @param index index in the list of elements of the set to update
    /// @param assignment the assignment to be stored
    function updateAssignment(Set storage s, uint index, uint[] calldata assignment) external checkIndex(s, index) {
        s.elements[index].assignment = Zipper.zipArrayWithSize(assignment,16);
    }

    /// @notice associates a proposal to a token
    /// @param s set containing proposals
    /// @param p proposal to consider
    /// @param tokenId token to associate to the proposal
    function setToken(Set storage s, Proposal calldata p, uint tokenId) external{
        s.tokenToIndex[tokenId] = getId(s, p);
    }

    /// @notice stores the commitment in the proposal considered
    /// @param s set containing proposals
    /// @param tokenId token associated to the proposal for which the evaluations' commitment should be stored
    /// @param com the commitment to save
    function setCommitment(Set storage s, uint tokenId, bytes32 com)  external{
        uint id = getIdFromToken(s,tokenId);
        require(id >= 0 && id < s.elements.length, "Set out of bounds"); 
        s.elements[id].commitment = com;
        emit Committed(tokenId, com);
    }

    //Getters

    /// @param p proposal considered
    /// @return the assignment associated to the proposal
    function getAssignment(Proposal calldata p) pure external returns (uint[] memory) {
        return Zipper.unzipArrayWithSize(p.assignment,16);
    }

    /// @param p proposal considered
    /// @return the work associated to the proposal
    function getWork(Proposal calldata p) pure external returns (bytes memory) {
        return p.work;
    }

    /// @param p proposal considered
    /// @return the commitment associated to the proposal
    function getCommitment(Proposal calldata p) pure external returns (bytes32){
        return p.commitment;
    }

    /// @param s set containing proposals
    /// @param p proposal considered
    /// @return the index associated to the proposal
    function getId(Set storage s, Proposal calldata p) view private returns (uint){
        return s.idx[encodeWork(p.work)];
    }

    /// @param s set containing proposals
    /// @param tokenId the token associated to the proposal
    /// @return the index associated to the proposal
    function getIdFromToken(Set storage s, uint tokenId) view public returns (uint){
        uint id = s.tokenToIndex[tokenId];
        require(id != 0, "Token unavailable");
        return id - 1;
    }
    
    /// @param s set containing proposals
    /// @param index the index in the list of proposals
    /// @return the proposal associated to the index in the list
    function getProposalAt(Set storage s, uint index) view public checkIndex(s, index) returns (Proposal memory) {
        return s.elements[index];
    }

    /// @param s set containing proposals
    /// @param tokenId the token associated to the proposal
    /// @return the proposal associated to the token provided
    function getProposalByToken(Set storage s, uint tokenId) view public returns (Proposal memory){
        return getProposalAt(s, getIdFromToken(s,tokenId));
    }

    /// @param s set containing proposals
    /// @param tokenId the token associated to the proposal
    /// @return the assignment associated to the proposal related to the token provided
    function getAssignmentByToken(Set storage s, uint tokenId) view external returns (uint[] memory) {
        Proposal memory p = getProposalByToken(s, tokenId);
        return Zipper.unzipArrayWithSize(p.assignment,16);
    }
}