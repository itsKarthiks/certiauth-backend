const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Database Connection 
// (If this fails, it's okay for now - we just need the server to start)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/miniproject_local"; 

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
    console.error("Connection Failed:", err.message);
});

// 2. Routes
// Note: If you haven't created the routes folder yet, comment this line out with //
const projectRoutes = require('./routes/projects');
app.use('/api/projects', projectRoutes);

// 3. Status Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// 4. Start Server (THIS KEEPS IT RUNNING)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});