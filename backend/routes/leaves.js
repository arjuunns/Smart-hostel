const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const MLPredictionService = require('../services/mlPredictionService');
const StatsService = require('../services/statsService');

// Helper: Mock parent notification
const notifyParent = (action, studentName, leaveDetails) => {
    console.log(`📱 PARENT NOTIFICATION [${action}]: Student ${studentName} - ${leaveDetails}`);
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
            studentId: req.user._id,
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
            // Continue without ML prediction
        }

        const leave = await Leave.create({
            studentId: req.user._id,
            leaveType,
            fromDateTime: from,
            toDateTime: to,
            reason,
            status: initialStatus,
            // ML-related fields
            riskScore: prediction?.prediction?.riskScore || null,
            riskCategory: prediction?.prediction?.riskCategory || null,
            predictionFactors: prediction?.prediction ? {
                attendanceScore: prediction.features.student.attendancePercentage,
                historyScore: prediction.featureScores?.history?.risk || 0,
                calendarScore: prediction.features.calendar.calendarScore,
                patternScore: prediction.featureScores?.frequency?.risk || 0
            } : null,
            aiDecision,
            aiDecisionReason
        });

        // Generate gate pass if auto-approved
        if (initialStatus === 'AUTO_APPROVED') {
            leave.generateGatePass();
            leave.approvedAt = new Date();
            await leave.save();
            
            // Update student stats
            await StatsService.updateLeaveStats(req.user._id);
        }

        // Prepare response
        const responseData = {
            leave,
            mlPrediction: prediction ? {
                decision: prediction.prediction.decision,
                riskScore: prediction.prediction.riskScore,
                riskCategory: prediction.prediction.riskCategory,
                confidence: prediction.prediction.confidence,
                message: prediction.recommendation.suggestedResponse,
                warnings: prediction.explanation.negativeFactors,
                positives: prediction.explanation.positiveFactors
            } : null
        };

        // Determine response message
        let message = 'Leave application submitted successfully';
        if (initialStatus === 'AUTO_APPROVED') {
            message = '🎉 Leave auto-approved based on your excellent record!';
        } else if (initialStatus === 'FLAGGED') {
            message = 'Leave application submitted. Requires warden review due to calendar/history factors.';
        }

        res.status(201).json({
            success: true,
            message,
            data: responseData
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
        const leaves = await Leave.find({ studentId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('approvedBy', 'name email');

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
// @desc    Get all pending leaves (for warden/admin) - includes FLAGGED
// @access  Private (Warden/Admin)
router.get('/pending', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ status: { $in: ['PENDING', 'FLAGGED'] } })
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email hostelBlock roomNo phone');

        // Add ML risk info to response
        const leavesWithRisk = leaves.map(leave => ({
            ...leave.toObject(),
            mlInfo: {
                riskScore: leave.riskScore,
                riskCategory: leave.riskCategory,
                aiDecision: leave.aiDecision,
                aiDecisionReason: leave.aiDecisionReason,
                predictionFactors: leave.predictionFactors
            }
        }));

        res.json({
            success: true,
            count: leaves.length,
            summary: {
                pending: leaves.filter(l => l.status === 'PENDING').length,
                flagged: leaves.filter(l => l.status === 'FLAGGED').length,
                highRisk: leaves.filter(l => l.riskCategory === 'HIGH').length
            },
            data: leavesWithRisk
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/all
// @desc    Get all leaves (for warden/admin)
// @access  Private (Warden/Admin)
router.get('/all', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { status, leaveType } = req.query;
        const filter = {};
        
        if (status) filter.status = status;
        if (leaveType) filter.leaveType = leaveType;

        const leaves = await Leave.find(filter)
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email hostelBlock roomNo phone')
            .populate('approvedBy', 'name email');

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/flagged
// @desc    Get AI-flagged leaves requiring review (for warden/admin)
// @access  Private (Warden/Admin)
router.get('/flagged', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ status: 'FLAGGED' })
            .sort({ riskScore: -1, createdAt: -1 })
            .populate('studentId', 'name email hostelBlock roomNo phone');

        res.json({
            success: true,
            count: leaves.length,
            data: leaves.map(leave => ({
                ...leave.toObject(),
                mlInfo: {
                    riskScore: leave.riskScore,
                    riskCategory: leave.riskCategory,
                    aiDecision: leave.aiDecision,
                    aiDecisionReason: leave.aiDecisionReason,
                    predictionFactors: leave.predictionFactors
                }
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/auto-approved
// @desc    Get auto-approved leaves (for audit/warden/admin)
// @access  Private (Warden/Admin)
router.get('/auto-approved', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ status: 'AUTO_APPROVED' })
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email hostelBlock roomNo phone')
            .limit(50);

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/emergency
// @desc    Get emergency leaves (for warden/admin)
// @access  Private (Warden/Admin)
router.get('/emergency', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ 
            leaveType: 'EMERGENCY',
            status: { $in: ['PENDING', 'FLAGGED'] }
        })
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email hostelBlock roomNo phone');

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PATCH /api/leaves/:id/decision
// @desc    Approve or reject leave
// @access  Private (Warden/Admin)
router.patch('/:id/decision', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { action, remarks } = req.body;

        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT' });
        }

        const leave = await Leave.findById(req.params.id).populate('studentId', 'name email parentPhone');
        
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        if (leave.status !== 'PENDING' && leave.status !== 'FLAGGED') {
            return res.status(400).json({ success: false, message: 'Leave is already processed' });
        }

        // Update leave
        leave.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        leave.remarks = remarks;

        // Generate gate pass if approved
        if (action === 'APPROVE') {
            leave.generateGatePass();
            
            // Auto-mark attendance as ON_LEAVE for leave dates
            const startDate = new Date(leave.fromDateTime);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(leave.toDateTime);
            endDate.setHours(0, 0, 0, 0);

            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                await Attendance.findOneAndUpdate(
                    { studentId: leave.studentId._id, date: new Date(currentDate) },
                    { 
                        studentId: leave.studentId._id,
                        date: new Date(currentDate),
                        status: 'ON_LEAVE',
                        markedBy: req.user._id
                    },
                    { upsert: true, new: true }
                );
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        await leave.save();

        // Update student stats after decision
        await StatsService.updateLeaveStats(leave.studentId._id);

        // Create audit log
        await AuditLog.create({
            action: `LEAVE_${action}`,
            performedBy: req.user._id,
            targetType: 'Leave',
            targetId: leave._id,
            details: { remarks, gatePassId: leave.gatePassId }
        });

        // Mock parent notification
        notifyParent(
            action === 'APPROVE' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
            leave.studentId.name,
            `From: ${leave.fromDateTime} To: ${leave.toDateTime}. Remarks: ${remarks || 'None'}`
        );

        res.json({
            success: true,
            message: `Leave ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
            data: leave
        });
    } catch (error) {
        console.error('Decision error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/overstay
// @desc    Get overstayed students
// @access  Private (Warden/Admin/Guard)
router.get('/overstay', protect, authorize('warden', 'admin', 'guard'), async (req, res) => {
    try {
        const now = new Date();
        
        const overstayedLeaves = await Leave.find({
            status: 'APPROVED',
            currentStatus: 'OUT',
            toDateTime: { $lt: now }
        })
            .populate('studentId', 'name email hostelBlock roomNo phone parentPhone')
            .sort({ toDateTime: 1 });

        res.json({
            success: true,
            count: overstayedLeaves.length,
            data: overstayedLeaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/leaves/:id
// @desc    Get single leave by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id)
            .populate('studentId', 'name email hostelBlock roomNo phone')
            .populate('approvedBy', 'name email');

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        // Students can only view their own leaves
        if (req.user.role === 'student' && leave.studentId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this leave' });
        }

        res.json({
            success: true,
            data: leave
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
