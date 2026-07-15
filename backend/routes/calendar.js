const express = require('express');
const router = express.Router();
const CalendarService = require('../services/calendarService');
const { prisma } = require('../config/db');
const { protect: auth } = require('../middleware/auth');

// ===== PUBLIC/STUDENT ROUTES =====

router.get('/current-restrictions', auth, async (req, res) => {
    try {
        const restrictions = await CalendarService.getCurrentRestrictions();
        const isRestricted = await CalendarService.isTodayRestricted();

        res.json({
            success: true,
            data: {
                isRestrictedToday: isRestricted.isRestricted,
                activeRestrictions: restrictions.map(r => ({
                    id: r.id,
                    title: r.title,
                    type: r.eventType,
                    policy: r.leavePolicy,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    description: r.description
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/upcoming', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const events = await CalendarService.getUpcomingEvents(days);

        res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/upcoming-restrictions', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 14;
        const restrictions = await CalendarService.getUpcomingRestrictions(days);

        res.json({
            success: true,
            count: restrictions.length,
            data: restrictions.map(r => ({
                title: r.title,
                type: r.eventType,
                policy: r.leavePolicy,
                startDate: r.startDate,
                endDate: r.endDate,
                riskModifier: r.riskModifier,
                notifyBefore: 3 // default
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/analyze-dates', auth, async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                message: 'fromDate and toDate are required'
            });
        }

        const student = {
            hostelBlock: req.user.hostelBlock,
            course: req.user.course,
            year: req.user.year
        };

        const analysis = await CalendarService.analyzeLeaveDates(fromDate, toDate, student);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/suggest-dates', auth, async (req, res) => {
    try {
        const { daysNeeded, preferredStart, flexibilityDays } = req.body;

        if (!daysNeeded || !preferredStart) {
            return res.status(400).json({
                success: false,
                message: 'daysNeeded and preferredStart are required'
            });
        }

        const suggestions = await CalendarService.suggestLeaveDates(
            parseInt(daysNeeded),
            new Date(preferredStart),
            parseInt(flexibilityDays) || 7
        );

        res.json({
            success: true,
            count: suggestions.length,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/month/:year/:month', auth, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year or month'
            });
        }

        const summary = await CalendarService.getMonthSummary(year, month);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== ADMIN/WARDEN ROUTES =====

router.get('/all', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { academicYear, eventType, isActive } = req.query;
        const whereClause = {};

        if (academicYear) whereClause.academicYear = academicYear;
        if (eventType) whereClause.eventType = eventType;
        if (isActive !== undefined) whereClause.isActive = isActive === 'true';

        const events = await prisma.academicCalendar.findMany({
            where: whereClause,
            orderBy: { startDate: 'asc' }
        });

        res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/event', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const {
            title,
            description,
            eventType,
            startDate,
            endDate,
            leavePolicy,
            riskModifier,
            affectsHostels,
            affectsCourses,
            affectsYears,
            priority,
            academicYear,
            semester
        } = req.body;

        if (!title || !eventType || !startDate || !endDate || !academicYear) {
            return res.status(400).json({
                success: false,
                message: 'title, eventType, startDate, endDate, and academicYear are required'
            });
        }

        const event = await CalendarService.createEvent({
            title,
            description,
            eventType,
            startDate,
            endDate,
            leavePolicy,
            riskModifier,
            affectsHostels,
            affectsCourses,
            affectsYears,
            priority,
            academicYear,
            semester
        }, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Calendar event created successfully',
            data: event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/event/:id', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const eventId = parseInt(req.params.id);
        const { startDate, endDate, ...updates } = req.body;
        
        const dataUpdate = { ...updates };
        if (startDate) dataUpdate.startDate = new Date(startDate);
        if (endDate) dataUpdate.endDate = new Date(endDate);

        const event = await prisma.academicCalendar.update({
            where: { id: eventId },
            data: dataUpdate
        });

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/event/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const eventId = parseInt(req.params.id);
        await prisma.academicCalendar.delete({
            where: { id: eventId }
        });

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/seed', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const { academicYear } = req.body;
        
        if (!academicYear) {
            return res.status(400).json({
                success: false,
                message: 'academicYear is required (e.g., "2025-2026")'
            });
        }

        const events = await CalendarService.seedDefaultEvents(academicYear, req.user.id);

        res.json({
            success: true,
            message: `Seeded ${events.length} calendar events`,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch('/event/:id/toggle', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const eventId = parseInt(req.params.id);
        const event = await prisma.academicCalendar.findUnique({
            where: { id: eventId }
        });
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const updated = await prisma.academicCalendar.update({
            where: { id: eventId },
            data: { isActive: !event.isActive }
        });

        res.json({
            success: true,
            message: `Event ${updated.isActive ? 'activated' : 'deactivated'}`,
            data: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
