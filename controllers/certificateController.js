const CertificateModel = require('../models/CertificateModel.js');
const { v4: uuidv4 } = require('uuid');
const generateCertificateHash = require('../utils/hashGenerator.js');

/**
 * issueCertificate (Admin Only Action)
 * 
 * This function creates a brand new secure digital certificate. Let's walk through the logic:
 * 
 * 1. We grab the student details from the incoming request body (`studentName`, `studentId`, `program`, `cgpa`).
 * 2. We generate a globally unique identifier (UUID) for this specific certificate using `uuidv4()`.
 *    This will act as the public "link" or serial number for the certificate.
 * 3. We take the student's data and pass it into our `generateCertificateHash` function. 
 *    This uses our secret server key to create a unique, unbreakable `digitalSignature`.
 * 4. We save both the public `certificateId` and the hidden `digitalSignature` (along with the student details)
 *    into our database.
 * 5. We return the saved certificate data. Our frontend will take this data and convert the `certificateId` 
 *    into a QR code printed on the physical certificate.
 */
const issueCertificate = async (req, res) => {
    try {
        const { studentName, studentId, program, cgpa } = req.body;

        // Generate the public UUID link
        const certificateId = uuidv4();

        // Generate the deeply hidden cryptographic signature
        const digitalSignature = generateCertificateHash(req.body);

        // Save the brand new certificate into the database
        const certificate = await CertificateModel.create({
            certificateId,
            studentName,
            studentId,
            program,
            cgpa,
            digitalSignature
        });

        // Return success response to the frontend
        res.status(201).json({
            message: 'Certificate successfully issued',
            certificate
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to issue certificate', error: error.message });
    }
};

/**
 * verifyCertificate (Public Action)
 * 
 * This is the route triggered when an employer scans the QR code on a physical certificate.
 * 
 * 1. We extract the `certificateId` (the UUID from the QR code) from the request URL parameters.
 * 2. We query our database to see if a certificate with this exact ID exists.
 * 3. If it doesn't exist, it means the QR code is fake, and we throw a 404 error.
 * 4. If the database record indicates `isRevoked` is true, it means the university manually voided 
 *    this certificate. We throw a 400 error.
 * 5. If everything is valid, we return the student's details back to the employer's screen.
 * 
 * SECURITY NOTE: 
 * We DO NOT send the `digitalSignature` back to the frontend! By keeping the signature purely on 
 * the backend database, we ensure that hackers cannot reverse-engineer our secure hash formula. 
 * The `certificateId` simply acts as the public link to look up the DB record, but the DB 
 * securely holds the final truth.
 */
const verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;

        // Look up the certificate in the database using the public UUID
        const certificate = await CertificateModel.findOne({ certificateId });

        // If not found, it is a forged public link
        if (!certificate) {
            return res.status(404).json({ message: 'Invalid or Forged Certificate' });
        }

        // If the university has revoked this particular certificate
        if (certificate.isRevoked) {
            return res.status(400).json({ message: 'This certificate has been revoked' });
        }

        // It is fully valid! We return the student details, but we manually exclude 
        // the digital signature or any internal database IDs from the response using destructuring
        const { studentName, studentId, program, cgpa, issueDate } = certificate;

        res.status(200).json({
            message: 'Certificate is valid and authentic',
            data: {
                certificateId,
                studentName,
                studentId,
                program,
                cgpa,
                issueDate
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during verification', error: error.message });
    }
};

// Export the core business logic controllers cleanly
module.exports = {
    issueCertificate,
    verifyCertificate
};
