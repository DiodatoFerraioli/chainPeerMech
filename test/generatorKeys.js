// Libraries
const forge = require('node-forge');
const bigInt = require('big-integer');
const { exit } = require('process');

var prime, g, factor;

// This function generates public and private key that will be used for El Gamal
function generateKeys() {
    var bits = 300;
    forge.prime.generateProbablePrime(bits, function(err, num) {
      // Create prime factor and convert to bigInt
      factor = bigInt(num.toString(10));
      // Find a larger prime of which factor is prime factor
      // Determine a large even number as a co-factor
      var coFactor = bigInt.randBetween("2e260", "3e260");
      prime = bigInt(4);
      while(!coFactor.isEven() || !prime.isPrime()) {
        coFactor = bigInt.randBetween("2e260", "3e260");
        prime = coFactor.multiply(factor);
        prime = prime.add(1);
      }
      // Get a generator g for the multiplicative group mod factor
      var i = prime.minus(1).divide(factor);
      var h = bigInt.randBetween(2, prime.minus(1));
      g = h.modPow(i, factor);
    });
}

generateKeys();
console.log(prime);
console.log(g);
console.log(factor);
exit();