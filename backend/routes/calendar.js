const express = require('express');
const router = express.Router();
const CalendarService = require('../services/calendarService');
const AcademicCalendar = require('../models/AcademicCalendar');
const { protect: auth } = require('../middleware/auth');

/**
 * Calendar API Routes
 * Manages academic calendar for ML-based leave approval
 */

// ===== PUBLIC/STUDENT ROUTES =====

/**
 * GET /api/calendar/current-restrictions
 * Get current active restrictions
 */
router.get('/current-restrictions', auth, async (req, res) => {
    try {
        const restrictions = await CalendarService.getCurrentRestrictions();
        const isRestricted = await CalendarService.isTodayRestricted();

        res.json({
            success: true,
            data: {
                isRestrictedToday: isRestricted.isRestricted,
                activeRestrictions: restrictions.map(r => ({
                    id: r._id,
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

/**
 * GET /api/calendar/upcoming
 * Get upcoming events
 */
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

/**
 * GET /api/calendar/upcoming-restrictions
 * Get upcoming restrictions students should know about
 */
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
                notifyBefore: r.notifyBefore
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/calendar/analyze-dates
 * Analyze leave dates against calendar
 */
router.post('/analyze-dates', auth, async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                message: 'fromDate and toDate are required'
            });
        }

        // Get student info from the authenticated user
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

/**
 * POST /api/calendar/suggest-dates
 * Get suggested leave dates based on calendar
 */
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

/**
 * GET /api/calendar/month/:year/:month
 * Get calendar summary for a specific month
 */
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

/**
 * GET /api/calendar/all
 * Get all calendar events
 */
router.get('/all', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { academicYear, eventType, isActive } = req.query;
        const filter = {};

        if (academicYear) filter.academicYear = academicYear;
        if (eventType) filter.eventType = eventType;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const events = await AcademicCalendar.find(filter)
            .sort({ startDate: 1 })
            .populate('createdBy', 'name email');

        res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/calendar/event
 * Create a new calendar event
 */
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

        // Validation
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
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            leavePolicy: leavePolicy || 'NORMAL',
            riskModifier: riskModifier || 0,
            affectsHostels: affectsHostels || [],
            affectsCourses: affectsCourses || [],
            affectsYears: affectsYears || [],
            priority: priority || 1,
            academicYear,
            semester: semester || 'BOTH'
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

/**
 * PUT /api/calendar/event/:id
 * Update a calendar event
 */
router.put('/event/:id', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const event = await AcademicCalendar.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/calendar/event/:id
 * Delete a calendar event
 */
router.delete('/event/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const event = await AcademicCalendar.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/calendar/seed
 * Seed default academic calendar events (admin only)
 */
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

/**
 * PATCH /api/calendar/event/:id/toggle
 * Toggle event active status
 */
router.patch('/event/:id/toggle', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const event = await AcademicCalendar.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        event.isActive = !event.isActive;
        await event.save();

        res.json({
            success: true,
            message: `Event ${event.isActive ? 'activated' : 'deactivated'}`,
            data: event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
