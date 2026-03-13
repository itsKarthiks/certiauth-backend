const supabase = require('../config/supabase.js');
const { v4: uuidv4 } = require('uuid');
const generateCertificateHash = require('../utils/hashGenerator.js');

/**
 * issueCertificate (Admin Only Action)
 * 
 * This function creates a brand new secure digital certificate. Let's walk through the logic:
 * 
 * 1. We grab the student details from the incoming request body (`studentName`, `studentId`, `program`, `cgpa`).
 * 2. We generate a globally unique identifier (UUID) for this specific certificate using `uuidv4()`.
 * 3. We take the student's data and pass it into our `generateCertificateHash` function. 
 * 4. We save both the public `certificateId` and the hidden `digitalSignature` into our Postgres database.
 */
const issueCertificate = async (req, res) => {
    try {
        const { student_name, student_id, program, cgpa } = req.body;

        if (!student_name || !student_id || !program || !cgpa) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Generate the public UUID link
        const certificateId = uuidv4();

        // Generate the deeply hidden cryptographic signature
        const digitalSignature = generateCertificateHash(req.body);

        // Save the brand new certificate into the database
        // SUPABASE DIFFERENCE: We insert into a relational Postgres table using .insert() wrapped in an array.
        // We explicitly map our camelCase JavaScript variables to the snake_case columns in our DB
        // (e.g., student_name, student_id, digital_signature). We append .select() to get the row returned.
        const { data, error } = await supabase
            .from('certificates')
            .insert([{
                certificate_id: certificateId,
                student_name,
                student_id,
                program,
                cgpa,
                digital_signature: digitalSignature
            }])
            .select();

        if (error) {
            throw error;
        }

        const certificate = data && data.length > 0 ? data[0] : null;

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
 */
const verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;

        // Look up the certificate in the database using the public UUID
        // SUPABASE DIFFERENCE: Using .select('*').eq(...).single() closely replaces Mongoose's .findOne()
        // by making sure we retrieve exactly one row (or triggering an error if zero rows).
        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*')
            .or(`certificate_id.eq.${req.params.certificateId},student_id.eq.${req.params.certificateId}`)
            .single();

        // If not found (error code PGRST116 signifies no rows returned from .single()), it is forged.
        if (error && error.code === 'PGRST116' || !certificate) {
            return res.status(404).json({ message: 'Invalid or Forged Certificate' });
        }
        if (error) {
            throw error;
        }

        // If the university has revoked this particular certificate
        // Checking `is_revoked` instead of `isRevoked` to match Postgres schema naming pattern.
        if (certificate.is_revoked === true) {
            return res.status(400).json({ message: 'This certificate has been revoked' });
        }

        // It is fully valid! We return the student details.
        const { student_name, student_id, program: certProgram, cgpa: certCgpa, issue_date } = certificate;

        // LOGGING VERIFICATION EVENT
        // We record this successful verification event in our history table
        await supabase.from('verification_logs').insert([{ certificate_id: certificate.certificate_id }]);

        res.status(200).json({
            message: 'Certificate is valid and authentic',
            data: {
                certificateId: certificate.certificate_id,
                studentName: student_name,
                studentId: student_id,
                program: certProgram,
                cgpa: certCgpa,
                issueDate: issue_date
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during verification', error: error.message });
    }
};

/**
 * getDashboardStats (Admin Only Action)
 * 
 * This function calculates total counts across various tables to provide a summary
 * view for the administrator dashboard.
 */
const getDashboardStats = async (req, res) => {
    try {
        // Fetch total certificates (all issued)
        const { count: totalIssued, error: err1 } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true });

        // Fetch revoked certificates
        const { count: totalRevoked, error: err2 } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('is_revoked', true);

        // Fetch total verifications from logs
        const { count: totalVerifications, error: err3 } = await supabase
            .from('verification_logs')
            .select('*', { count: 'exact', head: true });

        if (err1 || err2 || err3) {
            throw new Error('Failed to fetch some statistics from the database');
        }

        // Return the gathered metrics
        res.status(200).json({
            totalIssued: totalIssued || 0,
            totalVerifications: totalVerifications || 0,
            totalRevoked: totalRevoked || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
};

/**
 * getAllCertificates (Admin Only Action)
 * 
 * This function handles the server-side logic for the main dashboard table.
 * It supports:
 * 1. Pagination (page, limit)
 * 2. Search (student_id, student_name, program)
 * 3. Filtering by Status (is_revoked)
 */
const getAllCertificates = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || '';
        const status = req.query.status || 'ALL';

        // Calculate Supabase pagination range
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Start building the query
        let query = supabase
            .from('certificates')
            .select('*', { count: 'exact' });

        // Apply search logic (checks across multiple columns)
        if (search) {
            query = query.or(`student_id.ilike.%${search}%,student_name.ilike.%${search}%,program.ilike.%${search}%`);
        }

        // Apply status filtering
        if (status === 'ACTIVE') {
            query = query.eq('is_revoked', false);
        } else if (status === 'REVOKED') {
            query = query.eq('is_revoked', true);
        }

        // Apply ordering and the calculated pagination range
        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Return results to the frontend
        res.status(200).json({
            data: data || [],
            total: count || 0,
            page,
            limit
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch certificates', error: error.message });
    }
};

/**
 * toggleCertificateStatus (Admin Only Action)
 * 
 * Flips the 'is_revoked' status of a certificate.
 */
const toggleCertificateStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // First, fetch the current current state of the certificate
        const { data: certificate, error: fetchError } = await supabase
            .from('certificates')
            .select('is_revoked')
            .eq('certificate_id', id)
            .single();

        if (fetchError || !certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Flip the boolean and update
        const newRevokedStatus = !certificate.is_revoked;

        const { error: updateError } = await supabase
            .from('certificates')
            .update({ is_revoked: newRevokedStatus })
            .eq('certificate_id', id);

        if (updateError) throw updateError;

        res.status(200).json({
            message: `Certificate status updated to ${newRevokedStatus ? 'REVOKED' : 'ACTIVE'}`,
            is_revoked: newRevokedStatus
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle status', error: error.message });
    }
};

/**
 * exportAllCertificates (Admin Only Action)
 * 
 * Fetches all certificate records without pagination for CSV generation 
 * on the frontend side.
 */
const exportAllCertificates = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('certificates')
            .select('certificate_id, student_id, student_name, program, cgpa, issue_date, is_revoked')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export certificates', error: error.message });
    }
};

/**
 * getRecentActivity (Admin Only Action)
 * 
 * Fetches the 5 most recent verification attempts from the logs.
 * We join with the 'certificates' table to show the specific Student ID 
 * associated with each verification event.
 */
const getRecentActivity = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            return res.status(500).json({ message: "Failed to fetch recent logs" });
        }
        return res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
    }
};

