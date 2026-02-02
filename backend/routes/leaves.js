const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// Helper: Mock parent notification
const notifyParent = (action, studentName, leaveDetails) => {
    console.log(`📱 PARENT NOTIFICATION [${action}]: Student ${studentName} - ${leaveDetails}`);
};

// @route   POST /api/leaves/apply
// @desc    Student applies for leave
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

        const leave = await Leave.create({
            studentId: req.user._id,
            leaveType,
            fromDateTime: from,
            toDateTime: to,
            reason
        });

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully',
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
// @desc    Get all pending leaves (for warden/admin)
// @access  Private (Warden/Admin)
router.get('/pending', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ status: 'PENDING' })
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

// @route   GET /api/leaves/emergency
// @desc    Get emergency leaves (for warden/admin)
// @access  Private (Warden/Admin)
router.get('/emergency', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const leaves = await Leave.find({ 
            leaveType: 'EMERGENCY',
            status: 'PENDING'
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

        if (leave.status !== 'PENDING') {
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
