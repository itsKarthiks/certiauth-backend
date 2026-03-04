const UserModel = require('../models/UserModel.js');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken.js');

/**
 * registerUser
 * 
 * This function handles the registration of new admin or issuer accounts. 
 * Here is the step-by-step breakdown:
 * 
 * 1. We extract the user's name, email, and plain-text password from the request body.
 * 2. We check if a user with this email already exists in our database.
 * 3. We use `bcryptjs` to create a "salt" (a random string of characters).
 * 4. We combine the salt with the plain-text password and hash it. 
 * 
 * SECURITY NOTE: WHY BCRYPT?
 * We never, ever save plain-text passwords in our database. If our database 
 * gets compromised by a hacker, they would instantly see everyone's password. 
 * Instead, bcrypt turns a password like "password123" into a scrambled, irreversible 
 * mess like "$2a$10$vI8aWB...". Even if hackers steal this hash, they can't reverse 
 * it back into "password123".
 * 
 * 5. We create the new user record in the database using the hashed password.
 * 6. Finally, we return a success response containing the user's details and 
 *    their "VIP pass" (the generated JWT token) so they are immediately logged in.
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user already exists
        const userExists = await UserModel.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate a salt and hash the plain-text password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save the new user into the database
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword
        });

        if (user) {
            // Return success with the new token
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data received' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

/**
 * loginUser
 * 
 * This function handles authenticating returning admins/issuers.
 * 
 * 1. Extract the email and the submitted plain-text password from the request.
 * 2. Look up the user by their email in the database.
 * 3. Use `bcrypt.compare` to take their submitted plain password, hash it, and 
 *    see if it matches the stored scrambled hash in the database.
 * 4. If it matches, we issue them a brand new JWT token so they can access protected routes.
 * 5. If it fails, we reject them. 
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await UserModel.findOne({ email });

        // Check if user exists AND if the password matches the hash
        if (user && (await bcrypt.compare(password, user.password))) {
            // Successful login, return user details (excluding password) + token
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser
};
