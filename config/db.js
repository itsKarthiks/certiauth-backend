// Import the Mongoose library. Mongoose acts as a wrapper around the native MongoDB driver,
// providing a lot of helpful features like schemas, validation, and easier querying.
const mongoose = require('mongoose');

// This function handles the connection to our MongoDB database.
// It is declared as an 'async' function because connecting to a database
// takes a little bit of time, and we don't want to freeze our whole application
// while we wait for the database to respond.
const connectDB = async () => {
  try {
    // Attempt to connect to the database using the connection string from our environment variables (.env).
    // mongoose.connect returns a "Promise", so we use the 'await' keyword to pause
    // the execution of this function right here until the connection is successfully established.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If the connection is successful, we log a friendly message to the console
    // so we know exactly which database host we are connected to.
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If something goes wrong during the connection attempt (e.g., wrong password,
    // database is down, or no internet connection), this block catches the error.
    
    // We log the exact error message so we can figure out what went wrong.
    console.error(`Error connecting to MongoDB: ${error.message}`);
    
    // Since the database is essential for our application to work,
    // we forcibly shut down the entire Node.js process.  
    // 'process.exit(1)' means "exit with a failure code".
    process.exit(1);
  }
};

// We export this function so that it can be imported and run from our main server file (server.js).
module.exports = connectDB;
