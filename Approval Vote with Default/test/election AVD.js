// Artifacts
const Election = artifacts.require("Election");
const IpfsStorage = artifacts.require("IpfsStorage");
const Crypto = artifacts.require("Crypto");

// Modules
const fs = require('fs');
const bigInt = require('big-integer');
const { create } = require("ipfs-http-client");
const { exit } = require('process');

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

function shuffle(array) {
  var currentIndex = array.length,  randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

module.exports = async function(callback) {
  try {

    // Parameters of test
    const numVoters = 10;
    const numServers = 10;

    // Candidate list
    const accounts = await web3.eth.getAccounts();
    console.log("List of candidates' addresses:\n", accounts);

    // Owner (administrator of election) deploys smart contracts on blockchain
    const electionContract = await Election.deployed({from: accounts[0]});
    const ipfsContract = await IpfsStorage.deployed({from: accounts[0]});
    const cryptoContract = await Crypto.deployed({from: accounts[0]});

    // IPFS client is instantiated
    const ipfs = create("/ip4/127.0.0.1/tcp/5002/http");

    const prime = bigInt(web3.utils.hexToNumberString((await cryptoContract.prime()).val));
    const g = bigInt(web3.utils.hexToNumberString((await cryptoContract.g()).val));

    // Owner divides the secret into numVoters parts and calculates the public key based on the secret which he stores on the blockchain
    const secretKey = bigInt.randBetween(1, prime.minus(1));
    const publicKeyThreshold = g.modPow(secretKey, prime);
    var splitSecretKey = [];
    var x1, x2;
    for(var v = 0; v < numVoters; v++) {
      if (v == 0) {
        x1 = bigInt.randBetween(1, secretKey);
        x2 = secretKey.minus(x1);
        splitSecretKey.push(x1);
      }
      else if (v == numVoters - 1) {
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
    console.log("registrationPhaseOn: ", (await electionContract.registrationPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Voters (who are also candidates) register themselves on the blockchain
    var sumTransaction = 0;
	  var privateKeys = [];
    for(var v = 0; v < numVoters; v++) {
	    privateKeys[v] = bigInt.randBetween(1, prime.minus(1));
      sumTransaction += (await electionContract.insertVoters('0x'+dec2hex((g.modPow(privateKeys[v], prime)).toString(10)), {from: accounts[v]})).receipt.gasUsed;
    }
    console.log("insertVoters avg: ", sumTransaction / numVoters);

    // Owner sends to each user encrypted part of secret
    sumTransaction = 0;
    fs.writeFileSync('./file/cypher.txt', '');
    for(var v = 0; v < numVoters; v++) {
      var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex((bigInt.randBetween(1, prime.minus(1))).toString(10)), await electionContract.getPublicKey(accounts[v]), '0x'+dec2hex('1'), '0x'+dec2hex((splitSecretKey[v]).toString(10)));
      fs.appendFileSync('./file/cypher.txt', accounts[v]);
      fs.appendFileSync('./file/cypher.txt', '\n');
      fs.appendFileSync('./file/cypher.txt', cyphertext[0]);
      fs.appendFileSync('./file/cypher.txt', '\n');
      fs.appendFileSync('./file/cypher.txt', cyphertext[1]);
      if(v != numVoters - 1) {
        fs.appendFileSync('./file/cypher.txt', '\n');
        fs.appendFileSync('./file/cypher.txt', '\n');
      }
    }
    console.log("setCypher: ", (await ipfsContract.setCypher((await ipfs.add(fs.readFileSync('./file/cypher.txt'))).path, {from: accounts[0]})).receipt.gasUsed);

    // Owner enables commit phase
    console.log("commitPhaseOn: ", (await electionContract.commitPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each voter encrypts its vote and commits the cyphertext
    sumTransaction = 0;
    var allVotes = [];
    var allCommits = [];
    for(var v = 0; v < numVoters; v++) {
      fs.writeFileSync('./file/commitVote'+v.toString(10)+'.txt', '');
      var votes = [];
      var candidates = [];
      for(var i = 0; i < numVoters; i++) {
        if(i != v) {
          candidates.push(i);
        }
      }
      var numVotes = Math.floor((Math.random()*(numVoters-1)) + 1);
      for(var i = 0; i < numVotes; i++) {
        shuffle(candidates);
        var candidate = candidates.pop();
        votes.push(candidate);
        var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex((bigInt.randBetween(1, prime.minus(1))).toString(10)), '0x'+dec2hex(publicKeyThreshold.toString(10)), '0x'+dec2hex('1'), '0x'+dec2hex((candidate+1).toString(10)));
        fs.appendFileSync('./file/commitVote'+v.toString(10)+'.txt', cyphertext[0]);
        fs.appendFileSync('./file/commitVote'+v.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/commitVote'+v.toString(10)+'.txt', cyphertext[1]);
        if(i != numVotes-1) {
          fs.appendFileSync('./file/commitVote'+v.toString(10)+'.txt', '\n');
        }
        allCommits.push([cyphertext[0], cyphertext[1]]);
      }
      allVotes.push(votes);
      sumTransaction += (await ipfsContract.setCommitVotes(accounts[v], (await ipfs.add(fs.readFileSync('./file/commitVote'+v.toString(10)+'.txt'))).path, {from: accounts[v]})).receipt.gasUsed;
    }
    console.log("Votes: ", allVotes);
    console.log("commitVote avg: ", sumTransaction / numVoters);

    // Owner enables mix-net phase
    console.log("mixnetPhaseOn: ", (await electionContract.mixnetPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each server mixes and re-encrypts the previous server's encrypted commits with public key relative to secret key
    sumTransaction = 0;
    var sumTransaction1 = 0;
    var tmp = [];
    var proofsCommit = [];
    for(var o = 0; o < numServers; o++) {
      var latestCommit = [];
      var proofServers = [];
      allCommits = await cryptoContract.shuffle(allCommits);
      fs.writeFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '');
      fs.writeFileSync('./file/proof'+o.toString(10)+'.txt', '');
      for(var i = 0; i < allCommits.length; i++) {
        var y = bigInt.randBetween(1, prime.minus(1));
        tmp = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), '0x'+dec2hex(publicKeyThreshold.toString(10)), allCommits[i][0], allCommits[i][1]);
        fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', tmp[0]);
        fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', tmp[1]);
        if(i != allCommits.length - 1) {
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
        }
        var s = bigInt.randBetween(1, prime.minus(1));
        var c = bigInt.randBetween(1, prime.minus(1));
        var t = s.add(c.multiply(y));
        proofServers.push([s, c, t]);
        fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(s.toString(10)));
        fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(c.toString(10)));
        fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(t.toString(10)));
        if(i != allCommits.length - 1) {
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
        }
        latestCommit.push([tmp[0], tmp[1]]);
      }
      proofsCommit.push(proofServers);
      allCommits = [];
      allCommits = latestCommit;
      sumTransaction += (await ipfsContract.setCommitReEnc(accounts[o], (await ipfs.add(fs.readFileSync('./file/commitReEnc'+o.toString(10)+'.txt'))).path, {from: accounts[o]})).receipt.gasUsed;
      sumTransaction1 += (await ipfsContract.setProof(accounts[o], (await ipfs.add(fs.readFileSync('./file/proof'+o.toString(10)+'.txt'))).path, {from: accounts[o]})).receipt.gasUsed;
    }
    console.log("setCommitReEnc avg: ", sumTransaction / numServers);
    console.log("setProof avg: ", sumTransaction1 / numServers);
    
    // Owner enables verify phase
    console.log("verifyPhaseOn: ", (await electionContract.verifyPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // verifyProof has been tested and works but by not consuming gas it avoids doing it

    // Owner enables reveal phase
    console.log("revealPhaseOn: ", (await electionContract.revealPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each voter decrypts c1 of latest server's commits with personal split of secret key
    sumTransaction = 0;
    var decVoters = [];
    for(var v = 0; v < numVoters; v++) {
      var dec = [];
      fs.writeFileSync('./file/dec'+v.toString(10)+'.txt', '');
      for(var i = 0; i < latestCommit.length; i++) {
        var tmp = await cryptoContract.ElGamalDecPart1(latestCommit[i][0], '0x'+dec2hex(splitSecretKey[v].toString(10)));
        dec.push(tmp);
        fs.appendFileSync('./file/dec'+v.toString(10)+'.txt', tmp);
        if(i != latestCommit.length - 1) {
          fs.appendFileSync('./file/dec'+v.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/dec'+v.toString(10)+'.txt', '\n');
        }
      }
      decVoters.push(dec);
      sumTransaction += (await ipfsContract.setDecC1(accounts[v], (await ipfs.add(fs.readFileSync('./file/dec'+v.toString(10)+'.txt'))).path, {from: accounts[v]})).receipt.gasUsed;
    }
    console.log("setDecC1 avg: ", sumTransaction / numVoters);

    // Owner reveals shuffled votes (this operation can be done by anyone)
    var votes = [];
    fs.writeFileSync('./file/revealVotes.txt', '');
    for(var i = 0; i < latestCommit.length; i++) {
      var tmp1 = bigInt(web3.utils.hexToNumberString(decVoters[0][i]));
      for(var v = 1; v < numVoters; v++) {
        tmp1 = tmp1.multiply(bigInt(web3.utils.hexToNumberString(decVoters[v][i]))).mod(prime);
      }
      result = tmp1.modInv(prime);
      var tmp = parseInt(web3.utils.hexToNumberString(await cryptoContract.ElGamalDecPart2(latestCommit[i][1], '0x'+dec2hex(tmp1.toString(10)), '0x'+dec2hex(result.toString(10))))) - 1;
      fs.appendFileSync('./file/revealVotes.txt', tmp.toString(10));
      if(i != latestCommit.length - 1) {
        fs.appendFileSync('./file/revealVotes.txt', '\n');
      }
      votes.push(tmp);
    }
    console.log("setRevealVotes: ", (await ipfsContract.setRevealVotes(accounts[0], (await ipfs.add(fs.readFileSync('./file/revealVotes.txt'))).path, {from: accounts[0]})).receipt.gasUsed);
    console.log("Votes after mix-net and reveal phases: ", votes);

    // Owner enables counting phase
    console.log("countingPhaseOn: ", (await electionContract.countingPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Anyone can count winner and get it
    console.log("countWinner: ", (await electionContract.countWinner(await electionContract.sort(votes, votes.length))).receipt.gasUsed);
    console.log("Winner: ", await electionContract.getWinner(accounts[0]));

  }
  catch(error) {
    console.log(error);
  }
  callback();

}