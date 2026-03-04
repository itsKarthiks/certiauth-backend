// Import Mongoose to interact with our MongoDB database.
// Mongoose provides the framework to structure our data before it's saved.
const mongoose = require('mongoose');

// We define a Schema (blueprint) for a Certificate.
// This ensures that every certificate document saved to the database has exactly these fields
// and follows these strict data typing rules.
const certificateSchema = new mongoose.Schema(
    {
        // 'certificateId' is the public string we actually show to the world (e.g., in a QR code or a URL link).
        // It's usually a securely generated random UUID (like '123e4567-e89b-12d3-a456-426614174000').
        // It must be a String, is required, and MUST be unique so no two certificates ever share the same ID.
        // **IMPORTANT DISTINCTION**: This is PUBLIC. Anyone can see it. It is used to look up the certificate details.
        certificateId: {
            type: String,
            required: true,
            unique: true,
        },

        // 'studentName' is the full name of the student who earned the certificate.
        studentName: {
            type: String,
            required: true,
        },

        // 'studentId' is the university/school identifier (like a roll number or registration number).
        studentId: {
            type: String,
            required: true,
        },

        // 'program' describes what the certificate is for (e.g., "B.Tech Computer Science" or "Web Dev Bootcamp").
        program: {
            type: String,
            required: true,
        },

        // 'cgpa' (or grade) achieved by the student. Stored as a string to allow formats like "9.8" or "A+".
        cgpa: {
            type: String,
            required: true,
        },

        // 'issueDate' is when the certificate was officially granted.
        // If we don't provide a date when creating the certificate, 'default: Date.now'
        // automatically grabs the exact current server time and saves it.
        issueDate: {
            type: Date,
            default: Date.now,
        },

        // 'digitalSignature' is the secret, hidden cryptographic proof of authenticity!
        // When an admin issues a certificate, the server takes the student's details, combines them
        // with our 'SECRET_HASH_KEY' (from .env), and generates a complex cryptographic hash.
        // **IMPORTANT DISTINCTION**: Unlike 'certificateId', this signature is generally kept hidden on the backend.
        // It proves that the data hasn't been tampered with since we issued it.
        digitalSignature: {
            type: String,
            required: true,
        },

        // 'isRevoked' acts as a kill switch.
        // If we discover a certificate was issued by mistake, or the student cheated,
        // an admin can flip this Boolean from false to true.
        // When someone scans the QR code for a revoked certificate, our API will check this field
        // and instantly report "Warning: This certificate has been revoked!" instead of verifying it.
        isRevoked: {
            type: Boolean,
            default: false,
        },

        // 'revocationReason' is optional text explaining WHY the certificate was revoked.
        // If 'isRevoked' is false, this usually stays as an empty string.
        revocationReason: {
            type: String,
            default: '',
        },
    },
    {
        // Automatically adds 'createdAt' and 'updatedAt' timestamps to track exactly when
        // this specific database record was created or modified.
        timestamps: true,
    }
);

// Compile the schema into a usable Model named 'Certificate'.
// Mongoose will store these in a MongoDB collection named 'certificates'.
// We export the model so our controllers can use it to create or verify certificates.
module.exports = mongoose.model('Certificate', certificateSchema);
