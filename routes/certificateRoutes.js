const express = require('express');
const router = express.Router();
const {
    issueCertificate,
    verifyCertificate,
    getDashboardStats,
    getAllCertificates,
    toggleCertificateStatus,
    exportAllCertificates,
    getRecentActivity,
    bulkIssueCertificates
} = require('../controllers/certificateController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

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
router.post('/issue', protect, admin, issueCertificate);
router.post('/bulk-issue', protect, admin, bulkIssueCertificates);

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
router.get('/stats', protect, admin, getDashboardStats);

/**
 * CERTIFICATE MANAGEMENT ROUTES:
 * 
 * 'getAllCertificates' handles the paginated table with search/filters.
 * 'toggleCertificateStatus' allows admins to revoke or restore certificates.
 */
router.get('/all', protect, admin, getAllCertificates);
router.patch('/:id/toggle-status', protect, admin, toggleCertificateStatus);

/**
 * UTILITY & ACTIVITY ROUTES:
 * 
 * 'export' provides raw data for CSV exports.
 * 'activity' provides the feed for recent verification successes.
 */
router.get('/export', protect, admin, exportAllCertificates);
router.get('/activity', protect, admin, getRecentActivity);

// Export the router cleanly to be used by the main server
module.exports = router;
