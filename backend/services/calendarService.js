const AcademicCalendar = require('../models/AcademicCalendar');

/**
 * CalendarService - Handles academic calendar operations for ML-based leave approval
 * 
 * This service:
 * - Checks if leave dates overlap with restricted periods
 * - Calculates calendar-based risk modifiers
 * - Provides recommendations for leave timing
 */
class CalendarService {

    // ===== LEAVE DATE ANALYSIS =====

    /**
     * Analyze leave dates against academic calendar
     * @param {Date} fromDate - Leave start date
     * @param {Date} toDate - Leave end date
     * @param {Object} student - Student info (hostelBlock, course, year)
     * @returns {Object} Analysis result
     */
    static async analyzeLeaveDates(fromDate, toDate, student = {}) {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        // Get all events that overlap with the leave period
        const overlappingEvents = await AcademicCalendar.getEventsInRange(from, to);

        // Filter events that apply to this student
        const relevantEvents = overlappingEvents.filter(event => {
            // Check hostel filter
            if (event.affectsHostels.length > 0 && student.hostelBlock) {
                if (!event.affectsHostels.includes(student.hostelBlock)) return false;
            }
            // Check course filter
            if (event.affectsCourses.length > 0 && student.course) {
                if (!event.affectsCourses.includes(student.course)) return false;
            }
            // Check year filter
            if (event.affectsYears.length > 0 && student.year) {
                if (!event.affectsYears.includes(student.year)) return false;
            }
            return true;
        });

        // Analyze the events
        const analysis = {
            canApply: true,
            riskModifier: 0,
            warnings: [],
            blockedDates: [],
            flaggedDates: [],
            recommendation: 'APPROVE',
            overlappingEvents: [],
            calendarScore: 0  // 0-100, higher = more risky
        };

        for (const event of relevantEvents) {
            analysis.overlappingEvents.push({
                title: event.title,
                type: event.eventType,
                policy: event.leavePolicy,
                dates: `${event.startDate.toDateString()} - ${event.endDate.toDateString()}`
            });

            // Handle different policies
            switch (event.leavePolicy) {
                case 'BLOCKED':
                    analysis.canApply = false;
                    analysis.recommendation = 'REJECT';
                    analysis.blockedDates.push({
                        event: event.title,
                        from: event.startDate,
                        to: event.endDate
                    });
                    analysis.warnings.push(`❌ Leave blocked during "${event.title}"`);
                    analysis.calendarScore = 100;
                    break;

                case 'FLAGGED':
                    analysis.recommendation = 'FLAG';
                    analysis.flaggedDates.push({
                        event: event.title,
                        from: event.startDate,
                        to: event.endDate
                    });
                    analysis.warnings.push(`⚠️ Leave during "${event.title}" requires manual approval`);
                    analysis.calendarScore = Math.max(analysis.calendarScore, 70);
                    break;

                case 'DISCOURAGED':
                    analysis.warnings.push(`⚡ Leave during "${event.title}" is discouraged`);
                    analysis.calendarScore = Math.max(analysis.calendarScore, 40);
                    break;

                case 'ENCOURAGED':
                    analysis.calendarScore = Math.min(analysis.calendarScore, 10);
                    break;

                default:
                    // NORMAL - no change
                    break;
            }

            // Add risk modifier from event
            analysis.riskModifier += event.riskModifier;
        }

        // Cap risk modifier
        analysis.riskModifier = Math.max(-50, Math.min(50, analysis.riskModifier));

        // Update recommendation based on overall analysis
        if (analysis.canApply && analysis.calendarScore <= 20) {
            analysis.recommendation = 'AUTO_APPROVE';
        } else if (analysis.calendarScore > 50 && analysis.canApply) {
            analysis.recommendation = 'FLAG';
        }

        return analysis;
    }

