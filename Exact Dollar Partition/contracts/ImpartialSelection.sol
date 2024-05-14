// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./Allocations.sol";
import "./ExactDollarPartition.sol";
import "./Phases.sol";
import "./Proposals.sol";
import "./Zipper.sol";

import "./Token.sol";
import "./ImpartialSelectionInterface.sol";

/// @title Impartial Selection base implementation
/// @author Giovanni Rescinito
/// @notice smart contract implementing the base system proposed, no scores data structure supplied, needs to be extended
abstract contract ImpartialSelection is IERC721Receiver, ImpartialSelectionInterface, AccessControl{
    uint[][] internal partition;                        // matrix of the clusters in which proposals are divided
    uint8 internal currentPhase = 0;                    // current phase in which the system is
    mapping(uint => uint) internal scoreAccumulated;    // accumulators data structure, key is the proposal index, value is the sum of the scores
    Allocations.Map internal allocations;               // dictionary containing the possible allocations of winners per cluster
    Proposals.Set internal proposals;                   // set containing the proposals submitted
    Token internal token;                               // reference to PET token contract

    /// @notice checks if the user requesting a transaction is authorized to execute it
    modifier authorized(){
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Unauthorized operation");
        _;
    }

    /// @notice creates a new instance of the contract and connects the PET token contract
    /// @param tokenAddress address of the PET token to connect to the contract
    constructor(address tokenAddress) public{
        token = Token(tokenAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());    
    }

    /// @notice used by the token to check if the invoking contract is an instance of an impartial selection contract
    /// @return the value resulting from the check
    function isImpartialSelection() external view override returns(bool){
        return (address(token) == msg.sender);
    }

    /// @notice sets the following contract as a minter for PET tokens
    function finalizeCreation() external override{
        grantRole(DEFAULT_ADMIN_ROLE,address(this));
        token.addMinter();    
    }

    /// @notice callback invoked on receiving a token
    /// @param operator the address transferring the token
    /// @param from the owner of the token
    /// @param tokenId the token id
    /// @param data eventual data transferred
    /// @return the selector of the function
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4){
        return this.onERC721Received.selector; 
    }

    /// @notice getter returning the token contract
    /// @return the address locating the token contract
    function getTokenAddress() external view override returns (address){
        return address(token);
    }

    /// @notice updates the current phase of the contract
    /// @param p the phase the contract should be put in
    function setCurrentPhase(uint8 p) external override authorized(){
        require (p == currentPhase + 1, "Jumping between phases" );
        currentPhase = p;
    }

    /// @notice getter returning the current phase of the contract
    /// @return a value from the Phases enumeration, representing current state of the contract
    function getCurrentPhase() external view override returns (uint8){
        return currentPhase;
    }

    /// @notice ends submission phase and starts assignment phase
    function endSubmissionPhase() external override authorized(){
        Phases.endSubmissionPhase();
    }

    /// @notice ends assignment phase and starts commitment phase
    function endAssignmentPhase() external override authorized(){
        Phases.endAssignmentPhase();
    }

    /// @notice ends commitment phase and starts reveal phase
    function endCommitmentPhase() public virtual override authorized(){
        Phases.endCommitmentPhase();
    }

    /// @notice ends reveal phase and starts selection phase
    function endRevealPhase() public virtual override authorized(){
        Phases.endRevealPhase();
    }

    /// @notice getter returning the clusters in which the proposals are divided
    /// @return the unzipped version of partition data structure, storing clusters
    function getPartition() external view override returns(uint[][] memory){
        return Zipper.unzipMatrix(partition,16);
    }
    
    /// @notice getter returning the different possible combinations of winners per cluster found by the apportionment algorithm
    /// @return the list of possible allocations and a list of their corresponding probabilities of being selected
    function getAllocations() external view override returns (uint[][] memory, uint[] memory){
        return Allocations.getAllocations(allocations);
    }

    /// @notice getter returning the reviews assignment correponding to a given tokenId
    /// @param tokenId the token id corresponding to the proposal for which the assignment is required
    /// @return the list of proposals assigned for the review to the owner of the token identified by tokenId
    function getAssignmentByToken(uint tokenId) external view override returns(uint[] memory){
        return Proposals.getAssignmentByToken(proposals, tokenId);
    }

    /// @notice getter returning the reviews assignment correponding to a given proposal id
    /// @param id the identifier corresponding to the proposal in the proposals set
    /// @return the list of proposals assigned for the review to the id specified
    function getAssignmentById(uint id) external view override returns(uint[] memory){
        return Proposals.getAssignment(Proposals.getProposalAt(proposals, id));
    }

    /// @notice getter returning the work proposed by a specified proposal id
    /// @param id the identifier corresponding to the proposal in the proposals set
    /// @return the work stored in the proposals set related to the id provided
    function getWorkById(uint id) external view override returns(bytes memory){
        return Proposals.getWork(Proposals.getProposalAt(proposals, id));
    }

    /// @notice used to submit a work to the system and to receive the corresponding token minted
    /// @param work the work an agent wishes to submit
    function submitWork(bytes calldata work) external override{
        Phases.checkPhase(Phases.Phase.Submission);
        Proposals.Proposal memory p = Proposals.propose(proposals, work);
        uint tokenId = token.mint(msg.sender);
        Proposals.setToken(proposals, p, tokenId);
    }

    /// @notice creates a partition of the proposals using the algorithm defined in the library
    /// @param l the number of clusters to create
    function createPartition(uint l) external override authorized(){
        Phases.checkPhase(Phases.Phase.Assignment);
        partition = ExactDollarPartition.createPartition(proposals, l);
    }

    /// @notice provides an externally created partition of the proposals to store on the blockchain
    /// @param part the partition to be stored
    function providePartition(uint[][] calldata part) external override authorized(){
        Phases.checkPhase(Phases.Phase.Assignment);
        partition = Zipper.zipMatrix(part,16);
    }

    /// @notice creates the review assignments to the proposals using the algorithm defined in the library
    /// @param m the number of reviews assigned to each user
    function generateAssignments(uint m) external override authorized(){
        Phases.checkPhase(Phases.Phase.Assignment);
        require(partition.length!=0,"Paritition uninitialized");
        ExactDollarPartition.generateAssignments(partition,proposals,m);
    }
    
    /// @notice provides an externally created assignment of the reviews to store on the blockchain
    /// @param assignments the assignment to be stored
    function provideAssignments(uint[][] calldata assignments) external override authorized(){
        Phases.checkPhase(Phases.Phase.Assignment);
        uint n = Proposals.length(proposals);
        require(n == assignments.length, "Different number of assignments than proposals");
        for (uint i = 0; i<n; i++){
            Proposals.updateAssignment(proposals, i, assignments[i]);
        }
    }
    
    /// @notice stores a commitment of the evaluations for the assigned reviews on the blockchain, after verifying that the user is authorized
    /// @param commitment the commitment to be stored
    /// @param tokenId the token id associated to the proposal for which the assignment was generated
    function commitEvaluations(bytes32 commitment, uint tokenId) external override{
        Phases.checkPhase(Phases.Phase.Commitment);
        token.safeTransferFrom(msg.sender, address(this), tokenId);
        Proposals.setCommitment(proposals, tokenId, commitment);
    }

    /// @notice reveals the content of the commitment and checks the correspondance with the one stored on the blockchain
    /// @param tokenId the token id associated to the proposal for which the assignment was generated
    /// @param randomness the randomness used to generate the commitment
    /// @param evaluations the evaluations proposed for the reviews assigned, used to generate the commitment
    /// @return the assignment used to generate the commitment
    function revealEvaluations(uint tokenId, uint randomness, uint[] calldata evaluations, uint[] calldata assignments) public virtual override returns (uint[] memory){
        Phases.checkPhase(Phases.Phase.Reveal);
        Proposals.Proposal memory p = Proposals.getProposalByToken(proposals,tokenId);
        bytes32 commitment = Proposals.getCommitment(p);
        require(commitment != bytes32(0), "Commitment not set");
        require(assignments.length == evaluations.length, "Incoherent dimensions between assignments and evaluations");
        require(keccak256(abi.encodePacked(randomness,assignments,evaluations)) == commitment, "Failure reveal!");
        emit Proposals.Revealed(commitment,randomness,assignments,evaluations,tokenId);
    }

    /// @notice executes the actual selection by invoking Exact Dollar Partition
    /// @param k the number of winners to select
    /// @param randomness the randomness used to select the allocation of winners per cluster to use
    function impartialSelection(uint k, uint randomness) public override authorized(){
        Phases.checkPhase(Phases.Phase.Selection);
        require(k <= Proposals.length(proposals), "More winners than participants");
        ExactDollarPartition.exactDollarPartition(partition, scoreAccumulated, allocations, randomness, k);
        Phases.endSelectionPhase();
    }
    
}