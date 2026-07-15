const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
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
        const leave = await prisma.leave.findUnique({
            where: { gatePassId },
            include: { student: true }
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Invalid Gate Pass ID' });
        }

        if (leave.status !== 'APPROVED' && leave.status !== 'AUTO_APPROVED') {
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
        const gateLog = await prisma.gateLog.create({
            data: {
                studentId: leave.studentId,
                leaveId: leave.id,
                gatePassId,
                action: 'EXIT',
                markedBy: req.user.id
            }
        });

        // Update leave status
        await prisma.leave.update({
            where: { id: leave.id },
            data: { currentStatus: 'OUT' }
        });

        // Mock parent notification
        notifyParent('EXIT', leave.student.name, `Exited hostel at ${new Date().toLocaleString()}`);

        res.json({
            success: true,
            message: 'Exit logged successfully',
            data: {
                gateLog,
                student: leave.student.name,
                leaveId: leave.id
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
        const leave = await prisma.leave.findUnique({
            where: { gatePassId },
            include: { student: true }
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Invalid Gate Pass ID' });
        }

        if (leave.currentStatus !== 'OUT') {
            return res.status(400).json({ success: false, message: 'Student has not exited or already returned' });
        }

        // Check if overstayed
        const now = new Date();
        const isOverstayed = now > leave.toDateTime;

        // Create entry log
        const gateLog = await prisma.gateLog.create({
            data: {
                studentId: leave.studentId,
                leaveId: leave.id,
                gatePassId,
                action: 'ENTRY',
                isOverstayed,
                markedBy: req.user.id
            }
        });

        // Update leave status
        await prisma.leave.update({
            where: { id: leave.id },
            data: { 
                currentStatus: 'IN',
                returnedOnTime: !isOverstayed,
                actualReturnDateTime: now,
                lateReturnHours: isOverstayed ? (now - leave.toDateTime) / (1000 * 60 * 60) : 0
            }
        });

        // Mock parent notification
        notifyParent('ENTRY', leave.student.name, `Returned to hostel at ${now.toLocaleString()}${isOverstayed ? ' (OVERSTAYED)' : ''}`);

        res.json({
            success: true,
            message: 'Entry logged successfully',
            data: {
                gateLog,
                student: leave.student.name,
                leaveId: leave.id,
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
        const outStudents = await prisma.leave.findMany({
            where: {
                status: { in: ['APPROVED', 'AUTO_APPROVED'] },
                currentStatus: 'OUT'
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        hostelBlock: true,
                        roomNo: true,
                        phone: true
                    }
                }
            },
            orderBy: { fromDateTime: 'desc' }
        });

        const now = new Date();
        const result = outStudents.map(leave => ({
            _id: leave.id,
            student: leave.student,
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
        const leaveId = parseInt(req.params.leaveId);
        const { remarks } = req.body;

        const leave = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: { student: true }
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        if (leave.currentStatus !== 'OUT') {
            return res.status(400).json({ success: false, message: 'Student is not currently out' });
        }

        // Create forced entry log
        const gateLog = await prisma.gateLog.create({
            data: {
                studentId: leave.studentId,
                leaveId: leave.id,
                gatePassId: leave.gatePassId || 'FORCE_PASS',
                action: 'ENTRY',
                remarks: remarks || 'Force returned',
                markedBy: req.user.id
            }
        });

        // Update leave status
        const now = new Date();
        const isOverstayed = now > leave.toDateTime;

        await prisma.leave.update({
            where: { id: leave.id },
            data: { 
                currentStatus: 'IN',
                returnedOnTime: !isOverstayed,
                actualReturnDateTime: now,
                lateReturnHours: isOverstayed ? (now - leave.toDateTime) / (1000 * 60 * 60) : 0
            }
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'FORCE_RETURN',
                performedBy: req.user.id,
                model: 'Leave',
                documentId: leave.id.toString(),
                details: JSON.stringify({ remarks, studentName: leave.student.name })
            }
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
        const whereClause = {};

        if (action) whereClause.action = action;
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.timestamp = { gte: startOfDay, lte: endOfDay };
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
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        // Map model fields to support legacy frontend response format
        const formattedLogs = logs.map(log => ({
            ...log,
            studentId: log.student,
            performedBy: log.marker
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
