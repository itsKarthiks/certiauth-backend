/**
 * errorHandler (Global Error Middleware)
 * 
 * Think of this as the ultimate safety net positioned at the very bottom of our server.
 * If any of our controllers or middleware crash or throw an error, instead of the server 
 * simply blowing up and sending a scary, unreadable HTML error page back to the frontend devs, 
 * this function catches the crash, formats it nicely, and sends a clean JSON response.
 * 
 * 1. The first parameter 'err' is the actual error object that was thrown.
 * 2. We set the status code. If the server was mistakenly about to send a 200 (Success) 
 *    even though it crashed, we force it to a 500 (Internal Server Error).
 *    Otherwise, we use the specific error code that the developer intentionally threw (like a 404).
 * 3. We return a nice, formatted JSON object containing the error 'message'.
 * 4. We also return the 'stack' trace (which tells us exactly which file and line caused the crash), 
 *    BUT we only reveal this in our local development environment. 
 *    If we are in 'production' (live on the internet), we hide the stack trace so hackers 
 *    don't get internal roadmaps to our server architecture.
 */
const errorHandler = (err, req, res, next) => {
    // Log the error stack to our console for debugging purposes
    console.error(`💥 [Global Error Caught]: ${err.message}`);

    // Determine the status code
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Set the status code before sending the response
    res.status(statusCode);

    // Send the cleanly formatted JSON response
    res.json({
        message: err.message,
        // Hide the messy stack trace from the public if we are in production
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

module.exports = errorHandler;