/**
 * bulkIssueCertificates (Admin Only Action)
 * 
 * Takes an array of student objects and issues all of them in a single
 * database transaction for maximum performance.
 */
const bulkIssueCertificates = async (req, res) => {
    try {
        const { students } = req.body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "No student data provided" });
        }

        // Map and prepare all rows for the bulk insert
        const preparedRows = students.map(student => {
            const certificateId = uuidv4();

            // We pass the individual student object to our existing hash utility
            const digitalSignature = generateCertificateHash({
                student_name: student.student_name,
                student_id: student.student_id,
                program: student.program,
                cgpa: student.cgpa
            });

            return {
                certificate_id: certificateId,
                student_name: student.student_name,
                student_id: student.student_id,
                program: student.program,
                cgpa: student.cgpa,
                digital_signature: digitalSignature
            };
        });

        // Supabase .insert() handles arrays as a bulk operation by default
        const { data, error } = await supabase
            .from('certificates')
            .insert(preparedRows)
            .select();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: `Successfully issued ${preparedRows.length} certificates`,
            count: preparedRows.length
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to perform bulk issuance', error: error.message });
    }
};

module.exports = {
    issueCertificate,
    verifyCertificate,
    getDashboardStats,
    getAllCertificates,
    toggleCertificateStatus,
    exportAllCertificates,
    getRecentActivity,
    bulkIssueCertificates
};
