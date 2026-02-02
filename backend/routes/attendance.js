const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

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
        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOneAndUpdate(
            { studentId, date: attendanceDate },
            {
                studentId,
                date: attendanceDate,
                status,
                markedBy: req.user._id
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: attendance
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
        // records = [{ studentId, status }]

        if (!date || !records || !Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'date and records array are required' });
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const results = [];
        for (const record of records) {
            const attendance = await Attendance.findOneAndUpdate(
                { studentId: record.studentId, date: attendanceDate },
                {
                    studentId: record.studentId,
                    date: attendanceDate,
                    status: record.status,
                    markedBy: req.user._id
                },
                { upsert: true, new: true }
            );
            results.push(attendance);
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
        const filter = { studentId: req.user._id };

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) filter.date.$lte = new Date(to);
        }

        const attendance = await Attendance.find(filter)
            .sort({ date: -1 })
            .populate('markedBy', 'name');

        // Calculate summary
        const summary = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'PRESENT').length,
            absent: attendance.filter(a => a.status === 'ABSENT').length,
            onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length
        };

        res.json({
            success: true,
            summary,
            data: attendance
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
        const filter = {};

        if (date) {
            const attendanceDate = new Date(date);
            attendanceDate.setHours(0, 0, 0, 0);
            filter.date = attendanceDate;
        }

        if (status) filter.status = status;

        let attendance = await Attendance.find(filter)
            .sort({ date: -1 })
            .populate('studentId', 'name email hostelBlock roomNo')
            .populate('markedBy', 'name');

        // Filter by hostel block if provided
        if (hostelBlock) {
            attendance = attendance.filter(a => a.studentId && a.studentId.hostelBlock === hostelBlock);
        }

        res.json({
            success: true,
            count: attendance.length,
            data: attendance
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
        const filter = { role: 'student', isActive: true };

        if (hostelBlock) filter.hostelBlock = hostelBlock;

        const students = await User.find(filter)
            .select('name email hostelBlock roomNo')
            .sort({ hostelBlock: 1, roomNo: 1 });

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
        const students = await User.find({ role: 'student', isActive: true })
            .select('name email hostelBlock roomNo');

        // Get attendance for this date
        const attendance = await Attendance.find({ date: attendanceDate });

        // Map attendance to students
        const result = students.map(student => {
            const record = attendance.find(a => a.studentId.toString() === student._id.toString());
            return {
                student,
                status: record ? record.status : 'NOT_MARKED',
                attendanceId: record ? record._id : null
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
