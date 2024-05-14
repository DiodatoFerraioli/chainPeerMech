// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./ImpartialSelectionInterface.sol";

/// @title Proposal Evaluation Token
/// @author Giovanni Rescinito
/// @notice ERC721 token used to authorize agents to commit their evaluations
contract Token is Context, AccessControl, ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    mapping(uint => address) private tokenMinter;                       // maps the token to the contract that minted it
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");     // constant used to identify minters
    
    event TokenAssigned(address to, uint tokenId);
    
    /// @notice creates a new instance of the token contract
    /// @param name name of the token created
    /// @param symbol symbol associated to the token
    /// @param baseURI uri used as a prefix to identify tokens through strings
    constructor(string memory name, string memory symbol, string memory baseURI) public ERC721(name, symbol) {
        _setBaseURI(baseURI);
    }

    /// @notice grants the minter role to the invoking contract
    function addMinter() external {
        require(ImpartialSelectionInterface(_msgSender()).isImpartialSelection(), "Sender is not using PET");
        _setupRole(MINTER_ROLE, _msgSender());
    }

    /// @notice creates a new token and assigns it to the user submitting the proposal
    /// @param to address of the submitter receiving the token
    /// @return the id of the created token
    function mint(address to) public virtual returns (uint) {
        require(hasRole(MINTER_ROLE, _msgSender()), "Token: must have minter role to mint");
        uint tokenId = _tokenIdTracker.current();
        _mint(to,tokenId);
        _tokenIdTracker.increment();
        tokenMinter[tokenId] = _msgSender();
        emit TokenAssigned(to, tokenId);
        return tokenId;
    }

    /// @notice checks authorizations for token transfer
    /// @param from address transferring the token
    /// @param to address receiving the token
    /// @param tokenId id of the transferred token
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721) {
        require(from == address(0) || (hasRole(MINTER_ROLE, to) && tokenMinter[tokenId] == to), "Token: must be sent to the contract that created it");
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