    /**
     * Get calendar score for a leave request
     * @param {Date} fromDate 
     * @param {Date} toDate 
     * @param {Object} student 
     * @returns {Number} Score 0-100 (higher = more risky)
     */
    static async getCalendarScore(fromDate, toDate, student = {}) {
        const analysis = await this.analyzeLeaveDates(fromDate, toDate, student);
        return analysis.calendarScore;
    }

    // ===== CURRENT RESTRICTIONS =====

    /**
     * Get all current active restrictions
     * @returns {Array} Current restrictions
     */
    static async getCurrentRestrictions() {
        return await AcademicCalendar.getCurrentRestrictions();
    }

    /**
     * Check if today is a restricted day
     * @returns {Object} { isRestricted, events }
     */
    static async isTodayRestricted() {
        const restrictions = await this.getCurrentRestrictions();
        return {
            isRestricted: restrictions.length > 0,
            events: restrictions.map(r => ({
                title: r.title,
                type: r.eventType,
                policy: r.leavePolicy,
                endsOn: r.endDate
            }))
        };
    }

    // ===== UPCOMING EVENTS =====

    /**
     * Get upcoming events in the next N days
     * @param {Number} days - Number of days to look ahead
     * @returns {Array} Upcoming events
     */
    static async getUpcomingEvents(days = 30) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return await AcademicCalendar.find({
            isActive: true,
            startDate: { $gte: now, $lte: future }
        }).sort({ startDate: 1 });
    }

    /**
     * Get upcoming restrictions that students should know about
     * @param {Number} days 
     * @returns {Array}
     */
    static async getUpcomingRestrictions(days = 14) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return await AcademicCalendar.find({
            isActive: true,
            startDate: { $lte: future },
            endDate: { $gte: now },
            leavePolicy: { $in: ['BLOCKED', 'FLAGGED', 'DISCOURAGED'] }
        }).sort({ startDate: 1 });
    }

    // ===== LEAVE RECOMMENDATION =====

    /**
     * Get best dates for leave based on calendar
     * @param {Number} daysNeeded - Days of leave needed
     * @param {Date} preferredStart - Preferred start date
     * @param {Number} flexibilityDays - How many days flexibility
     * @returns {Array} Recommended date ranges
     */
    static async suggestLeaveDates(daysNeeded, preferredStart, flexibilityDays = 7) {
        const suggestions = [];
        const start = new Date(preferredStart);

        // Check different start dates within flexibility range
        for (let i = -flexibilityDays; i <= flexibilityDays; i++) {
            const testStart = new Date(start);
            testStart.setDate(testStart.getDate() + i);
            
            const testEnd = new Date(testStart);
            testEnd.setDate(testEnd.getDate() + daysNeeded - 1);

            const analysis = await this.analyzeLeaveDates(testStart, testEnd);

            suggestions.push({
                startDate: testStart,
                endDate: testEnd,
                calendarScore: analysis.calendarScore,
                canApply: analysis.canApply,
                recommendation: analysis.recommendation,
                warnings: analysis.warnings
            });
        }

        // Sort by calendar score (lower = better)
        suggestions.sort((a, b) => a.calendarScore - b.calendarScore);

        // Return top 3 suggestions that are allowed
        return suggestions.filter(s => s.canApply).slice(0, 3);
    }

    // ===== CALENDAR MANAGEMENT =====

    /**
     * Create a new calendar event
     * @param {Object} eventData 
     * @param {ObjectId} createdBy 
     * @returns {AcademicCalendar}
     */
    static async createEvent(eventData, createdBy) {
        return await AcademicCalendar.create({
            ...eventData,
            createdBy
        });
    }

    /**
     * Seed default academic calendar events
     * @param {String} academicYear - e.g., '2025-2026'
     * @param {ObjectId} createdBy 
     */
    static async seedDefaultEvents(academicYear, createdBy) {
        const defaultEvents = [
            // Mid-semester exams
            {
                title: 'Mid-Semester Examinations',
                eventType: 'EXAM',
                startDate: new Date('2026-03-01'),
                endDate: new Date('2026-03-15'),
                leavePolicy: 'BLOCKED',
                riskModifier: 50,
                priority: 10,
                academicYear,
                semester: 'EVEN'
            },
            // End-semester exams
            {
                title: 'End-Semester Examinations',
                eventType: 'EXAM',
                startDate: new Date('2026-05-01'),
                endDate: new Date('2026-05-20'),
                leavePolicy: 'BLOCKED',
                riskModifier: 50,
                priority: 10,
                academicYear,
                semester: 'EVEN'
            },
            // Exam prep period
            {
                title: 'Exam Preparation Week',
                eventType: 'EXAM_PREP',
                startDate: new Date('2026-02-22'),
                endDate: new Date('2026-02-28'),
                leavePolicy: 'FLAGGED',
                riskModifier: 30,
                priority: 8,
                academicYear,
                semester: 'EVEN'
            },
            // Holi Festival
            {
                title: 'Holi Festival',
                eventType: 'FESTIVAL',
                startDate: new Date('2026-03-17'),
                endDate: new Date('2026-03-18'),
                leavePolicy: 'ENCOURAGED',
                riskModifier: -20,
                priority: 5,
                academicYear,
                semester: 'EVEN'
            },
            // Summer vacation
            {
                title: 'Summer Vacation',
                eventType: 'VACATION',
                startDate: new Date('2026-05-25'),
                endDate: new Date('2026-07-15'),
                leavePolicy: 'ENCOURAGED',
                riskModifier: -30,
                priority: 5,
                academicYear,
                semester: 'BOTH'
            },
            // Orientation week
            {
                title: 'New Semester Orientation',
                eventType: 'ORIENTATION',
                startDate: new Date('2026-07-20'),
                endDate: new Date('2026-07-25'),
                leavePolicy: 'BLOCKED',
                riskModifier: 40,
                priority: 9,
                academicYear,
                semester: 'ODD'
            }
        ];

        const results = [];
        for (const event of defaultEvents) {
            const existing = await AcademicCalendar.findOne({
                title: event.title,
                academicYear: event.academicYear
            });
            
            if (!existing) {
                const created = await this.createEvent(event, createdBy);
                results.push(created);
            }
        }

        return results;
    }

    /**
     * Get calendar summary for a month
     * @param {Number} year 
     * @param {Number} month - 1-12
     * @returns {Object}
     */
    static async getMonthSummary(year, month) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const events = await AcademicCalendar.getEventsInRange(startOfMonth, endOfMonth);

        const blockedDays = [];
        const flaggedDays = [];
        const holidays = [];

        for (const event of events) {
            const days = this.getDaysInRange(
                Math.max(event.startDate, startOfMonth),
                Math.min(event.endDate, endOfMonth)
            );

            if (event.leavePolicy === 'BLOCKED') {
                blockedDays.push(...days);
            } else if (event.leavePolicy === 'FLAGGED') {
                flaggedDays.push(...days);
            } else if (event.eventType === 'HOLIDAY' || event.eventType === 'FESTIVAL') {
                holidays.push(...days);
            }
        }

        return {
            year,
            month,
            events,
            blockedDays: [...new Set(blockedDays)],
            flaggedDays: [...new Set(flaggedDays)],
            holidays: [...new Set(holidays)],
            totalBlockedDays: new Set(blockedDays).size,
            totalFlaggedDays: new Set(flaggedDays).size,
            totalHolidays: new Set(holidays).size
        };
    }

    /**
     * Helper: Get array of day numbers in a date range
     */
    static getDaysInRange(start, end) {
        const days = [];
        const current = new Date(start);
        while (current <= end) {
            days.push(current.getDate());
            current.setDate(current.getDate() + 1);
        }
        return days;
    }
}

module.exports = CalendarService;
