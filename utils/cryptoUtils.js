const crypto = require('crypto');

/**
 * UNIVERSITY KEY GENERATION (For Demo Purposes)
 * Creates a temporary RSA key pair for the University.
 */
function generateUniversityKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
}

/**
 * The Signing Engine
 * Creates a strict, deterministic digital signature from the certificate data.
 */
function signCertificateData(dataObject, privateKey) {
    // We strictly combine the exact fields so if one changes, the hash breaks
    const dataString = `${dataObject.registrationNumber}|${dataObject.name}|${dataObject.course}|${dataObject.cgpa}`;

    // SHA-256 hashing and RSA signing in one step
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    sign.end();
    
    const signature = sign.sign(privateKey, 'hex');

    return { 
        dataString, 
        signature 
    };
}

/**
 * The Verification Engine
 * Returns true if valid, false if tampered.
 */
function verifyCertificateSignature(dataString, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(dataString);
    verify.end();
    
    return verify.verify(publicKey, signature, 'hex');
}

module.exports = { 
    generateUniversityKeys, 
    signCertificateData, 
    verifyCertificateSignature 
};
