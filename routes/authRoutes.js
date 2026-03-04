const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController.js');

// Map the register functionality to the POST request at the '/register' endpoint
router.post('/register', registerUser);

// Map the login functionality to the POST request at the '/login' endpoint
router.post('/login', loginUser);

// Export the router cleanly to be used by the main server
module.exports = router;
