const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, default: "Pending" },
    description: String,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);