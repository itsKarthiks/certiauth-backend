const jwt = require('jsonwebtoken');

/**
 * generateToken
 * 
 * This function is used to create a secure JSON Web Token (JWT) after a user (like an admin) successfully logs in.
 * Here is the step-by-step logic:
 * 
 * 1. We take the unique 'userId' (usually the admin's database ID).
 * 2. We use 'jwt.sign' to package this 'userId' into the payload of the token.
 * 3. We securely "sign" this token using our deeply hidden 'JWT_SECRET' stored in our .env file.
 *    This ensures that the token cannot be tampered with by external users.
 * 4. We set an expiration time of 30 days ('30d').
 * 
 * WHAT DOES THIS DO?
 * Think of this token as a temporary "digital VIP pass" or backstage access badge. 
 * Once the admin receives this pass, they can attach it to their subsequent requests 
 * (like issuing a new certificate or viewing secure records). Our server will see the valid 
 * VIP pass and instantly know who the user is, so the admin doesn't have to repeatedly type 
 * in their username and password every single time they want to do something.
 *
 * @param {string} userId - The unique identifier of the authenticated user.
 * @returns {string} The signed JWT string.
 */
const generateToken = (userId) => {
    // We sign the token with the payload containing the userId, using our secret key,
    // and setting it to expire in 30 days.
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Export the function cleanly so it can be used in our authentication controllers
module.exports = generateToken;
