const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel.js');

/**
 * protect (Middleware)
 * 
 * Think of this middleware as the tough bouncer at the door of our exclusive club (the protected API routes).
 * Before anyone is allowed to enter (i.e., hit the controller function), they have to show their ID.
 * 
 * How the bouncer checks the ID:
 * 1. The bouncer looks at the incoming request headers to see if an 'authorization' pass is there,
 *    and if it starts with the word 'Bearer' (which is the standard format for these passes).
 * 2. If the pass is present, the bouncer takes the token (the actual VIP pass string).
 * 3. The bouncer then uses our secret key (process.env.JWT_SECRET) to verify that this pass is genuine 
 *    and wasn't forged by someone else. `jwt.verify` decrypts the token and gives us the hidden data inside.
 * 4. We then use this decoded ID to find the actual user in our database, but we make sure to 
 *    exclude their password from the data we grab (`.select('-password')`).
 * 5. We attach this user object directly to the `req` (request) object. This allows the next function 
 *    in line (our controller) to know exactly who made the request.
 * 6. If no token is provided, or the token is heavily tampered with, the bouncer kicks them out 
 *    with a 401 "Not authorized, token failed" error.
 */
const protect = async (req, res, next) => {
    let token;

    // Check if the authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token by splitting the string "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using our deeply covered secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the DB using the decoded ID (From generateToken payload we mapped to userId)
            req.user = await UserModel.findById(decoded.userId || decoded.id).select('-password');

            // Let the user through to the next function/controller
            next();
        } catch (error) {
            console.error('Bouncer alert: Token failed verification!', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        // First warning line: No token provided at all
        res.status(401).json({ message: 'Not authorized, no token found' });
    }
};

/**
 * admin (Middleware)
 * 
 * Okay, the user got past the 'protect' bouncer, but this next area is an Ultra VIP zone.
 * Think of this middleware as the bouncer checking to see if they have the special "Admin" VIP wristband.
 * 
 * 1. Because the `protect` middleware already ran right before this, we have full access to `req.user`.
 * 2. We simply check if `req.user.role` strictly equals 'admin'.
 * 3. If they are an admin, `next()` lets them proceed.
 * 4. If they are NOT an admin (maybe just a regular user), we halt them with a 403 "Not authorized as an admin" error.
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        // They have the VIP wristband. Let them through.
        next();
    } else {
        // Kicked out of the admin VIP area
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = {
    protect,
    admin
};
