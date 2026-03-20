const express = require('express');
const router = express.Router();
const { issueCertificate, verifyCertificate, getDashboardStats, getAllCertificates, toggleCertificateStatus, exportAllCertificates, getRecentActivity, bulkIssueCertificates } = require('../controllers/certificateController.js');
const { protect } = require('../middleware/authMiddleware.js');

// Import multer for handling multipart/form-data (file uploads) and
// configure it to keep files in memory (as a Buffer) rather than saving to disk.
// This is ideal for temporary processing — we parse and discard, nothing lingers on the server.
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Import pdf-parse to extract raw text content from the uploaded PDF buffer.
const pdfParse = require('pdf-parse');

// Import the Supabase client so we can query the certificates table.
const supabase = require('../config/supabase.js');

/**
 * WHY THIS ROUTE HAS MIDDLEWARE ('protect', 'admin'):
 * 
 * Think of issuing a new certificate as printing free money. If anyone could hit this route, 
 * our university would become a massive scam mill. Therefore, we firmly lock this door! 
 * 
 * When a POST request hits '/issue':
 * 1. First, the 'protect' middleware stops them and asks for their ID (JWT Token).
 * 2. If they have a valid token, the 'admin' middleware steps in and checks if they 
 *    have the powerful 'admin' wristband.
 * 3. Only if BOTH bouncers give the green light do we finally run the 'issueCertificate' 
 *    function to actually generate the digital certificate.
 */
router.post('/issue', protect, issueCertificate);
router.post('/bulk-issue', protect, bulkIssueCertificates);

/**
 * WHY THIS ROUTE IS WIDE OPEN (No Middleware):
 * 
 * This is the public route that physical QR codes point to. Any random employer in the world 
 * might scan the student's paper certificate with their phone. We can't expect the employer 
 * to have an account, log in, or show a VIP pass just to verify a piece of paper!
 * 
 * Therefore, we purposely do not put 'protect' or 'admin' here. We leave the door completely 
 * wide open so anyone can freely verify if a certificate is real or forged. The security here 
 * relies on our internal database logic in 'verifyCertificate', not on locked doors.
 */
router.get('/verify/:certificateId', verifyCertificate);

/**
 * ADMIN STATS ENDPOINT:
 * 
 * Fetches the counts for total issued, total revoked, and total verifications.
 * Locked behind admin authentication.
 */
router.get('/stats', protect, getDashboardStats);

/**
 * CERTIFICATE MANAGEMENT ROUTES:
 * 
 * 'getAllCertificates' handles the paginated table with search/filters.
 * 'toggleCertificateStatus' allows admins to revoke or restore certificates.
 */
router.get('/all', protect, getAllCertificates);
router.patch('/:id/toggle-status', protect, toggleCertificateStatus);

/**
 * UTILITY & ACTIVITY ROUTES:
 * 
 * 'export' provides raw data for CSV exports.
 * 'activity' provides the feed for recent verification successes.
 */
router.get('/export', protect, exportAllCertificates);
router.get('/activity', protect, getRecentActivity);

/**
 * DOCUMENT UPLOAD VERIFICATION ROUTE:
 *
 * This is the public-facing endpoint for the "Upload PDF" verification feature.
 * A student uploads their certificate PDF; we:
 *   1. Parse the PDF bytes into text using pdf-parse.
 *   2. Use a regex to fish out the 11-digit university registration number.
 *   3. Cross-reference it against the Supabase `certificates` table.
 *   4. Return the verified record (or an appropriate error).
 *
 * No authentication is required — any member of the public (e.g. an employer)
 * should be able to verify a certificate without needing an account.
 */
router.post('/verify-file', upload.single('document'), async (req, res) => {
    // Step 1: Ensure a file was actually attached to the request.
    // multer populates req.file when a valid file field named 'document' is present.
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded. Please attach a PDF document.' });
    }

    try {
        // Step 2: Extract raw text from the PDF buffer.
        // pdfParse reads the raw bytes (req.file.buffer) and returns an object
        // whose `.text` property contains all human-readable text from the document.
        const data = await pdfParse(req.file.buffer);

        // DEBUG: Log the raw extracted text so we can see exactly what pdf-parse
        // pulled out of the browser-printed PDF. Check your server terminal for this.
        console.log("RAW PDF TEXT:", data.text);

        // Step 3: Strip ALL whitespace (spaces, newlines, tabs) from the extracted text
        // before searching. Browser-printed PDFs often insert phantom spaces in the
        // middle of numbers, which causes word-boundary regexes like \b\d{11}\b to
        // silently fail. Collapsing the whitespace first stitches those fragments back
        // into a single solid digit string that the regex can find reliably.
        const cleanText = data.text.replace(/\s+/g, '');
        console.log("CLEANED TEXT (first 300 chars):", cleanText.slice(0, 300));

        const match = cleanText.match(/\d{11}/);

        if (!match) {
            // The PDF didn't contain anything that looks like a registration number.
            return res.status(400).json({ success: false, message: 'No 11-digit ID found in document.' });
        }

        const registrationNumber = match[0];
        console.log("EXTRACTED REGISTRATION NUMBER:", registrationNumber);

        // Step 4: Query Supabase for a certificate matching this registration number.
        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('registration_number', registrationNumber)
            .single();

        if (error || !certificate) {
            // The ID was structurally valid but not found in our database —
            // the certificate may be forged or not yet issued.
            console.log("Supabase lookup failed for:", registrationNumber, "| Error:", error?.message);
            return res.status(404).json({ success: false, message: 'Certificate not found in database.' });
        }

        // Step 5: Success! Return the full certificate record to the client.
        return res.status(200).json({ success: true, data: certificate });

    } catch (err) {
        // Catch-all: handles corrupt PDFs, pdf-parse failures, or unexpected Supabase errors.
        console.error('Error in /verify-file:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process the document. Please ensure it is a valid PDF.' });
    }
});

// Export the router cleanly to be used by the main server
module.exports = router;
