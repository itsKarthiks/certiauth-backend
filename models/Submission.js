const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    projectTitle: { type: String, required: true },
    githubLink: { type: String, required: true },
    liveDemoLink: { type: String },
    isApproved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);