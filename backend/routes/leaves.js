const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
const MLPredictionService = require('../services/mlPredictionService');
const StatsService = require('../services/statsService');

// Helper: Mock parent notification
const notifyParent = (action, studentName, leaveDetails) => {
    console.log(`📱 PARENT NOTIFICATION [${action}]: Student ${studentName} - ${leaveDetails}`);
};

// Helper: Generate a unique gate pass ID
const generateGatePassId = () => {
    return `GP-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
};

// @route   POST /api/leaves/apply
// @desc    Student applies for leave with ML prediction
// @access  Private (Student)
router.post('/apply', protect, authorize('student'), async (req, res) => {
    try {
        const { leaveType, fromDateTime, toDateTime, reason } = req.body;

        // Validate dates
        const from = new Date(fromDateTime);
        const to = new Date(toDateTime);
        
        if (from >= to) {
            return res.status(400).json({ success: false, message: 'To date must be after From date' });
        }

        if (from < new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot apply leave for past dates' });
        }

        // Generate ML prediction
        const leaveRequest = {
            studentId: req.user.id,
            fromDate: from,
            toDate: to,
            leaveType: leaveType || 'REGULAR',
            reason: reason || ''
        };

        const studentInfo = {
            hostelBlock: req.user.hostelBlock,
            course: req.user.course,
            year: req.user.year
        };

        let prediction = null;
        let initialStatus = 'PENDING';
        let aiDecision = null;
        let aiDecisionReason = null;

        try {
            prediction = await MLPredictionService.predictLeaveApproval(leaveRequest, studentInfo);
            
            // Set status based on ML decision
            if (prediction.prediction.decision === 'AUTO_APPROVE') {
                initialStatus = 'AUTO_APPROVED';
                aiDecision = 'AUTO_APPROVED';
                aiDecisionReason = prediction.recommendation.reason;
            } else if (prediction.prediction.decision === 'FLAG' || prediction.prediction.decision === 'REJECT') {
                initialStatus = 'FLAGGED';
                aiDecision = 'FLAGGED';
                aiDecisionReason = prediction.recommendation.reason;
            } else {
                aiDecision = 'MANUAL';
                aiDecisionReason = 'Standard review required';
            }
        } catch (mlError) {
            console.error('ML Prediction error:', mlError);
        }

        // Generate gate pass if auto-approved
        let gatePassId = null;
        let approvedAt = null;
        if (initialStatus === 'AUTO_APPROVED') {
            gatePassId = generateGatePassId();
            approvedAt = new Date();
        }

        const leave = await prisma.leave.create({
            data: {
                studentId: req.user.id,
                leaveType: leaveType || 'REGULAR',
                fromDateTime: from,
                toDateTime: to,
                reason,
                status: initialStatus,
                gatePassId,
                approvedAt,
                // ML-related fields
                riskScore: prediction?.prediction?.riskScore || null,
                riskCategory: prediction?.prediction?.riskCategory || null,
                attendanceScore: prediction?.features?.student?.attendancePercentage || null,
                historyScore: prediction?.featureScores?.history?.risk || 0,
                calendarScore: prediction?.features?.calendar?.calendarScore || null,
                patternScore: prediction?.featureScores?.frequency?.risk || 0,
                aiDecision,
                aiDecisionReason
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'APPLY',
                model: 'Leave',
                documentId: leave.id.toString(),
                performedBy: req.user.id,
                details: `Applied for ${leaveType} leave. Status: ${initialStatus}`
            }
        });

        // Trigger stats refresh in background
        StatsService.refreshAllStats(req.user.id).catch(console.error);

        res.status(201).json({
            success: true,
            message: initialStatus === 'AUTO_APPROVED' 
                ? 'Leave auto-approved by AI System!' 
                : 'Leave application submitted successfully',
            data: leave
        });
    } catch (error) {
        console.error('Apply leave error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/mine
// @desc    Get student's own leaves
// @access  Private (Student)
router.get('/mine', protect, authorize('student'), async (req, res) => {
    try {
        const leaves = await prisma.leave.findMany({
            where: { studentId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/pending
// @desc    Get pending leave requests
// @access  Private (Warden/Admin)
router.get('/pending', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await prisma.leave.findMany({
            where: {
                status: { in: ['PENDING', 'FLAGGED'] }
            },
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = leaves.map(l => ({
            ...l,
            _id: l.id
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/all
// @desc    Get all leave requests (with filters)
// @access  Private (Warden/Admin)
router.get('/all', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { status, leaveType } = req.query;
        const whereClause = {};

        if (status) whereClause.status = status;
        if (leaveType) whereClause.leaveType = leaveType;

        const leaves = await prisma.leave.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                },
                approver: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = leaves.map(l => ({
            ...l,
            _id: l.id
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/emergency
// @desc    Get emergency leave requests
// @access  Private (Warden/Admin)
router.get('/emergency', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await prisma.leave.findMany({
            where: {
                leaveType: 'EMERGENCY',
                status: 'PENDING'
            },
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = leaves.map(l => ({
            ...l,
            _id: l.id
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PATCH /api/leaves/:leaveId/decision
// @desc    Approve or reject leave application
// @access  Private (Warden/Admin)
router.patch('/:leaveId/decision', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaveId = parseInt(req.params.leaveId);
        const { action, remarks } = req.body; // action: 'APPROVE' or 'REJECT'

        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const leave = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: { student: true }
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }

        if (!['PENDING', 'FLAGGED'].includes(leave.status)) {
            return res.status(400).json({ success: false, message: 'Decision already made on this leave request' });
        }

        const finalStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        
        let gatePassId = leave.gatePassId;
        if (action === 'APPROVE' && !gatePassId) {
            gatePassId = generateGatePassId();
        }

        const updatedLeave = await prisma.leave.update({
            where: { id: leaveId },
            data: {
                status: finalStatus,
                remarks,
                gatePassId,
                approvedBy: req.user.id,
                approvedAt: new Date()
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action,
                model: 'Leave',
                documentId: leaveId.toString(),
                performedBy: req.user.id,
                details: `Leave ${finalStatus.toLowerCase()}. Remarks: ${remarks || 'None'}`
            }
        });

        // Refresh stats
        StatsService.refreshAllStats(leave.studentId).catch(console.error);

        // Notify parents
        notifyParent(
            action,
            leave.student.name,
            `${leave.leaveType} leave from ${leave.fromDateTime.toDateString()} to ${leave.toDateTime.toDateString()}`
        );

        res.json({
            success: true,
            message: `Leave request has been ${finalStatus.toLowerCase()}`,
            data: updatedLeave
        });
    } catch (error) {
        console.error('Decision error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/overstay
// @desc    Get list of overstayed students
// @access  Private (Warden/Admin)
router.get('/overstay', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const now = new Date();
        const overstayed = await prisma.leave.findMany({
            where: {
                status: 'APPROVED',
                currentStatus: 'OUT',
                toDateTime: { lt: now }
            },
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true,
                        phone: true
                    }
                }
            },
            orderBy: { toDateTime: 'asc' }
        });

        res.json({
            success: true,
            count: overstayed.length,
            data: overstayed
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/flagged
// @desc    Get AI flagged leaves
// @access  Private (Warden/Admin)
router.get('/flagged', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const flagged = await prisma.leave.findMany({
            where: { status: 'FLAGGED' },
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = flagged.map(l => ({
            ...l,
            _id: l.id
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/auto-approved
// @desc    Get auto-approved leaves count for today
// @access  Private (Warden/Admin)
router.get('/auto-approved', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        
        const count = await prisma.leave.count({
            where: {
                status: 'AUTO_APPROVED',
                approvedAt: { gte: todayStart }
            }
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/:leaveId
// @desc    Get details of a specific leave request
// @access  Private
router.get('/:leaveId', protect, async (req, res) => {
    try {
        const leaveId = parseInt(req.params.leaveId);
        const leave = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                }
            }
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }

        // Limit access to student owner or warden/admin
        if (req.user.role === 'student' && leave.studentId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({
            success: true,
            data: {
                ...leave,
                _id: leave.id
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
