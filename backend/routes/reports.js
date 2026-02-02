const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const GateLog = require('../models/GateLog');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports/leaves
// @desc    Get leave report
// @access  Private (Warden/Admin)
router.get('/leaves', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { from, to, format } = req.query;
        const filter = {};

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        const leaves = await Leave.find(filter)
            .populate('studentId', 'name email hostelBlock roomNo')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        // Generate summary
        const summary = {
            total: leaves.length,
            pending: leaves.filter(l => l.status === 'PENDING').length,
            approved: leaves.filter(l => l.status === 'APPROVED').length,
            rejected: leaves.filter(l => l.status === 'REJECTED').length,
            byType: {
                regular: leaves.filter(l => l.leaveType === 'REGULAR').length,
                emergency: leaves.filter(l => l.leaveType === 'EMERGENCY').length,
                medical: leaves.filter(l => l.leaveType === 'MEDICAL').length,
                other: leaves.filter(l => l.leaveType === 'OTHER').length
            }
        };

        // Return CSV if requested
        if (format === 'csv') {
            const csvHeader = 'Student Name,Email,Hostel Block,Room,Leave Type,From,To,Status,Approved By,Remarks\n';
            const csvRows = leaves.map(l => 
                `"${l.studentId?.name || ''}","${l.studentId?.email || ''}","${l.studentId?.hostelBlock || ''}","${l.studentId?.roomNo || ''}","${l.leaveType}","${l.fromDateTime}","${l.toDateTime}","${l.status}","${l.approvedBy?.name || ''}","${l.remarks || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=leave-report.csv');
            return res.send(csvHeader + csvRows);
        }

        res.json({
            success: true,
            summary,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/attendance
// @desc    Get attendance report
// @access  Private (Warden/Admin)
router.get('/attendance', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { date, from, to, format } = req.query;
        const filter = {};

        if (date) {
            const attendanceDate = new Date(date);
            attendanceDate.setHours(0, 0, 0, 0);
            filter.date = attendanceDate;
        } else if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) filter.date.$lte = new Date(to);
        }

        const attendance = await Attendance.find(filter)
            .populate('studentId', 'name email hostelBlock roomNo')
            .populate('markedBy', 'name')
            .sort({ date: -1 });

        // Generate summary
        const summary = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'PRESENT').length,
            absent: attendance.filter(a => a.status === 'ABSENT').length,
            onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length
        };

        // Return CSV if requested
        if (format === 'csv') {
            const csvHeader = 'Date,Student Name,Email,Hostel Block,Room,Status,Marked By\n';
            const csvRows = attendance.map(a => 
                `"${a.date.toISOString().split('T')[0]}","${a.studentId?.name || ''}","${a.studentId?.email || ''}","${a.studentId?.hostelBlock || ''}","${a.studentId?.roomNo || ''}","${a.status}","${a.markedBy?.name || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
            return res.send(csvHeader + csvRows);
        }

        res.json({
            success: true,
            summary,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/gate-logs
// @desc    Get gate logs report
// @access  Private (Warden/Admin)
router.get('/gate-logs', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { from, to, action, format } = req.query;
        const filter = {};

        if (action) filter.action = action;

        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from);
            if (to) filter.timestamp.$lte = new Date(to);
        }

        const logs = await GateLog.find(filter)
            .populate('studentId', 'name email hostelBlock roomNo')
            .populate('performedBy', 'name')
            .sort({ timestamp: -1 });

        // Generate summary
        const summary = {
            total: logs.length,
            exits: logs.filter(l => l.action === 'EXIT').length,
            entries: logs.filter(l => l.action === 'ENTRY').length
        };

        // Return CSV if requested
        if (format === 'csv') {
            const csvHeader = 'Timestamp,Student Name,Email,Hostel Block,Room,Action,Gate Pass ID,Guard\n';
            const csvRows = logs.map(l => 
                `"${l.timestamp}","${l.studentId?.name || ''}","${l.studentId?.email || ''}","${l.studentId?.hostelBlock || ''}","${l.studentId?.roomNo || ''}","${l.action}","${l.gatePassId}","${l.performedBy?.name || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=gate-logs-report.csv');
            return res.send(csvHeader + csvRows);
        }

        res.json({
            success: true,
            summary,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/reports/audit-logs
// @desc    Get audit logs
// @access  Private (Admin)
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
    try {
        const { from, to, action } = req.query;
        const filter = {};

        if (action) filter.action = action;

        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from);
            if (to) filter.timestamp.$lte = new Date(to);
        }

        const logs = await AuditLog.find(filter)
            .populate('performedBy', 'name email role')
            .sort({ timestamp: -1 })
            .limit(500);

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
