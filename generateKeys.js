const crypto = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// We replace newlines with \n so it fits on a single line in your .env file
console.log("Add these to your .env file:\n");
console.log(`RSA_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"\n`);
console.log(`RSA_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);