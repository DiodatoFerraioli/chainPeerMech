// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

import "./ImpartialSelectionInterface.sol";

/// @title Execution Phases
/// @author Giovanni Rescinito
/// @notice phases occurring the system execution
library Phases{
    // Enumeration of the possible execution phases of the system
    enum Phase {Submission, 
                Assignment, 
                Commitment, 
                Reveal, 
                Selection, 
                Completed}

    /// @notice checks that the contract's current phase is the expected one
    /// @param p expected phase
    modifier check(Phase p) {
        checkPhase(p);
        _;
    }

    /// @notice checks that the contract's current phase is the expected one
    /// @param p expected phase
    function checkPhase(Phase p) view public {
        require(ImpartialSelectionInterface(address(this)).getCurrentPhase() == uint8(p), "Different phase than expected"); 
    }

    /// @notice updates the current phase of the contract
    /// @param phase the phase the contract should be put in
    function changePhase(Phase phase) private {
        ImpartialSelectionInterface(address(this)).setCurrentPhase(uint8(phase));
    }

    /// @notice ends submission phase and starts assignment phase
    function endSubmissionPhase() external check(Phase.Submission) {
        changePhase(Phase.Assignment);
    }

    /// @notice ends assignment phase and starts commitment phase
    function endAssignmentPhase() external check(Phase.Assignment) {
        changePhase(Phase.Commitment);
    }

    /// @notice ends commitment phase and starts reveal phase
    function endCommitmentPhase() external check(Phase.Commitment){
        changePhase(Phase.Reveal);
    }

    /// @notice ends reveal phase and starts selection phase
    function endRevealPhase() external check(Phase.Reveal){
        changePhase(Phase.Selection);
    }

    /// @notice ends selection phase and starts completed phase
    function endSelectionPhase() external check(Phase.Selection) {
        changePhase(Phase.Completed);
    }
}