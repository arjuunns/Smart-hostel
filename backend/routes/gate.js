const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const GateLog = require('../models/GateLog');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// Helper: Mock parent notification
const notifyParent = (action, studentName, details) => {
    console.log(`📱 PARENT NOTIFICATION [${action}]: Student ${studentName} - ${details}`);
};

// @route   POST /api/gate/exit
// @desc    Log student exit (Guard scans QR)
// @access  Private (Guard)
router.post('/exit', protect, authorize('guard', 'admin'), async (req, res) => {
    try {
        const { gatePassId } = req.body;

        if (!gatePassId) {
            return res.status(400).json({ success: false, message: 'Gate Pass ID is required' });
        }

        // Find leave with this gate pass
        const leave = await Leave.findOne({ gatePassId }).populate('studentId', 'name email parentPhone');

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Invalid Gate Pass ID' });
        }

        if (leave.status !== 'APPROVED') {
            return res.status(400).json({ success: false, message: 'Leave is not approved' });
        }

        if (leave.currentStatus === 'OUT') {
            return res.status(400).json({ success: false, message: 'Student has already exited' });
        }

        // Check if leave is valid for current time
        const now = new Date();
        if (now < leave.fromDateTime) {
            return res.status(400).json({ success: false, message: 'Leave period has not started yet' });
        }

        // Create exit log
        const gateLog = await GateLog.create({
            studentId: leave.studentId._id,
            leaveId: leave._id,
            gatePassId,
            action: 'EXIT',
            performedBy: req.user._id
        });

        // Update leave status
        leave.currentStatus = 'OUT';
        await leave.save();

        // Mock parent notification
        notifyParent('EXIT', leave.studentId.name, `Exited hostel at ${new Date().toLocaleString()}`);

        res.json({
            success: true,
            message: 'Exit logged successfully',
            data: {
                gateLog,
                student: leave.studentId.name,
                leaveId: leave._id
            }
        });
    } catch (error) {
        console.error('Exit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/gate/entry
// @desc    Log student entry (Guard scans QR)
// @access  Private (Guard)
router.post('/entry', protect, authorize('guard', 'admin'), async (req, res) => {
    try {
        const { gatePassId } = req.body;

        if (!gatePassId) {
            return res.status(400).json({ success: false, message: 'Gate Pass ID is required' });
        }

        // Find leave with this gate pass
        const leave = await Leave.findOne({ gatePassId }).populate('studentId', 'name email parentPhone');

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Invalid Gate Pass ID' });
        }

        if (leave.currentStatus !== 'OUT') {
            return res.status(400).json({ success: false, message: 'Student has not exited or already returned' });
        }

        // Create entry log
        const gateLog = await GateLog.create({
            studentId: leave.studentId._id,
            leaveId: leave._id,
            gatePassId,
            action: 'ENTRY',
            performedBy: req.user._id
        });

        // Update leave status
        leave.currentStatus = 'IN';
        await leave.save();

        // Check if overstayed
        const now = new Date();
        const isOverstayed = now > leave.toDateTime;

        // Mock parent notification
        notifyParent('ENTRY', leave.studentId.name, `Returned to hostel at ${now.toLocaleString()}${isOverstayed ? ' (OVERSTAYED)' : ''}`);

        res.json({
            success: true,
            message: 'Entry logged successfully',
            data: {
                gateLog,
                student: leave.studentId.name,
                leaveId: leave._id,
                isOverstayed
            }
        });
    } catch (error) {
        console.error('Entry error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/gate/out
// @desc    Get list of students currently out
// @access  Private (Guard/Warden/Admin)
router.get('/out', protect, authorize('guard', 'warden', 'admin'), async (req, res) => {
    try {
        const outStudents = await Leave.find({
            status: 'APPROVED',
            currentStatus: 'OUT'
        })
            .populate('studentId', 'name email hostelBlock roomNo phone')
            .sort({ fromDateTime: -1 });

        const now = new Date();
        const result = outStudents.map(leave => ({
            _id: leave._id,
            student: leave.studentId,
            leaveType: leave.leaveType,
            fromDateTime: leave.fromDateTime,
            toDateTime: leave.toDateTime,
            gatePassId: leave.gatePassId,
            isOverstayed: now > leave.toDateTime
        }));

        res.json({
            success: true,
            count: result.length,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PATCH /api/gate/force-return/:leaveId
// @desc    Force mark student as returned (Warden/Admin override)
// @access  Private (Warden/Admin)
router.patch('/force-return/:leaveId', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { remarks } = req.body;

        const leave = await Leave.findById(req.params.leaveId).populate('studentId', 'name email');

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        if (leave.currentStatus !== 'OUT') {
            return res.status(400).json({ success: false, message: 'Student is not currently out' });
        }

        // Create forced entry log
        const gateLog = await GateLog.create({
            studentId: leave.studentId._id,
            leaveId: leave._id,
            gatePassId: leave.gatePassId,
            action: 'ENTRY',
            performedBy: req.user._id
        });

        // Update leave status
        leave.currentStatus = 'IN';
        await leave.save();

        // Create audit log
        await AuditLog.create({
            action: 'FORCE_RETURN',
            performedBy: req.user._id,
            targetType: 'Leave',
            targetId: leave._id,
            details: { remarks, studentName: leave.studentId.name }
        });

        res.json({
            success: true,
            message: 'Student force-marked as returned',
            data: {
                gateLog,
                leave
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/gate/logs
// @desc    Get gate logs
// @access  Private (Guard/Warden/Admin)
router.get('/logs', protect, authorize('guard', 'warden', 'admin'), async (req, res) => {
    try {
        const { action, date } = req.query;
        const filter = {};

        if (action) filter.action = action;
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            filter.timestamp = { $gte: startOfDay, $lte: endOfDay };
        }

        const logs = await GateLog.find(filter)
            .populate('studentId', 'name email hostelBlock roomNo')
            .populate('performedBy', 'name')
            .sort({ timestamp: -1 })
            .limit(100);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
