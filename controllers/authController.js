const supabase = require('../config/supabase.js');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken.js');

/**
 * registerUser
 * 
 * This function handles the registration of new admin or issuer accounts. 
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role = 'admin' } = req.body;

        // Check if the user already exists
        // SUPABASE DIFFERENCE: We use .select().eq() instead of Mongoose's findOne(). 
        // Supabase returns a 'data' array and an 'error' object instead of a resolved document directly.
        const { data: existingUsers, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (selectError) {
            throw selectError;
        }

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate a salt and hash the plain-text password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save the new user into the database
        // SUPABASE DIFFERENCE: Data is inserted as an array of objects. We chain .select()
        // at the end so Supabase returns the completely inserted rows (including generated IDs).
        const { data: newUsers, error: insertError } = await supabase
            .from('users')
            .insert([{ name, email, password: hashedPassword, role }])
            .select();

        if (insertError) {
            throw insertError;
        }

        if (newUsers && newUsers.length > 0) {
            const user = newUsers[0];
            // Return success with the new token. We use user.id instead of user._id.
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id)
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
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        // SUPABASE DIFFERENCE: Adding .single() ensures we get exactly one object back in 'data' 
        // instead of an array. If zero rows match, Supabase sets an error (code PGRST116).
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        // Check if user exists AND if the password matches the hash
        if (user && (await bcrypt.compare(password, user.password))) {
            // Successful login, return user details (excluding password) + token
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        // If `.single()` finds nothing, it throws an error we can catch to return 401
        if (error.code === 'PGRST116') {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser
};
