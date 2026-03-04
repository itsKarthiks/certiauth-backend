// Import Mongoose. Mongoose acts as a very helpful middleman between our Node.js code
// and our MongoDB database. It allows us to define strict rules (Schemas) about how our
// data should look before it gets saved, which prevents bad data from sneaking in!
const mongoose = require('mongoose');

// We define a Schema for our User. Think of a Schema like a blueprint or a strict set of rules.
// Whenever we try to save a new user to the database, Mongoose checks this blueprint
// to ensure the user has all the required fields and that the fields are the correct type.
const userSchema = new mongoose.Schema(
    {
        // The 'name' field is simply the user's full name.
        // It must be a String (text), and 'required: true' means Mongoose will instantly
        // throw an error and refuse to save the user if this field is left blank.
        name: {
            type: String,
            required: true,
        },

        // The 'email' field is how the user will log in.
        // It must be a String and is required.
        // 'unique: true' is a very important security and logic constraint:
        // It tells the database to build a special index so that no two users
        // can ever sign up with the exact same email address.
        email: {
            type: String,
            required: true,
            unique: true,
        },

        // The 'password' field stores the user's password.
        // However, for security, this will NOT be the raw password (like "password123").
        // Later on, before saving to the DB, we will use 'bcryptjs' to scramble (hash)
        // this password so even if a hacker steals our database, they can't read the passwords.
        password: {
            type: String,
            required: true,
        },

        // The 'role' field is crucial for our system's logic and security.
        // We need to differentiate between 'admins' (people who can issue or revoke certificates)
        // and 'students' (people who just view their certificates).
        // The 'enum' array strictly limits the possible values. You cannot be a 'manager' or 'guest'.
        // If no role is provided when creating a user, 'default: student' ensures they
        // safely default to the lowest privilege level preventing accidental admin creation.
        role: {
            type: String,
            enum: ['admin', 'student'],
            default: 'student',
        },
    },
    {
        // This handy Mongoose feature automatically adds two extra fields to every user:
        // 'createdAt' (exactly when the user was saved to the database) and
        // 'updatedAt' (when their details were last modified).
        // This is great for auditing and tracking when users joined the system.
        timestamps: true,
    }
);

// Finally, we compile our 'userSchema' blueprint into a fully functional 'Model' named 'User'.
// Mongoose will automatically look for a MongoDB collection named 'users' (lowercase, pluralized).
// We export this Model so we can use it in other files (like our authentication controllers)
// to find, create, or update users.
module.exports = mongoose.model('User', userSchema);
