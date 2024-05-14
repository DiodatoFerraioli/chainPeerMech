var Allocations = artifacts.require("Allocations");
var ExactDollarPartition = artifacts.require("ExactDollarPartition");
var ExactDollarPartitionMap = artifacts.require("ExactDollarPartitionMap");
var ExactDollarPartitionMatrix = artifacts.require("ExactDollarPartitionMatrix");
var ExactDollarPartitionNoStorage = artifacts.require("ExactDollarPartitionNoStorage");
var Phases = artifacts.require("Phases");
var Proposals = artifacts.require("Proposals");
var Scores = artifacts.require("Scores");
var Utils = artifacts.require("Utils");
var Zipper = artifacts.require("Zipper");

var Token = artifacts.require("Token");

module.exports = function (deployer) {
  deployer.deploy(Phases,{overwrite:true});
  deployer.deploy(Utils, {overwrite: true});
  deployer.deploy(Zipper,{overwrite:true});

  deployer.link(Zipper, Allocations);
  deployer.link(Zipper, Proposals);
  deployer.link(Zipper, Scores);
  
  deployer.deploy(Allocations, {overwrite: true});
  deployer.deploy(Proposals, {overwrite: true});
  deployer.deploy(Scores,{overwrite:true});
  
  deployer.link(Allocations, ExactDollarPartition);
  deployer.link(Proposals, ExactDollarPartition);
  deployer.link(Utils, ExactDollarPartition);
  deployer.link(Zipper, ExactDollarPartition);
    
  deployer.deploy(ExactDollarPartition,{overwrite:true});

  deployer.link(ExactDollarPartition, ExactDollarPartitionMap);
  deployer.link(Scores, ExactDollarPartitionMap);
  deployer.link(Utils, ExactDollarPartitionMap);
  deployer.link(Zipper, ExactDollarPartitionMap);
  
  deployer.deploy(ExactDollarPartitionMap,{overwrite:true});

  deployer.link(ExactDollarPartition, ExactDollarPartitionMatrix);
  deployer.link(Utils, ExactDollarPartitionMatrix);
  deployer.link(Zipper, ExactDollarPartitionMatrix);
  
  deployer.deploy(ExactDollarPartitionMatrix,{overwrite:true});

  deployer.link(ExactDollarPartition, ExactDollarPartitionNoStorage);
  deployer.link(Utils, ExactDollarPartitionNoStorage);
  deployer.link(Zipper, ExactDollarPartitionNoStorage);

  deployer.deploy(ExactDollarPartitionNoStorage,{overwrite:true});

  deployer.deploy(Token,"Proposals Evaluation Token", "PET", "evaluation");
};
