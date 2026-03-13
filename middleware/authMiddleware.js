const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase.js');

/**
 * protect (Middleware)
 * 
 * Think of this middleware as the tough bouncer at the door of our exclusive club (the protected API routes).
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the DB using the decoded ID
            // SUPABASE DIFFERENCE: Instead of returning a full doc and stripping the password 
            // via Mongoose's .select('-password'), we exclusively ask PostgREST for the exact columns 
            // we want right off the bat using .select('id, name, email, role').
            const { data: user, error } = await supabase
                .from('users')
                .select('id, name, email, role')
                .eq('id', decoded.id || decoded.userId)
                .single();

            if (error || !user) {
                throw new Error('User not found by token mapping');
            }

            req.user = user;

            next();
        } catch (error) {
            console.error('Bouncer alert: Token failed verification!', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token found' });
    }
};

/**
 * admin (Middleware)
 * 
 * The Ultra VIP zone.
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = {
    protect,
    admin
};
