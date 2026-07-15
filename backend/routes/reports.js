const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports/leaves
// @desc    Get leave report
// @access  Private (Warden/Admin)
router.get('/leaves', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { from, to, format } = req.query;
        const whereClause = {};

        if (from || to) {
            whereClause.createdAt = {};
            if (from) whereClause.createdAt.gte = new Date(from);
            if (to) whereClause.createdAt.lte = new Date(to);
        }

        const leaves = await prisma.leave.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
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
                `"${l.student?.name || ''}","${l.student?.email || ''}","${l.student?.hostelBlock || ''}","${l.student?.roomNo || ''}","${l.leaveType}","${l.fromDateTime}","${l.toDateTime}","${l.status}","${l.approver?.name || ''}","${l.remarks || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=leave-report.csv');
            return res.send(csvHeader + csvRows);
        }

        // Map database fields to support legacy format
        const formattedLeaves = leaves.map(l => ({
            ...l,
            studentId: l.student,
            approvedBy: l.approver
        }));

        res.json({
            success: true,
            summary,
            count: formattedLeaves.length,
            data: formattedLeaves
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
        const whereClause = {};

        if (date) {
            const attendanceDate = new Date(date);
            attendanceDate.setHours(0, 0, 0, 0);
            whereClause.date = attendanceDate;
        } else if (from || to) {
            whereClause.date = {};
            if (from) whereClause.date.gte = new Date(from);
            if (to) whereClause.date.lte = new Date(to);
        }

        const attendance = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                },
                marker: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

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
                `"${a.date.toISOString().split('T')[0]}","${a.student?.name || ''}","${a.student?.email || ''}","${a.student?.hostelBlock || ''}","${a.student?.roomNo || ''}","${a.status}","${a.marker?.name || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
            return res.send(csvHeader + csvRows);
        }

        // Map database fields to support legacy format
        const formattedAttendance = attendance.map(a => ({
            ...a,
            studentId: a.student,
            markedBy: a.marker
        }));

        res.json({
            success: true,
            summary,
            count: formattedAttendance.length,
            data: formattedAttendance
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
        const whereClause = {};

        if (action) whereClause.action = action;

        if (from || to) {
            whereClause.timestamp = {};
            if (from) whereClause.timestamp.gte = new Date(from);
            if (to) whereClause.timestamp.lte = new Date(to);
        }

        const logs = await prisma.gateLog.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                },
                marker: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

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
                `"${l.timestamp}","${l.student?.name || ''}","${l.student?.email || ''}","${l.student?.hostelBlock || ''}","${l.student?.roomNo || ''}","${l.action}","${l.gatePassId}","${l.marker?.name || ''}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=gate-logs-report.csv');
            return res.send(csvHeader + csvRows);
        }

        // Map database fields to support legacy format
        const formattedLogs = logs.map(l => ({
            ...l,
            studentId: l.student,
            performedBy: l.marker
        }));

        res.json({
            success: true,
            summary,
            count: formattedLogs.length,
            data: formattedLogs
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
        const whereClause = {};

        if (action) whereClause.action = action;

        if (from || to) {
            whereClause.timestamp = {};
            if (from) whereClause.timestamp.gte = new Date(from);
            if (to) whereClause.timestamp.lte = new Date(to);
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            include: {
                performer: {
                    select: {
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: 500
        });

        // Map database fields to support legacy format
        const formattedLogs = logs.map(l => ({
            ...l,
            performedBy: l.performer
        }));

        res.json({
            success: true,
            count: formattedLogs.length,
            data: formattedLogs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
