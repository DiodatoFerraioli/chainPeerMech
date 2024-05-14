var PeerNomination = artifacts.require("./PeerNomination.sol");

module.exports = function(deployer) { 
 deployer.deploy(PeerNomination); 
};