const crypto = require('crypto');
const fs = require('fs');
const forge = require('node-forge');
const bigInt = require('big-integer');
const { create } = require('ipfs-http-client');
const { exit } = require('process');

const C = 65535;

const IpfsStorage = artifacts.require('IpfsStorage');

const Allocations = artifacts.require('Allocations');
const ExactDollarPartition = artifacts.require('ExactDollarPartition');
const ExactDollarPartitionMap = artifacts.require('ExactDollarPartitionMap');
const ExactDollarPartitionMatrix = artifacts.require('ExactDollarPartitionMatrix');
const ExactDollarPartitionNoStorage = artifacts.require('ExactDollarPartitionNoStorage');
const Phases = artifacts.require('Phases');
const Proposals = artifacts.require('Proposals');
const Scores = artifacts.require('Scores');
const Zipper = artifacts.require('Zipper');
const ImpartialSelectionMatrix = artifacts.require('ImpartialSelectionMatrix');
const ImpartialSelectionMap = artifacts.require('ImpartialSelectionMap');
const ImpartialSelectionNoStorage = artifacts.require('ImpartialSelectionNoStorage');
const Token = artifacts.require('Token');

var l, m, n, k, randomness, messages, commitments, assignments, evaluations, s, tokens, imp, token, accounts, gas, score, params, scoresNoStorage;

var g, pk, factor, prime, sk, ipfsContract;
var shares = new Array();
var clusters_assignments = new Array();

var folder = './results-new/';

// This function creates ipfs node
async function ipfsClient() {
    const ipfs = create('/ip4/127.0.0.1/tcp/5002/http');
    return ipfs;
}

