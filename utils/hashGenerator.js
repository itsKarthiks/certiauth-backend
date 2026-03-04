const crypto = require('crypto');

/**
 * generateCertificateHash
 * 
 * This function is responsible for generating a unique digital signature for each certificate.
 * Here is a step-by-step breakdown of the logic:
 * 
 * 1. We take the student's data object, which contains crucial details like their 
 *    studentId, name, cgpa, and program.
 * 2. We concatenate these details together into a single plain text string. 
 *    This string represents the actual content of the certificate.
 * 3. We use the Node.js built-in 'crypto' module to create an HMAC (Hash-based Message 
 *    Authentication Code) using the SHA-256 algorithm. We secure this hash using a secret key
 *    (SECRET_HASH_KEY) stored safely in our environment variables.
 * 4. Finally, we convert the result into a 'hex' string. This string becomes the 
 *    `digitalSignature` that we store in our database.
 * 
 * SECURITY NOTE: 
 * If anyone attempts to alter the physical certificate (e.g., changing the CGPA from 3.0 to 4.0),
 * re-hashing the altered data will produce a completely different signature. When we compare 
 * their fake signature with our stored `digitalSignature`, the hash won't match, instantly 
 * alerting us that the certificate is a forgery.
 *
 * @param {Object} dataObject - Contains studentId, name, cgpa, program.
 * @returns {string} The resulting SHA-256 HMAC hex string (digital signature).
 */
const generateCertificateHash = (dataObject) => {
    // Step 1: Extract the necessary fields from the data object
    const { studentId, name, cgpa, program } = dataObject;

    // Step 2: Concatenate the student's data into a single, straightforward string.
    // We use a specific format so the hashing is consistent every time.
    const rawDataString = `${studentId}-${name}-${cgpa}-${program}`;

    // Step 3: Hash the string using HMAC SHA-256 and our secret key from the environment variables
    // Step 4: Return the resulting 'hex' string
    const hash = crypto
        .createHmac('sha256', process.env.SECRET_HASH_KEY)
        .update(rawDataString)
        .digest('hex');

    return hash;
};

// Export the function cleanly for use in our controllers
module.exports = generateCertificateHash;
