const { prisma } = require('../config/db');

class CalendarService {
    // ===== LEAVE DATE ANALYSIS =====
    static async analyzeLeaveDates(fromDate, toDate, student = {}) {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        // Get all events that overlap with the leave period
        const overlappingEvents = await prisma.academicCalendar.findMany({
            where: {
                isActive: true,
                startDate: { lte: to },
                endDate: { gte: from }
            },
            orderBy: [
                { priority: 'desc' },
                { startDate: 'asc' }
            ]
        });

        // Filter events that apply to this student
        const relevantEvents = overlappingEvents.filter(event => {
            if (event.affectsHostels.length > 0 && student.hostelBlock) {
                if (!event.affectsHostels.includes(student.hostelBlock)) return false;
            }
            if (event.affectsCourses.length > 0 && student.course) {
                if (!event.affectsCourses.includes(student.course)) return false;
            }
            if (event.affectsYears.length > 0 && student.year) {
                if (!event.affectsYears.includes(parseInt(student.year))) return false;
            }
            return true;
        });

        const analysis = {
            canApply: true,
            riskModifier: 0,
            warnings: [],
            blockedDates: [],
            flaggedDates: [],
            recommendation: 'APPROVE',
            overlappingEvents: [],
            calendarScore: 0
        };

        for (const event of relevantEvents) {
            analysis.overlappingEvents.push({
                title: event.title,
                type: event.eventType,
                policy: event.leavePolicy,
                dates: `${event.startDate.toDateString()} - ${event.endDate.toDateString()}`
            });

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
                    break;
            }

            analysis.riskModifier += event.riskModifier;
        }

        analysis.riskModifier = Math.max(-50, Math.min(50, analysis.riskModifier));

        if (analysis.canApply && analysis.calendarScore <= 20) {
            analysis.recommendation = 'AUTO_APPROVE';
        } else if (analysis.calendarScore > 50 && analysis.canApply) {
            analysis.recommendation = 'FLAG';
        }

        return analysis;
    }

    static async getCalendarScore(fromDate, toDate, student = {}) {
        const analysis = await this.analyzeLeaveDates(fromDate, toDate, student);
        return analysis.calendarScore;
    }

    // ===== CURRENT RESTRICTIONS =====
    static async getCurrentRestrictions() {
        const now = new Date();
        return await prisma.academicCalendar.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
                leavePolicy: { in: ['BLOCKED', 'FLAGGED', 'DISCOURAGED'] }
            },
            orderBy: { priority: 'desc' }
        });
    }

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
    static async getUpcomingEvents(days = 30) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return await prisma.academicCalendar.findMany({
            where: {
                isActive: true,
                startDate: { gte: now, lte: future }
            },
            orderBy: { startDate: 'asc' }
        });
    }

    static async getUpcomingRestrictions(days = 14) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return await prisma.academicCalendar.findMany({
            where: {
                isActive: true,
                startDate: { lte: future },
                endDate: { gte: now },
                leavePolicy: { in: ['BLOCKED', 'FLAGGED', 'DISCOURAGED'] }
            },
            orderBy: { startDate: 'asc' }
        });
    }

    // ===== LEAVE RECOMMENDATION =====
    static async suggestLeaveDates(daysNeeded, preferredStart, flexibilityDays = 7) {
        const suggestions = [];
        const start = new Date(preferredStart);

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

        suggestions.sort((a, b) => a.calendarScore - b.calendarScore);
        return suggestions.filter(s => s.canApply).slice(0, 3);
    }

    // ===== CALENDAR MANAGEMENT =====
    static async createEvent(eventData, createdBy) {
        const { startDate, endDate, ...rest } = eventData;
        return await prisma.academicCalendar.create({
            data: {
                ...rest,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                // createdBy field is not modeled on calendar schema since it was omitted or references user
            }
        });
    }

    static async seedDefaultEvents(academicYear, createdBy) {
        const defaultEvents = [
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
            {
                title: 'Exam Preparation Week',
                eventType: 'EXAM_PREP', // wait, let's keep it matching eventType options
                startDate: new Date('2026-02-22'),
                endDate: new Date('2026-02-28'),
                leavePolicy: 'FLAGGED',
                riskModifier: 30,
                priority: 8,
                academicYear,
                semester: 'EVEN'
            },
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
            const existing = await prisma.academicCalendar.findFirst({
                where: {
                    title: event.title,
                    academicYear: event.academicYear
                }
            });
            
            if (!existing) {
                const created = await this.createEvent(event, createdBy);
                results.push(created);
            }
        }

        return results;
    }

    static async getMonthSummary(year, month) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const events = await prisma.academicCalendar.findMany({
            where: {
                isActive: true,
                startDate: { lte: endOfMonth },
                endDate: { gte: startOfMonth }
            },
            orderBy: [
                { priority: 'desc' },
                { startDate: 'asc' }
            ]
        });

        const blockedDays = [];
        const flaggedDays = [];
        const holidays = [];

        for (const event of events) {
            const days = this.getDaysInRange(
                new Date(Math.max(event.startDate.getTime(), startOfMonth.getTime())),
                new Date(Math.min(event.endDate.getTime(), endOfMonth.getTime()))
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