module.exports = async function (callback) {
    fs.mkdir(folder, { recursive: true },(err) =>{if (err) throw err;});
    await initialize();
    ls = [4];                      // number of clusters
    ns = [50];                     // number of users
    ks = [5];                      // number of winners
    ms = [7];                      // number of reviews
    scs = ['NOSTORAGE'];           // scores data structure
    offchains = [true];            // partition and assignment off-chain
    revPercs = [1];                // percentage of correct reveals
    for (var i0 = 0; i0 < 1; i0++) {
        l = ls[i0];
        for (var i1 = 0; i1 < 1; i1++) {
            n = ns[i1];
            for (var i2 = 0; i2 < 1; i2++) {
                k = ks[i2];
                for (var i3 = 0; i3 < 1; i3++) {
                    m = ms[i3];
                    for (i4 = 0; i4 < 1; i4++) {
                        score = scs[i4];
                        for (i5 = 0; i5 < 1; i5++) {
                            offchain = offchains[i5];
                            for (i6 = 0; i6 < 1; i6++) {
                                revPerc = revPercs[i6];
                                if (checkConditions()) {
                                    file = folder + `l${l}_n${n}_m${m}_k${k}_scores_${score}_offChain_${offchain}_revPerc_${revPerc}.json`;
                                    await main();
                                } else {
                                    console.log("Failed check conditions!");
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    callback();
}

function checkConditions() {
    return ((n >= 2*k) && (n > (l * 1.5)) && (m<=(n*(l-1)/l)));
}

async function main() {
    try {
        await initializeVariables();         // Testing environment initialization
        await createNewContract();           // Contract deployment
        await submission();                  // Submission Phase
        await partition();                   // Assignment Phase
        await assignment();                  // Assignments retrieval
        await evaluation();                  // Proposals review
        await commit();                      // Commitment Phase
        await reveal();                      // Reveal Phase
        try {
            await selection();               // Selection Phase
            params['Selection Completed'] = true;
        } catch (error) {
            console.error(error);
            console.log('\n\n\nSELECTION FAILED!\n\n\n');
            params['Selection Completed'] = false;
        }
        gas['total'] = gasConsumption(gas);
        console.log('\nExperiment Parameters', params, '\n');
        console.log('Gas Consumption\n\n', gas);
    } catch (error) {
        console.error(error);
        params['Selection Completed'] = false;
    }
    results = { params, gas };
    fs.writeFileSync(file, JSON.stringify(results));
}

async function initialize() {
    accounts = await web3.eth.getAccounts();
    token = await Token.deployed();

    var all = await Allocations.deployed();
    var exact = await ExactDollarPartition.deployed();
    var exact_map = await ExactDollarPartitionMap.deployed();
    var exact_matrix = await ExactDollarPartitionMatrix.deployed();
    var exact_nostorage = await ExactDollarPartitionNoStorage.deployed();
    var phases = await Phases.deployed();
    var prop = await Proposals.deployed();
    var scores = await Scores.deployed();
    var zip = await Zipper.deployed();

    ipfsContract = await IpfsStorage.deployed();

    await ImpartialSelectionMap.detectNetwork();
    await ImpartialSelectionMap.link('Allocations', all.address);
    await ImpartialSelectionMap.link('ExactDollarPartition', exact.address);
    await ImpartialSelectionMap.link('ExactDollarPartitionMap', exact_map.address);
    await ImpartialSelectionMap.link('Phases', phases.address);
    await ImpartialSelectionMap.link('Proposals', prop.address);
    await ImpartialSelectionMap.link('Scores', scores.address);
    await ImpartialSelectionMap.link('Zipper', zip.address);

    await ImpartialSelectionMatrix.detectNetwork();
    await ImpartialSelectionMatrix.link('Allocations', all.address);
    await ImpartialSelectionMatrix.link('ExactDollarPartition', exact.address);
    await ImpartialSelectionMatrix.link('ExactDollarPartitionMatrix', exact_matrix.address);
    await ImpartialSelectionMatrix.link('Phases', phases.address);
    await ImpartialSelectionMatrix.link('Proposals', prop.address);
    await ImpartialSelectionMatrix.link('Zipper', zip.address);

    await ImpartialSelectionNoStorage.detectNetwork();
    await ImpartialSelectionNoStorage.link('Allocations', all.address);
    await ImpartialSelectionNoStorage.link('ExactDollarPartition', exact.address);
    await ImpartialSelectionNoStorage.link('ExactDollarPartitionNoStorage', exact_nostorage.address);
    await ImpartialSelectionNoStorage.link('Phases', phases.address);
    await ImpartialSelectionNoStorage.link('Proposals', prop.address);
    await ImpartialSelectionNoStorage.link('Zipper', zip.address);
}

async function createNewContract() {
    if (score == 'MAP') {
        imp = await ImpartialSelectionMap.new(token.address, { from: accounts[0] });
    } else if (score == 'MATRIX') {
        imp = await ImpartialSelectionMatrix.new(token.address, { from: accounts[0] });
    }else if (score == 'NOSTORAGE'){
        imp = await ImpartialSelectionNoStorage.new(token.address, { from: accounts[0] });
    }
    finalize = await imp.finalizeCreation();
    deploy = await web3.eth.getTransactionReceipt(imp.transactionHash);
    gas['deployment'] = deploy.cumulativeGasUsed;
    gas['finalization'] = finalize.receipt.gasUsed;
    console.log('\n\nSmart contract created at ' + imp.address + '\n');
}

async function initializeVariables() {
    randomness = new Uint32Array(n);
    scoresNoStorage = [];
    messages = [];
    commitments = [];
    assignments = [];
    evaluations = [];
    s = []
    tokens = [];
    gas = {};
    params = {};
    params['l'] = l;
    params['n'] = n;
    params['m'] = m;
    params['k'] = k;
    params['scores'] = score;
    params['offChain'] = offchain;
    params['revPerc'] = revPerc;
    params['IW'] = 16;
    if (score == 'NOSTORAGE'){
        params['SW'] = 0;
    }else{
        params['SW'] = 32;
    }
    params['accumulator'] = true;
    params['split'] = false;
}

async function submission() {
    console.log('Submission Phase\n');
    crypto.randomFill(randomness, (err, buf) => {
        if (err) throw err;
    });
    gas['submission'] = {};
    for (i = 0; i < n; i++) {
        messages[i] = String.fromCharCode(97 + i);
        result = await imp.submitWork(web3.utils.asciiToHex(messages[i]), { from: accounts[i] });  //% 10
        submitted(result.receipt.rawLogs);
        gas['submission'][i] = result.receipt.gasUsed;
    }
    let endSub = await imp.endSubmissionPhase({ from: accounts[0] });
    gas['endSubmission'] = endSub.receipt.gasUsed;
}

async function partition() {
    if (offchain) {
        p = generatePartition()
        var part = await imp.providePartition(p, { from: accounts[0] });
    } else {
        var part = await imp.createPartition(l, { from: accounts[0] });
    }
    let endAss = await imp.endAssignmentPhase({ from: accounts[0] });
    gas['partitioning'] = part.receipt.gasUsed;
    gas['endAssignment'] = endAss.receipt.gasUsed;
    p = await imp.getPartition.call();
    logMatrix(p, 'Partition Created');
    gas['insertEncryptedMatrix'] = {};
    gas['insertProof'] = {};
    // Each cluster runs protocol independently
    for (var i = 0; i < l; i++) {
        clusters_assignments[i] = await protocol(p[i], await ipfsClient());
    }
    var supp = new Array();
    var dim = new Array();
    var colonne_membri = new Array();
    var colonne = new Array();
    for (var i1 = 0; i1 < p.length; i1++) {
        dim = [];
        for (var i2 = 0; i2 < p[i1].length; i2++) {
            dim.push(p[i1][i2]['words'][0]);
        }
        colonne_membri[i1] = dim;
    }
    var tmp1 = new Array();
    for (var i1 = 0; i1 < colonne_membri.length; i1++) {
        tmp1 = [];
        for (var i2 = 0; i2 < colonne_membri.length; i2++) {
            if (i2 != i1) {
                tmp1 = tmp1.concat(colonne_membri[i2]);
            }
        }
        colonne[i1] = tmp1;
    }
    for (var i1 = 0; i1 < clusters_assignments.length; i1++) {  //per ogni matrice di ciascun cluster
        for (var i2 = 0; i2 < clusters_assignments[i1].length; i2++) {  //per ogni riga della matrice
            supp = [];
            for (var i3 = 0; i3 < clusters_assignments[i1][i2].length; i3++) {  //per ogni colonna della matrice
                if (clusters_assignments[i1][i2][i3] == 1) {
                    supp.push(colonne[i1][i3]);
                }
            }
            assignments[p[i1][i2]['words'][0]] = supp;
        }
    }
}

async function assignment() {
    console.log('\n\nAssignment Phase\n');
    for (var i = 0; i < n; i++) {
        console.log('\tAssignment to ID ' + i + ' (Token #' + tokens[i] + '): [ ' + assignments[i] + ' ]');
    }
}

async function evaluation() {
    console.log('\n\nEvaluation Phase\n');
    for (i1 = 0; i1 < n; i1++) {
        var reviews = assignments[i1];
        evaluations[i1] = [];
        s[i1] = '';
        for (i2 = 0; i2 < reviews.length; i2++) {
            evaluations[i1][i2] = 50 + Math.floor(Math.random() * 50);
        }
        for (i2 = 0; i2 < evaluations[i1].length; i2++) {
            var v = evaluations[i1][i2];
            s[i1] += '\t\t' + assignments[i1][i2] + ' -> ' + v + '\n';
        }
        console.log('\tEvaluations by ID ' + i1 + ':\n ' + s[i1]);
    }
}

async function commit() {
    console.log('\nCommitment Phase')
    var i = 0;
    for (i = 0; i < n; i++) {
        commitments[i] = web3.utils.soliditySha3(
            { type: 'uint', value: randomness[i] },
            { type: 'uint[]', value: assignments[i] },
            { type: 'uint[]', value: evaluations[i] }
        );
    }
    gas['tokenApproval'] = {};
    gas['commitment'] = {};
    for (i = 0; i < n; i++) {
        let result = await token.approve(imp.address, tokens[i], { from: accounts[i] });   //% 10
        gas['tokenApproval'][i] = result.receipt.gasUsed;
        let com = await imp.commitEvaluations(commitments[i], tokens[i], { from: accounts[i] });   //% 10
        gas['commitment'][i] = com.receipt.gasUsed;
        comLog = web3.eth.abi.decodeLog([{
            type: 'uint256',
            name: 'tokenId'
        }, {
            type: 'bytes32',
            name: 'commitment'
        }], com.receipt.rawLogs[2].data, com.receipt.rawLogs[2].topics);
        console.log('\n\tCommitted:\n\t\tID: ' + i + '\n\t\tToken: ' + comLog.tokenId + '\n\t\tCommitment: ' + comLog.commitment);
    }
    let endCom = await imp.endCommitmentPhase({ from: accounts[0] });
    gas['endCommitment'] = endCom.receipt.gasUsed;
}

async function reveal() {
    console.log('\n\nReveal Phase');
    gas['reveal'] = {};
    console.log(tokens);
    for (i = 0; i < n*revPerc; i++) {
        let result = await imp.revealEvaluations(tokens[i], randomness[i], evaluations[i], assignments[i], { from: accounts[i] });   //% 10
        gas['reveal'][i] = result.receipt.gasUsed;
        revLog = web3.eth.abi.decodeLog(['bytes32', 'uint256', 'uint256[]', 'uint256[]', 'uint256'],
            result.receipt.rawLogs[0].data, result.receipt.rawLogs[0].topics);
        console.log('\n\tRevealed:' +
            '\n\t\tID: ' + i +
            '\n\t\tCommitment: ' + revLog[0] +
            '\n\t\tRandomness: ' + revLog[1] +
            '\n\t\tAssignments: ' + revLog[2] +
            '\n\t\tEvaluations: ' + revLog[3] +
            '\n\t\tToken: ' + revLog[4]);
        if (score == 'NOSTORAGE'){
            var line = new Array(n).fill(0);
            var sum = 0;
            for (j = 0;j<revLog[3].length;j++){
                sum += Number(revLog[3][j]);
            }
            for (j = 0;j<revLog[2].length;j++){
                line[revLog[2][j]] = (revLog[3][j]*C/sum).toPrecision(6);
            }
            scoresNoStorage.push(line);
        }
    }
    let endRev = await imp.endRevealPhase({ from: accounts[0] });
    gas['endReveal'] = endRev.receipt.gasUsed;
}

async function selection() {
    console.log('\n\nSelection Phase (Exact Dollar Partition)\n');
    var random = Math.floor(Math.random() * C);
    var sel = await imp.impartialSelection(k, random, { from: accounts[0] });
    var scores = [];
    if (score != 'NOSTORAGE'){
        scores = await imp.getScores.call();
    }
    else{
        scores = scoresNoStorage;
        p = await imp.getPartition.call();
        for (i1 = scores.length; i1 < n; i1++){
            var line = new Array(n).fill(0);
            for (i2 = 0; i2 < l; i2++){
                index = p[i2].map(x => x.toNumber()).indexOf(i1);
                if (index != -1){
                    value = (C/(n-p[i2].length)).toPrecision(6);
                    for (i3 = 0; i3 < l; i3++){
                        if (i3 != i2){
                            for (i4 = 0; i4 < p[i3].length; i4++){
                                line[p[i3][i4]] = value;
                            }
                        }
                    }
                }
            }
            scores.push(line);
        }
    }
    let allocations = await imp.getAllocations.call();
    logResults(scores, allocations, sel);
    gas['selection'] = sel.receipt.gasUsed;
    console.log('\nCOMPLETED!');
}

function submitted(logs) {
    tokenLog = web3.eth.abi.decodeLog([{
        type: 'address',
        name: 'to'
    }, {
        type: 'uint256',
        name: 'tokenId'
    }], logs[2].data, logs[2].topics);
    subLog = web3.eth.abi.decodeLog([{
        type: 'bytes32',
        name: 'hashedWork'
    }, {
        type: 'uint256',
        name: 'ID'
    }], logs[0].data, logs[0].topics);
    tokens.push(tokenLog.tokenId);
    console.log('\tProposal Submitted: ' +
        '\n\t\tWork: ' + subLog.hashedWork +
        '\n\t\tSubmitter: ' + tokenLog.to +
        '\n\t\tSubmission ID: ' + subLog.ID +
        '\n\t\tToken: ' + tokenLog.tokenId + '\n');
}

function logResults(scoreMatrix, allocations, sel) {
    logs = sel.receipt.rawLogs;
    for (i = 0; i < scoreMatrix.length; i++) {
        scoreMatrix[i] = scoreMatrix[i].map(function (item) { return item / C });
    }
    logMatrix(scoreMatrix, 'Score Matrix')
    quotasLog = web3.eth.abi.decodeLog(['uint256[]'], logs[0].data, logs[0].topics);
    console.log('\nQuotas : [ ' + quotasLog[0].map(function (item) { return item / C }) + ' ]');
    logAllocations(allocations);
    allLog = web3.eth.abi.decodeLog(['uint256[]'], logs[1].data, logs[1].topics);
    console.log('\nSelected Allocation : [ ' + allLog[0] + ' ]');
    logWinners(logs[2]);
}

function logAllocations(result) {
    console.log('\nAllocations :');
    for (var i = 0; i < l; i++) {
        console.log('\t[ ' + result[0][i] + ' ] with probability ' + result[1][i] / C);
    }
}

function logWinners(result) {
    winLog = web3.eth.abi.decodeLog(['(uint128,uint128)[]'], result.data, result.topics);
    console.log('\nSelected Winners : ');
    for (var i = 0; i < k; i++) {
        console.log('\tID ' + winLog[0][i][0] + ' with score ' + winLog[0][i][1] / C);
    }
}

function logMatrix(result, message) {
    if (result.length == 0){return}
    console.log(`\n${message}\n`);
    for (var i1 = 0; i1 < result.length; i1++) {
        var list = result[i1];
        var s = '\t' + i1 + ' : [ ' + list[0];
        for (var i2 = 1; i2 < list.length; i2++) {
            s += ', ' + list[i2];
        }
        s += ' ]';
        console.log(s);
    }
}

function gasConsumption(dict) {
    var tot = 0;
    for (elem in dict) {
        if (typeof dict[elem] === 'object') {
            tot += gasConsumption(dict[elem]);
        } else {
            tot += dict[elem];
        }
    }
    return tot;
}

function generatePartition() {
    var p = [];
    var agents = [...Array(n).keys()];   //agents = [0, 1, 2, 3, ..., n-1]
    for (var i1 = 0; i1 < l; i1++) {
        var tmp = [];
        for (var i2 = i1; i2 < n; i2 += l) {
            tmp.push(agents[i2]);
        }
        p[i1] = tmp;
    }
    return p;                            //i il singolo cluster e p[i] sono i membri del cluster
}

async function protocol(cluster, ipfs) {
    var cluster_member_assignments = new Array();
    var pb = new Array();
    var ass_cl = new Array();
    var count, ok;
    var proof = [];

    // Public and secret key are generated
    await generate_keys(cluster.length);
    // For each current cluster's member
    for (var i1 = 0; i1 < cluster.length; i1++) {
        // First member creates assignment matrix for current cluster's member and encrypts it
        if (i1 == 0) {
            var matrix = [];
            for (var i2 = 0; i2 < cluster.length; i2++) {
                cluster_member_assignments = [];
                count = 0;
                for (var i3 = 0; i3 < n - cluster.length; i3++) {
                    if (Math.random() < 0.1) {
                        cluster_member_assignments[i3] = 2; 
                    }
                    else {
                        if(count < m) {
                            count += 1;
                            cluster_member_assignments[i3] = 1;
                        }
                        else {
                            cluster_member_assignments[i3] = 2;
                        }
                    }
                }
                matrix[i2] = cluster_member_assignments;
            }
            var tmp = await encrypt(matrix, false, accounts[cluster[i1]['words'][0]].toString());
            var enc = tmp[0];
            ok = true;
            try {
                var result = await ipfs.add(fs.readFileSync('./file/Encrypted_Matrix_'+accounts[cluster[i1]['words'][0]].toString()+'.txt'));
            } catch {
                ipfs = await ipfsClient();
                i1--;
                ok = false;
                continue;
            }
            if (ok) {
                var trans = await ipfsContract.setEnc(accounts[cluster[i1]['words'][0]], result.path, {from: accounts[cluster[i1]['words'][0]]});
                gas['insertEncryptedMatrix'][cluster[i1]['words'][0]] = trans.receipt.gasUsed;
            }
        }
        // All other members re-encrypt the previously encrypted matrix and mix rows and columns
        else {
            //console.log(await ipfsContract.getEnc.call(accounts[cluster[i1]['words'][0]]));
            /*let test = ipfs.cat(await ipfsContract.getEnc.call(accounts[cluster[i1]['words'][0]]));
            for await (const itr of test) {
                data = Buffer.from(itr).toString();
            }*/

            tmp = await encrypt(enc, true, accounts[cluster[i1]['words'][0]].toString());
            enc = await mixnet(tmp[0]);
            proof.push(tmp[1]);

            result = await ipfs.add(fs.readFileSync('./file/Encrypted_Matrix_'+accounts[cluster[i1]['words'][0]].toString()+'.txt'));
            trans = await ipfsContract.setEnc(accounts[cluster[i1]['words'][0]], result.path, {from: accounts[cluster[i1]['words'][0]]});
            gas['insertEncryptedMatrix'][cluster[i1]['words'][0]] = trans.receipt.gasUsed;

            result = await ipfs.add(fs.readFileSync('./file/Proof_'+accounts[cluster[i1]['words'][0]].toString()+'.txt'));
            trans = await ipfsContract.setProof(accounts[cluster[i1]['words'][0]], result.path, {from: accounts[cluster[i1]['words'][0]]});
            gas['insertProof'][cluster[i1]['words'][0]] = trans.receipt.gasUsed;
        }
    }
    // Before decrypting the proofs generated during encryption are checked
    for(var i1 = 0; i1 < proof.length; i1++) {
        for(var i2 = 0; i2 < proof[i1].length; i2++) {
            for(var i3 = 0; i3 < proof[i1][i2].length; i3++) {
                if (verify_proof(proof[i1][i2][i3][0], proof[i1][i2][i3][1], proof[i1][i2][i3][2], proof[i1][i2][i3][3], proof[i1][i2][i3][4])) {
                    continue;
                }
                else {
                    exit();
                }
            }
        }
    }
    // Each cluster member decrypts the rows of the assignment matrix but not their own
    for (var i1 = 0; i1 < cluster.length; i1++) {
        pb[i1] = await others_rows_decrypt(enc, i1);   
    }
    // Each cluster member decrypts their own row
    for (var i1 = 0; i1 < cluster.length; i1++) {
        ass_cl[i1] = await personal_row_decrypt(enc, pb, i1);
    }
    return ass_cl;
}

async function generate_keys(cluster_members) {
    var bits = 160;
    var x1, x2;
    shares = [];
    forge.prime.generateProbablePrime(bits, function(err, num) {
        // Create prime factor and convert to bigInt
        factor = bigInt(num.toString(10));
        // Find a larger prime of which factor is prime factor
        // Determine a large even number as a co-factor
        var coFactor = bigInt.randBetween('2e260', '3e260');
        prime = bigInt(4);
        while(!coFactor.isEven() || !prime.isPrime()) {
            coFactor = bigInt.randBetween('2e260', '3e260');
            prime = coFactor.multiply(factor);
            prime = prime.add(1);
        }
        // Get a generator g for the multiplicative group mod factor
        var j = prime.minus(1).divide(factor);
        var h = bigInt.randBetween(2, prime.minus(1));
        g = h.modPow(j, factor);
        // Secret key
        sk = bigInt.randBetween(2, factor.minus(2));
        // Secret sharing between cluster members
        for (var i = 0; i < cluster_members; i++) {
            if (i == 0) {
                x1 = bigInt.randBetween(1, sk);
                x2 = sk.minus(x1);
                shares.push(x1);
            }
            else if (i == cluster_members - 1) {
                shares.push(x2);
            }
            else {
                x1 = bigInt.randBetween(1, x2);
                x2 = x2.minus(x1);
                shares.push(x1);
            }
        }
        // Public key
        pk = g.modPow(sk, prime);
    });
}

async function encrypt(matrix, re_encryption, account) {
    var encrypted_matrix = new Array();
    var encrypted_row = new Array();
    var proof_tmp1 = new Array();
    var proof_tmp2 = new Array();
    var c1, c2;
    for (var i1 = 0; i1 < matrix.length; i1++) {
        encrypted_row = [];
        proof_tmp2 = [];
        for (var i2 = 0; i2 < matrix[i1].length; i2++) {
            var y = bigInt.randBetween(1, factor.minus(1));
            if (!re_encryption) {
                c1 = g.modPow(y, prime);
                c2 = bigInt(matrix[i1][i2]).multiply(pk.modPow(y, prime)).mod(prime);
            }
            else {
                c1 = bigInt(matrix[i1][i2][0]).multiply(g.modPow(y, prime)).mod(prime);
                c2 = bigInt(matrix[i1][i2][1]).multiply(pk.modPow(y, prime)).mod(prime);
                proof_tmp2[i2] = await generate_proof(y, [matrix[i1][i2][0], matrix[i1][i2][1]], [c1, c2]);
                if(i1 == 0 & i2 == 0) {
                    fs.writeFileSync('./file/Proof_'+account+'.txt', matrix.length.toString());
                    fs.appendFileSync('./file/Proof_'+account+'.txt', '\n');
                    fs.appendFileSync('./file/Proof_'+account+'.txt', matrix[0].length.toString());
                    fs.appendFileSync('./file/Proof_'+account+'.txt', '\n');
                }
                fs.appendFileSync('./file/Proof_'+account+'.txt', proof_tmp2[i2].toString());
                fs.appendFileSync('./file/Proof_'+account+'.txt', '\n');
            }
            encrypted_row[i2] = ([c1, c2]);
            if(i1 == 0 & i2 == 0) {
                fs.writeFileSync('./file/Encrypted_Matrix_'+account+'.txt', matrix.length.toString());
                fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', '\n');
                fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', matrix[0].length.toString());
                fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', '\n');
            }
            fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', c1.toString());
            fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', '\n');
            fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', c2.toString());
            fs.appendFileSync('./file/Encrypted_Matrix_'+account+'.txt', '\n');
        }
        encrypted_matrix[i1] = encrypted_row;
        proof_tmp1[i1] = proof_tmp2;
    }
    return [encrypted_matrix, proof_tmp1];
}

async function generate_proof(r, cypher_old, cypher_new) {
    var s = bigInt.randBetween(1, factor.minus(1));
    var c = bigInt.randBetween(1, factor.minus(1));
    var t = s.add(c.multiply(r));
    return ([t, s, c, cypher_old, cypher_new]);
}

async function verify_proof(t, s, c, cypher_old, cypher_new) {
    var g_r = cypher_new[0].multiply(cypher_old[0].modInv(prime)).mod(prime);
    var g_t = g.modPow(t, prime);
    var g_s = g.modPow(s, prime);
    var g_cr = g_r.modPow(c, prime);
    var y_r = cypher_new[1].multiply(cypher_old[1].modInv(prime)).mod(prime);
    var y_t = pk.modPow(t, prime);
    var y_s = pk.modPow(s, prime);
    var y_cr = y_r.modPow(c, prime);
    if(g_t.eq((g_s.multiply(g_cr)).mod(prime)) & y_t.eq((y_s.multiply(y_cr)).mod(prime))) {
        return true;
    }
    else {
        return false;
    }
}

async function mixnet(matrix) {
    var columns = new Array();
    var tmp = new Array();
    matrix = shuffle(matrix);
    for (var i1 = 0; i1 < matrix[0].length; i1++) {
        tmp = [];
        for (var i2 = 0; i2 < matrix.length; i2++) {
            tmp.push(matrix[i2][i1]);
        }
        columns.push(tmp);
    }
    matrix = shuffle(columns);
    columns = [];
    for (var i1 = 0; i1 < matrix[0].length; i1++) {
        tmp = [];
        for (var i2 = 0; i2 < matrix.length; i2++) {
            tmp.push(matrix[i2][i1]);
        }
        columns.push(tmp);
    }
    return columns;
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
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

async function others_rows_decrypt(matrix, index) {
    var public_row_partial_decryption = new Array();
    var public_partial_decryption = new Array();
    // Calculation c1 raised to its own secret key for each element of the final encrypted matrix
    for (var i1 = 0; i1 < matrix.length; i1++) {
        public_row_partial_decryption = [];
        for (var i2 = 0; i2 < matrix[i1].length; i2++) {
            if (index != i1) {   //riga non è la personale
                public_row_partial_decryption[i2] = matrix[i1][i2][0].modPow(shares[index], prime);
            }
            else {
                public_row_partial_decryption[i2] = NaN;
            }
        }
        // Matrix with decrypted rows for the other cluster members
        public_partial_decryption[i1] = public_row_partial_decryption;
    }
    return public_partial_decryption;
}

async function personal_row_decrypt(matrix, pb, index) {
    var decrypted_row = new Array();
    var tmp, entry;
    for (var i1 = 0; i1 < matrix[index].length; i1++){  // per ogni elemento della mia riga
        tmp = bigInt();
        entry = false;
        for (var i2 = 0; i2 < pb.length; i2++) {    // per ogni matrice con le righe crittografate
            if (i2 != index) {
                if (!entry) {
                    entry = true;
                    tmp = matrix[index][i1][1].multiply(pb[i2][index][i1].modInv(prime)).mod(prime);
                }
                else {
                    tmp = tmp.multiply(pb[i2][index][i1].modInv(prime)).mod(prime);
                }
            }
        }
        decrypted_row[i1] = Number(tmp.multiply(matrix[index][i1][0].modPow(shares[index], prime).modInv(prime)).mod(prime));
    }
    return decrypted_row;
}