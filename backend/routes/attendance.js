const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, authorize } = require('../middleware/auth');
const StatsService = require('../services/statsService');

// Helper to upsert attendance
const upsertAttendance = async (studentId, date, status, markedById) => {
    const sid = parseInt(studentId);
    const mbid = parseInt(markedById);
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
        where: {
            studentId: sid,
            date: attendanceDate
        }
    });

    let record;
    if (existing) {
        record = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                status,
                markedBy: mbid
            }
        });
    } else {
        record = await prisma.attendance.create({
            data: {
                studentId: sid,
                date: attendanceDate,
                status,
                markedBy: mbid
            }
        });
    }

    // Trigger stats update in background
    StatsService.updateAttendanceStats(sid).catch(console.error);

    return record;
};

// @route   POST /api/attendance/mark
// @desc    Mark attendance for students
// @access  Private (Warden/Admin)
router.post('/mark', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { studentId, date, status } = req.body;

        if (!studentId || !date || !status) {
            return res.status(400).json({ success: false, message: 'studentId, date and status are required' });
        }

        if (!['PRESENT', 'ABSENT', 'ON_LEAVE'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // Verify student exists
        const student = await prisma.user.findFirst({
            where: { id: parseInt(studentId), role: 'student' }
        });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const record = await upsertAttendance(studentId, date, status, req.user.id);

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: record
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/attendance/mark-bulk
// @desc    Mark attendance for multiple students
// @access  Private (Warden/Admin)
router.post('/mark-bulk', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { date, records } = req.body;

        if (!date || !records || !Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'date and records array are required' });
        }

        const results = [];
        for (const record of records) {
            const result = await upsertAttendance(record.studentId, date, record.status, req.user.id);
            results.push(result);
        }

        res.json({
            success: true,
            message: `Attendance marked for ${results.length} students`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/mine
// @desc    Get student's own attendance
// @access  Private (Student)
router.get('/mine', protect, authorize('student'), async (req, res) => {
    try {
        const { from, to } = req.query;
        const whereClause = { studentId: req.user.id };

        if (from || to) {
            whereClause.date = {};
            if (from) whereClause.date.gte = new Date(from);
            if (to) whereClause.date.lte = new Date(to);
        }

        const attendance = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                marker: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Map marker to markedBy to support legacy format
        const formattedAttendance = attendance.map(a => ({
            ...a,
            markedBy: a.marker
        }));

        // Calculate summary
        const summary = {
            total: formattedAttendance.length,
            present: formattedAttendance.filter(a => a.status === 'PRESENT').length,
            absent: formattedAttendance.filter(a => a.status === 'ABSENT').length,
            onLeave: formattedAttendance.filter(a => a.status === 'ON_LEAVE').length
        };

        res.json({
            success: true,
            summary,
            data: formattedAttendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/all
// @desc    Get all attendance records
// @access  Private (Warden/Admin)
router.get('/all', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { date, status, hostelBlock } = req.query;
        const whereClause = {};

        if (date) {
            const attendanceDate = new Date(date);
            attendanceDate.setHours(0, 0, 0, 0);
            whereClause.date = attendanceDate;
        }

        if (status) whereClause.status = status;

        let attendance = await prisma.attendance.findMany({
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

        // Map database fields to legacy formats
        let formatted = attendance.map(a => ({
            ...a,
            studentId: a.student,
            markedBy: a.marker
        }));

        // Filter by hostel block if provided
        if (hostelBlock) {
            formatted = formatted.filter(a => a.studentId && a.studentId.hostelBlock === hostelBlock);
        }

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/students
// @desc    Get all students for attendance marking
// @access  Private (Warden/Admin)
router.get('/students', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const { hostelBlock } = req.query;
        const whereClause = { role: 'student', isActive: true };

        if (hostelBlock) whereClause.hostelBlock = hostelBlock;

        const students = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                hostelBlock: true,
                roomNo: true
            },
            orderBy: [
                { hostelBlock: 'asc' },
                { roomNo: 'asc' }
            ]
        });

        res.json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/attendance/date/:date
// @desc    Get attendance for specific date with all students
// @access  Private (Warden/Admin)
router.get('/date/:date', protect, authorize('warden', 'admin'), async (req, res) => {
    try {
        const attendanceDate = new Date(req.params.date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Get all students
        const students = await prisma.user.findMany({
            where: { role: 'student', isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                hostelBlock: true,
                roomNo: true
            }
        });

        // Get attendance for this date
        const attendance = await prisma.attendance.findMany({
            where: { date: attendanceDate }
        });

        // Map attendance to students
        const result = students.map(student => {
            const record = attendance.find(a => a.studentId === student.id);
            return {
                student,
                status: record ? record.status : 'NOT_MARKED',
                attendanceId: record ? record.id : null
            };
        });

        res.json({
            success: true,
            date: attendanceDate,
            count: result.length,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
