const supabase = require('../config/supabase.js');
const { v4: uuidv4 } = require('uuid');
const { signCertificateData, generateUniversityKeys } = require('../utils/cryptoUtils');

// UNIVERSITY KEY REPOSITORY (In-Memory for Demo)
const { publicKey, privateKey } = generateUniversityKeys();

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
    console.log("Incoming Request Body:", req.body);
    try {
        const { registrationNumber, name, course, cgpa, correctionId } = req.body;

        // Relaxed validation: Only registrationNumber, name, and cgpa are strictly required
        if (!registrationNumber || !name || !cgpa) {
            return res.status(400).json({ message: 'Missing required fields (registrationNumber, name, cgpa)' });
        }

        // Default missing values
        const finalCourse = course || "N/A";

        // THEERTHA + MIHIRIMA SECURE SIGNING ENGINE
        const { signature } = signCertificateData({
            registrationNumber,
            name,
            course: finalCourse,
            cgpa
        }, privateKey);

        // Simplify to direct upsert as registration_number is now the PK
        const { data, error } = await supabase
            .from('certificates')
            .upsert({
                registration_number: registrationNumber,
                student_name: name,
                course: finalCourse,
                cgpa,
                digital_signature: signature
            })
            .select();

        if (error) {
            console.error("Supabase Operation Error:", error.message);
            throw error;
        }

        // Mark correction request as resolved if it exists
        if (correctionId) {
            await supabase
                .from('correction_requests')
                .update({ status: 'Resolved' })
                .eq('id', correctionId);
        }

        const certificate = data && data.length > 0 ? data[0] : null;

        // Return success response to the frontend with the Public Key for QR generation
        res.status(201).json({
            message: 'Certificate successfully issued and signed',
            certificate,
            publicKey: publicKey
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
        const { certificateId } = req.params; // This will now represent registration_number

        // Look up the certificate in the database using the registration_number
        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('registration_number', certificateId)
            .single();

        // If not found (error code PGRST116 signifies no rows returned from .single()), it is forged.
        if (error && error.code === 'PGRST116' || !certificate) {
            return res.status(404).json({ message: 'Invalid or Forged Certificate' });
        }
        if (error) {
            throw error;
        }

        // If the university has revoked this particular certificate
        if (certificate.is_revoked === true) {
            return res.status(400).json({ message: 'This certificate has been revoked' });
        }

        // It is fully valid! We return the student details.
        const { student_name, registration_number, course, cgpa, created_at, digital_signature } = certificate;

        // LOGGING VERIFICATION EVENT
        await supabase.from('verification_logs').insert([{ registration_number: certificate.registration_number }]);

        res.status(200).json({
            message: 'Certificate is valid and authentic',
            data: {
                registrationNumber: registration_number,
                studentName: student_name,
                course: course,
                cgpa: cgpa,
                issueDate: created_at,
                digitalSignature: digital_signature
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
            query = query.or(`registration_number.ilike.%${search}%,student_name.ilike.%${search}%,course.ilike.%${search}%`);
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

        // First, fetch the current state of the certificate
        const { data: certificate, error: fetchError } = await supabase
            .from('certificates')
            .select('is_revoked')
            .eq('registration_number', id)
            .single();

        if (fetchError || !certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Flip the boolean and update
        const newRevokedStatus = !certificate.is_revoked;

        const { error: updateError } = await supabase
            .from('certificates')
            .update({ is_revoked: newRevokedStatus })
            .eq('registration_number', id);

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
            .select('registration_number, student_name, course, cgpa, created_at, is_revoked')
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
 * Takes an array of student objects and issues new ones.
 * Skips existing registration numbers to prevent silent overwrites.
 */
const bulkIssueCertificates = async (req, res) => {
    try {
        const { students } = req.body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "No student data provided" });
        }

        // Extract all incoming registration numbers
        const incomingRegNos = students.map(s => s.registration_number || s.student_id);

        // Query Supabase for existing records
        const { data: existingRecords, error: fetchError } = await supabase
            .from('certificates')
            .select('registration_number')
            .in('registration_number', incomingRegNos);

        if (fetchError) {
            console.error("Supabase Fetch Error:", fetchError.message);
            throw fetchError;
        }

        // Map existing records into an array of strings
        const existingRegNos = existingRecords.map(record => record.registration_number);

        // Split students into newStudents and skippedStudents
        const newStudents = [];
        const skippedStudents = [];

        students.forEach(student => {
            const regNo = student.registration_number || student.student_id;
            if (existingRegNos.includes(regNo)) {
                skippedStudents.push(student);
            } else {
                newStudents.push(student);
            }
        });

        // Run existing cryptographic hashing/signing logic ONLY on the newStudents array
        const preparedRows = newStudents.map(student => {
            // RSA SECURE SIGNING
            const { signature } = signCertificateData({
                registrationNumber: student.registration_number || student.student_id,
                name: student.student_name,
                course: student.program,
                cgpa: student.cgpa
            }, privateKey);

            return {
                registration_number: student.registration_number || student.student_id,
                student_name: student.student_name,
                course: student.program,
                cgpa: student.cgpa,
                digital_signature: signature
            };
        });

        console.log(`Inserting ${preparedRows.length} new certificates.`);

        // Insert the signed newStudents into Supabase
        if (preparedRows.length > 0) {
            const { error: insertError } = await supabase
                .from('certificates')
                .insert(preparedRows);

            if (insertError) {
                console.error("Supabase Bulk Insert Error:", insertError.message);
                throw insertError;
            }
        }

        res.status(200).json({
            message: "Bulk issuance cycle complete.",
            processedCount: newStudents.length,
            skipped: skippedStudents.map(s => s.registration_number)
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
