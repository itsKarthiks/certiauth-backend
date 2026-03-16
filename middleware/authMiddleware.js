const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase.js');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using our local JWT_SECRET
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch user from the database to ensure they still exist and have permissions
            const { data: user, error } = await supabase
                .from('users')
                .select('id, name, email, role')
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                throw new Error("Local verification failed or user not found");
            }

            // Token is valid! Attach user to request and move on
            req.user = user;
            next();

        } catch (error) {
            console.error("Bouncer alert: Token failed verification!", error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };