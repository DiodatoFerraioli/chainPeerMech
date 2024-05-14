// Artifacts
const PiecewiseUniform = artifacts.require("PiecewiseUniform");
const IpfsStorage = artifacts.require("IpfsStorage");
const Crypto = artifacts.require("Crypto");

// Libraries
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

module.exports = async function(callback) {
  try {

    // Parameters of test
    const numUsers = 5;
    const numProjects = 3;
    const numServers = 2;
    const percentageAccuracy = 3;

    const accounts = await web3.eth.getAccounts();

    // Owner deploys smart contracts on blockchain
    const pwU = await PiecewiseUniform.deployed({from: accounts[0]});
    const ipfsContract = await IpfsStorage.deployed({from: accounts[0]});
    const cryptoContract = await Crypto.deployed({from: accounts[0]});

    // IPFS Client is instantiated
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
    console.log("registrationPhaseOn: ", (await pwU.registrationPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Users register themselves on the blockchain
    var sumTransaction = 0;
    var privateKeys = [];
    var partitions = [];
    for(var u = 0; u < numUsers; u++) {
      /*var tmp = (10**percentageAccuracy);
      var partition = [];
      for(var p = 0; p < numProjects - 1; p++) {
        partition.push(Math.round(Math.random()*tmp));
        tmp -= partition[p];
      }
      partition.push(tmp);
      partitions.push(shuffleRandomPermutation(partition));*/
      privateKeys[u] = bigInt.randBetween(1, prime.minus(1));
      sumTransaction += (await pwU.insertUsers('0x'+dec2hex((g.modPow(privateKeys[u], prime)).toString(10)), {from: accounts[u]})).receipt.gasUsed;
    }
    //console.log("Partitions: ", partitions);
    console.log("insertUsers avg: ", sumTransaction / numUsers);

    partitions = [[1000, 0, 0], [500, 500, 0], [0, 666, 334], [334, 556, 110], [375, 375, 250]];
    //partitions = [[162, 740, 98], [265, 279, 456], [927, 47, 26], [343, 570, 87], [534, 393, 73]];
    console.log("Partitions: ", partitions);

    // Owner sends to each user encrypted part of secret
    sumTransaction = 0;
    fs.writeFileSync('./file/cypher.txt', '');
    for(var u = 0; u < numUsers; u++) {
      var y = bigInt.randBetween(1, prime.minus(1));
      var cyphertext = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), await pwU.publicKey(accounts[u]), '0x'+dec2hex('1'), '0x'+dec2hex((splitSecretKey[u]).toString(10)));
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

    // Owner enables commit phase
    console.log("commitPhaseOn: ", (await pwU.commitPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each user encrypts their own partition for each project and commit cyphertexts
    sumTransaction = 0;
    var commit = [];
    for(var u = 0; u < numUsers; u++) {
      fs.writeFileSync('./file/commitPartition'+u.toString(10)+'.txt', '');
      var cyphertexts = [];
      for(var p = 0; p < numProjects; p++) {
        var y = bigInt.randBetween(1, prime.minus(1));
        if(partitions[u][p] != 0) {
          var perc = partitions[u][p];
        }
        else {
          var perc = 10**percentageAccuracy + 1;
        }
        var tmp = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), '0x'+dec2hex(publicKeyThreshold.toString(10)), '0x'+dec2hex('1'), '0x'+dec2hex(perc.toString(10)));
        cyphertexts.push(tmp[0]);
        cyphertexts.push(tmp[1]);
        fs.appendFileSync('./file/commitPartition'+u.toString(10)+'.txt', tmp[0]);
        fs.appendFileSync('./file/commitPartition'+u.toString(10)+'.txt', '\n');
        fs.appendFileSync('./file/commitPartition'+u.toString(10)+'.txt', tmp[1]);
        if(p != numProjects - 1) {
          fs.appendFileSync('./file/commitPartition'+u.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/commitPartition'+u.toString(10)+'.txt', '\n');
        }
      }
      commit.push(cyphertexts);
      sumTransaction += (await ipfsContract.setCommitPartition(accounts[u], (await ipfs.add(fs.readFileSync('./file/commitPartition'+u.toString(10)+'.txt'))).path, {from: accounts[u]})).receipt.gasUsed;
    }
    console.log("commitPartition avg: ", sumTransaction / numUsers);

    // Owner enables mix-net phase
    console.log("mixnetPhaseOn: ", (await pwU.mixnetPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each server mixes and re-encrypts the previous server's encrypted commits with public key relative to secret key
    sumTransaction = 0;
    var sumTransaction1 = 0;
    var tmp = [];
    for(var o = 0; o < numServers; o++) {
      var latestCommit = [];
      var proofsCommit = [];
      commit = await cryptoContract.shuffle(commit);
      fs.writeFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '');
      fs.writeFileSync('./file/proof'+o.toString(10)+'.txt', '');
      for(var i = 0; i < commit.length; i++) {
        var tmpLatestCommit = [];
        var proofServer = [];
        for(var j = 0; j < commit[i].length; j+=2) {
          var y = bigInt.randBetween(1, prime.minus(1));
          tmp = await cryptoContract.ElGamalEnc('0x'+dec2hex(y.toString(10)), '0x'+dec2hex(publicKeyThreshold.toString(10)), commit[i][j], commit[i][j+1]);
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', tmp[0]);
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', tmp[1]);
          if(j != commit[i].length - 2) {
            fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
          }
          var s = bigInt.randBetween(1, prime.minus(1));
          var c = bigInt.randBetween(1, prime.minus(1));
          var t = s.add(c.multiply(y));
          proofServer.push([s, c, t]);
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(s.toString(10)));
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(c.toString(10)));
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '0x'+dec2hex(t.toString(10)));
          if(j != commit[i].length - 2) {
            fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
          }
          tmpLatestCommit.push(tmp[0]);
          tmpLatestCommit.push(tmp[1]);
        }
        if(i != commit.length - 1) {
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/commitReEnc'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/proof'+o.toString(10)+'.txt', '\n');
        }
        latestCommit.push(tmpLatestCommit);
        proofsCommit.push(proofServer);
      }
      commit = [];
      commit = latestCommit;
      sumTransaction += (await ipfsContract.setCommitReEnc(accounts[o], (await ipfs.add(fs.readFileSync('./file/commitReEnc'+o.toString(10)+'.txt'))).path, {from: accounts[o]})).receipt.gasUsed;
      sumTransaction1 += (await ipfsContract.setProof(accounts[o], (await ipfs.add(fs.readFileSync('./file/proof'+o.toString(10)+'.txt'))).path, {from: accounts[o]})).receipt.gasUsed;
    }
    console.log("setCommitReEnc avg: ", sumTransaction / numServers);
    console.log("setProof avg: ", sumTransaction1 / numServers);

    // Owner enables verify phase
    console.log("verifyPhaseOn: ", (await pwU.verifyPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // verifyProof has been tested and works but by not consuming gas it avoids doing it

    // Owner enables reveal phase
    console.log("revealPhaseOn: ", (await pwU.revealPhaseOn({from: accounts[0]})).receipt.gasUsed);

    // Each user decrypts c1 of latest server's commits with personal split of secret key
    sumTransaction = 0;
    var decUsers = [];
    for(var u = 0; u < numUsers; u++) {
      fs.writeFileSync('./file/dec'+u.toString(10)+'.txt', '');
      var dec = [];
      for(var i = 0; i < latestCommit.length; i++) {
        for(var j = 0; j < latestCommit[i].length; j+=2) {
          var tmp = await cryptoContract.ElGamalDecPart1(latestCommit[i][j], '0x'+dec2hex(splitSecretKey[u].toString(10)));
          dec.push(tmp);
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', tmp);
          if(j != latestCommit[i].length - 2) {
            fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
          }
        }
        if(i != latestCommit.length - 1) {
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
          fs.appendFileSync('./file/dec'+u.toString(10)+'.txt', '\n');
        }
      }
      decUsers.push(dec);
      sumTransaction += (await ipfsContract.setDecC1(accounts[u], (await ipfs.add(fs.readFileSync('./file/dec'+u.toString(10)+'.txt'))).path, {from: accounts[u]})).receipt.gasUsed;
    }
    console.log("setDecC1 avg: ", sumTransaction / numUsers);

    // Owner reveals shuffled partitions (this operation can be done by anyone)
    var partitions = [];
    fs.writeFileSync('./file/revealPartitions.txt', '');
    var k = 0;
    for(var i = 0; i < latestCommit.length; i++) {
      var partition = [];
      for(var j = 0; j < latestCommit[i].length; j+=2) {
        var tmp1 = bigInt(web3.utils.hexToNumberString(decUsers[0][k]));
        for(var h = 1; h < numUsers; h++) {
          tmp1 = tmp1.multiply(bigInt(web3.utils.hexToNumberString(decUsers[h][k]))).mod(prime);
        }
        k++;
        var result = tmp1.modInv(prime);
        var tmp = parseInt(web3.utils.hexToNumberString(await cryptoContract.ElGamalDecPart2(latestCommit[i][j+1], '0x'+dec2hex(tmp1.toString(10)), '0x'+dec2hex(result.toString(10)), {from: accounts[0]})));
        if(tmp == 1001) {
          partition.push(0);
          fs.appendFileSync('./file/revealPartitions.txt', '0');
        }
        else {
          partition.push(tmp);
          fs.appendFileSync('./file/revealPartitions.txt', tmp.toString(10));
        }
        if(j != latestCommit[i].length - 2) {
          fs.appendFileSync('./file/revealPartitions.txt', '\n');
        }
      }
      if(i != latestCommit.length - 1) {
        fs.appendFileSync('./file/revealPartitions.txt', '\n');
        fs.appendFileSync('./file/revealPartitions.txt', '\n');
      }
      partitions.push(partition);
    }
    console.log("revealPartitions: ", (await ipfsContract.setRevealPartitions(accounts[0], (await ipfs.add(fs.readFileSync('./file/revealPartitions.txt'))).path, {from: accounts[0]})).receipt.gasUsed);
    console.log("Partitions after mix-net and reveal phases: ", partitions);

    // Through binary search we try to find the normalization of the medians (sum of medians for each project must be 1)
    var finish = false;
    var i = 1;
    var num = 1;
    var maxRange = 1;
    var minRange = 0;             
    while(!finish) {
      var den = 2**i;
      console.log("t:", num + '/' + den);
      console.log("computePhantomValues:", (await pwU.computePhantomValues(BigInt(num), BigInt(den), {from: accounts[0]})).receipt.gasUsed);
      var part = [];
      var medians = [];
      fs.writeFileSync('./file/sortedPartitions.txt', '');
      for(var j = 0; j < numProjects; j++) {
        part.push(await pwU.sort(await pwU.computePartition(partitions, percentageAccuracy, j, accounts[0]), 2 * numUsers + 1));
        for(var k = 0; k < part[j].length; k++) {
          if(k == Math.floor(part[j].length / 2)) {
            medians.push(part[j][k]);
          }
          fs.appendFileSync('./file/sortedPartitions.txt', part[j][k].toString(10));
          fs.appendFileSync('./file/sortedPartitions.txt', '\n');
        }
        fs.appendFileSync('./file/sortedPartitions.txt', 'median: ');
        fs.appendFileSync('./file/sortedPartitions.txt', medians[j].toString(10));
        if(j != numProjects - 1) {
          fs.appendFileSync('./file/sortedPartitions.txt', '\n');
          fs.appendFileSync('./file/sortedPartitions.txt', '\n');
        }
      }
      console.log("sortedPartition: ", (await ipfsContract.setSortedPartitions(accounts[0], (await ipfs.add(fs.readFileSync('./file/sortedPartitions.txt'))).path, {from: accounts[0]})).receipt.gasUsed);
      console.log("verify: ", (await pwU.verify(medians, numProjects, {from: accounts[0]})).receipt.gasUsed);
      finish = await pwU.getVerify();
      if(!finish) {
        i++;
        if((await pwU.getSumMedians(accounts[0])).value / 1e27 < 1) {
          console.log("Increase");
          minRange = num / den;
        }
        else {
          console.log("Decrease");
          maxRange = num / den;
        }
        num = (minRange + (maxRange - minRange) / 2) * (2**i);
      }
    }
    console.log("Final aggregation budget:");
    for(var i = 0; i < numProjects; i++) {
      console.log("project " + i.toString(10) + ": ", (medians[i].value / 1e27).toFixed(4));
    }
  }
  catch(error) {
    console.log(error);
  }
  callback();
  
}