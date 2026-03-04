// Load environment variables from our .env file into the process.env object.
// This allows us to keep sensitive keys (like database passwords) hidden from our code.
require('dotenv').config();

// Import the Express framework, which makes it very easy to build web servers and APIs.
const express = require('express');

// Import CORS (Cross-Origin Resource Sharing).
// It's a security feature that decides which outside websites are allowed to talk to our API.
const cors = require('cors');

// Import our custom database connection logic from the config folder.
const connectDB = require('./config/db.js');

// Import our API Routes
const authRoutes = require('./routes/authRoutes.js');
const certificateRoutes = require('./routes/certificateRoutes.js');

// Import our Global Error Handler
const errorHandler = require('./middleware/errorHandler.js');

// Initialize the Express application. The 'app' object represents our server.
const app = express();

// Call the function to attempt connection to our MongoDB database.
connectDB();

// Apply the CORS middleware. By using this without options, we are currently allowing
// any other domain to make requests to our API. Useful for development!
app.use(cors());

// Apply the JSON parsing middleware. This ensures that if a client (like a frontend app)
// sends our API some data formatted as JSON, Express will neatly parse it and make it available
// in `req.body` for us to read in our routes.
app.use(express.json());

// Define a simple 'GET' route at the root path ('/').
// This acts as a "health check" to confirm our server is up and responsive.
// When someone visits this URL, they get back a small JSON object.
app.get('/', (req, res) => {
    // We respond with a 200 OK status and a JSON message.
    res.status(200).json({ message: "Certificate API is running" });
});

/**
 * MOUNTING OUR API ROUTES:
 * 
 * Think of `app.use` here as plugging in different hallways to our main building.
 * 
 * 1. Any incoming request that starts with `/api/auth` (e.g., /api/auth/login)
 *    gets automatically forwarded down the `authRoutes` hallway.
 * 2. Any incoming request that starts with `/api/certificates` (e.g., /api/certificates/issue)
 *    gets forwarded down the `certificateRoutes` hallway.
 */
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

/**
 * MOUNTING OUR GLOBAL ERROR HANDLER:
 * 
 * This MUST be placed at the VERY BOTTOM of all our route definitions!
 * Why? Express processes requests sequentially from top to bottom. 
 * If a request falls all the way down through our routes and something crashes, 
 * this error handler acts as the final safety net to gently catch the crash 
 * before it breaks the server entirely.
 */
app.use(errorHandler);

// Look in the .env file for a PORT definition. If one doesn't exist, fall back to port 5000.
// This is important because hosting providers like Heroku or AWS will dynamically assign a port via process.env.PORT.
const PORT = process.env.PORT || 5000;

// Tell our Express 'app' to start listening for incoming requests on the specified port.
app.listen(PORT, () => {
    // Once the server has started successfully, log this message to the terminal.
    console.log(`Server is up and running in development mode on port ${PORT}`);
});
