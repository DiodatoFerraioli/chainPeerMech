// Artifacts
const PN = artifacts.require("PeerNomination");
const IpfsStorage = artifacts.require("IpfsStorage");
const Crypto = artifacts.require("Crypto");

// Libraries
const fs = require('fs');
const bigInt = require('big-integer');
const { create } = require("ipfs-http-client");
const { exit } = require('process');
const nodecallspython = require("node-calls-python");

// This function converts from decimal to hexadecimal
function dec2hex(str) {
  var dec = str.toString().split(''), sum = [], hex = [], i, s;
  while(dec.length) {
    s = 1 * dec.shift();
    for(i = 0; s || i < sum.length; i++) {
      s += (sum[i] || 0) * 10;
      sum[i] = s % 16;
      s = (s - sum[i]) / 16;
    }
  }
  while(sum.length) {
    hex.push(sum.pop().toString(16));
  }
  return hex.join('');
}

module.exports = async function(callback) {
  try {
    
    // Parameters of test
    const numUsers = 30;
    const numReviewers = 7;
    const numWinners = 5;
    const nomQuota = Math.floor((numWinners * numReviewers) / numUsers);
    const prob = (numWinners * numReviewers) / numUsers - nomQuota;

    const accounts = await web3.eth.getAccounts();
    const py = nodecallspython.interpreter;

    // Owner (administrator of election) delivers smart contracts on blockchain
    const pnContract = await PN.deployed({from: accounts[0]});
    const ipfsContract = await IpfsStorage.deployed({from: accounts[0]});
    const cryptoContract = await Crypto.deployed({from: accounts[0]});

    // IPFS client is instantiated
    const ipfs = create("/ip4/127.0.0.1/tcp/5002/http");

    const prime = bigInt(web3.utils.hexToNumberString((await cryptoContract.prime()).val));
    const g = bigInt(web3.utils.hexToNumberString((await cryptoContract.g()).val));

    // Owner divides the secret into numUsers parts and calculates the public key based on the secret which he stores on the blockchain
    const secretKey = bigInt.randBetween(1, prime.minus(1));
    const publicKeyThreshold = g.modPow(secretKey, prime);
    var splitSecretKey = [];
    var x1, x2;
    for (var u = 0; u < numUsers; u++) {
      if (u == 0) {
        x1 = bigInt.randBetween(1, secretKey);
        x2 = secretKey.minus(x1);
        splitSecretKey.push(x1);
      }
      else if (u == numUsers - 1) {
        splitSecretKey.push(x2);
      }
      else {
        x1 = bigInt.randBetween(1, x2);
        x2 = x2.minus(x1);
        splitSecretKey.push(x1);
      }
    }
    console.log("setPublicKey: ", (await cryptoContract.setPublicKey('0x'+dec2hex(publicKeyThreshold.toString(10)), {from: accounts[0]})).receipt.gasUsed);

    // Owner enables registration phase
    console.log("registrationPhaseOn: ", (await pnContract.registrationPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Users register themselves on the blockchain
    var sumTransaction = 0;
	  var privateKeys = [];
    for(var u = 0; u < numUsers; u++) {
	    privateKeys[u] = bigInt.randBetween(1, prime.minus(1));
      sumTransaction += (await pnContract.insertUsers('0x'+dec2hex((g.modPow(privateKeys[u], prime)).toString(10)), {from: accounts[u]})).receipt.gasUsed;
    }
    console.log("insertUsers avg: ", sumTransaction / numUsers);

    // Owner sends to each user encrypted part of secret
    sumTransaction = 0;
    fs.writeFileSync('./file/cypher.txt', '');
    for(var u = 0; u < numUsers; u++) {
      var y = bigInt.randBetween(1, prime.minus(1));
      var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), await pnContract.publicKey(accounts[u]), '0x'+dec2hex('1'), '0x'+dec2hex((splitSecretKey[u]).toString(10)));
      fs.appendFileSync('./file/cypher.txt', accounts[u]);
      fs.appendFileSync('./file/cypher.txt', '\n');
      fs.appendFileSync('./file/cypher.txt', cyphertext[0]);
      fs.appendFileSync('./file/cypher.txt', '\n');
      fs.appendFileSync('./file/cypher.txt', cyphertext[1]);
      if(u != numUsers - 1) {
        fs.appendFileSync('./file/cypher.txt', '\n');
        fs.appendFileSync('./file/cypher.txt', '\n');
      }
    }
    console.log("setCypher: ", (await ipfsContract.setCypher((await ipfs.add(fs.readFileSync('./file/cypher.txt'))).path, {from: accounts[0]})).receipt.gasUsed);

    // Owner enables assignmet phase
    console.log("assignmentPhaseOn: ", (await pnContract.assignmentPhaseOn({from: accounts[0]})).receipt.gasUsed);
    
    // Owner encrypts each users assignment using the public key of the corresponding user
    var agents = [];
    for(var i = 0; i < numUsers; i++) {
      agents.push(i);
    }
    var ass = [];
    await py.import("./genProfile.py").then(async function(pymodule) {
      const result = await py.call(pymodule, "generate_approx_m_regular_assignment", agents, numReviewers);
      for(var i = 0; i < numUsers; i++) {
        ass.push(result[i.toString(10)]);
      }
    });
    fs.writeFileSync('./file/assignments.txt', '');
    for(var u = 0; u < numUsers; u++) {
      for(var i = 0; i < ass[u].length; i++) {
        var y = bigInt.randBetween(1, prime.minus(1));
        var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), await pnContract.publicKey(accounts[u]), '0x'+dec2hex('1'), '0x'+dec2hex((ass[u][i]+1).toString(10)));
        fs.appendFileSync('./file/assignments.txt', cyphertext[0]);
        fs.appendFileSync('./file/assignments.txt', '\n');
        fs.appendFileSync('./file/assignments.txt', cyphertext[1]);
        if(i != ass[u].length - 1) {
          fs.appendFileSync('./file/assignments.txt', '\n');
        }
      }
      if(u != numUsers - 1) {
        fs.appendFileSync('./file/assignments.txt', '\n');
        fs.appendFileSync('./file/assignments.txt', '\n');
      }
    }
    console.log("assignments: ", ass);
    console.log("setAssignments: ", (await ipfsContract.setAssignment((await ipfs.add(fs.readFileSync('./file/assignments.txt'))).path, {from: accounts[0]})).receipt.gasUsed);

    // Owner enables commit phase
    console.log("commitPhaseOn: ", (await pnContract.commitPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each user decides its rank
    sumTransaction = 0;
    var quality = [];
    for(var u = 0; u < numUsers; u++) {
      quality[u] = Math.floor(Math.random() * 95);
    }
    console.log("quality: ", quality);
    var ranks = [];
    var commits = [];
    for(var u = 0; u < numUsers; u++) {
      var rank = [];
      var commit = [];
      var r = [];
      for(var i = 0; i < numReviewers; i++) {
        r.push(quality[ass[u][i]] + Math.floor(Math.random() * 5));
      }
      console.log(r);
      var sorted = r.slice();
      sorted.sort(function(a , b) {
        if(a > b) return 1;
        if(a < b) return -1;
        return 0;
      });
      console.log(sorted);
      sorted.reverse().splice(nomQuota + 2, );
      for(i = 0; i < sorted.length; i++) {
        rank.push(ass[u][r.indexOf(sorted[i])]);
      }
      fs.writeFileSync('./file/rank'+u.toString(10)+'.txt', '');
      for(var i = 0; i < rank.length; i++) {
        var y = bigInt.randBetween(1, prime.minus(1));
        var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), '0x'+dec2hex(publicKeyThreshold.toString(10)), '0x'+dec2hex('1'), '0x'+dec2hex((rank[i]+1).toString(10)));
        fs.appendFileSync('./file/rank'+u.toString(10)+'.txt', cyphertext[0]);
        fs.appendFileSync('./file/rank'+u.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/rank'+u.toString(10)+'.txt', cyphertext[1]);
        if(i != rank.length - 1) {
          fs.appendFileSync('./file/rank'+u.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/rank'+u.toString(10)+'.txt', '\n');
        }
        commit.push(cyphertext[0]);
        commit.push(cyphertext[1]);
      }
      ranks.push(rank);
      commits.push(commit);
      sumTransaction += (await ipfsContract.setRank(accounts[u], (await ipfs.add(fs.readFileSync('./file/rank'+u.toString(10)+'.txt'))).path, {from: accounts[u]})).receipt.gasUsed;
    }
    console.log("Ranks: ", ranks);
    console.log("setRank avg: ", sumTransaction / numUsers);

    // Owner enables reveal phase
    console.log("revealPhaseOn: ", (await pnContract.revealPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each user decrypts c1 of users commits with personal part of secret key
    sumTransaction = 0;
    var decUsers = [];
    for(var u = 0; u < numUsers; u++) {
      var dec = [];
      fs.writeFileSync('./file/dec'+u.toString(10)+'.txt', '');
      for(var i = 0; i < commits.length; i++) {
        for(var j = 0; j < commits[i].length; j+=2) {
          var tmp = await cryptoContract.ElGamalDecPart1(commits[i][j], '0x'+dec2hex(splitSecretKey[u].toString(10)));
          dec.push(tmp);
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', tmp);
          if(j != commits[i].length - 2) {
            fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
          }
        }
        if(i != commits.length - 1) {
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
        }
      }
      decUsers.push(dec);
      sumTransaction += (await ipfsContract.setDecC1(accounts[u], (await ipfs.add(fs.readFileSync('./file/dec'+u.toString(10)+'.txt'))).path, {from: accounts[u]})).receipt.gasUsed;
    }
    console.log("setDecC1 avg: ", sumTransaction / numUsers);

    // Owner reveals ranks
    fs.writeFileSync('./file/revealRanks.txt', '');
    for(var i = 0; i < ranks.length; i++) {
      for(var j = 0; j < ranks[i].length; j++) {
        fs.appendFileSync('./file/revealRanks.txt', ranks[i][j].toString(10));
        if(j != ranks[i].length - 1) {
          fs.appendFileSync('./file/revealRanks.txt', '\n');
        }
      }
      if(i != ranks.length - 1) {
        fs.appendFileSync('./file/revealRanks.txt', '\n');
        fs.appendFileSync('./file/revealRanks.txt', '\n');
      }
    }
    console.log("setRevealRanks: ", (await ipfsContract.setRevealRanks(accounts[0], (await ipfs.add(fs.readFileSync('./file/revealRanks.txt'))).path, {from: accounts[0]})).receipt.gasUsed);

    // Owner enables selection phase
    console.log("selectionPhaseOn: ", (await pnContract.selectionPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Owner counts the occurrences of each user's choice by reviewers
    var rand = [];
    for(var i = 0; i < numUsers; i++) {
      rand.push(Math.floor(Math.random() * 100));
    }
    console.log(rand);
    console.log(prob);
    console.log("countPeer: ", (await pnContract.countPeer(ranks, rand, Math.floor(prob*100), {from: accounts[0]})).receipt.gasUsed);

    for(var i = 0; i < numUsers; i++) {
      console.log(await pnContract.count(i));
    }
    
    // Anyone can get winners
    const winners = await pnContract.selectionWinners(Math.floor((numReviewers / 2) + 1), numWinners);
    for(var i = 0; i < winners.length; i++) {
      console.log(winners[i]['words'][0]);
    }
  }
  catch(error) {
    console.log(error);
  }
  callback();

}