const { prisma } = require('../config/db');

/**
 * StatsService - Handles all student statistics calculations for ML predictions
 * 
 * Risk Score Weights:
 * - Attendance: 30%
 * - Return Reliability: 25%
 * - Curfew Violations: 20%
 * - Leave Frequency: 15%
 * - Late Returns: 10%
 */
class StatsService {

    // ===== INITIALIZATION =====
    static async initializeStats(studentId) {
        const existing = await prisma.studentStats.findUnique({
            where: { studentId: parseInt(studentId) }
        });
        if (!existing) {
            return await prisma.studentStats.create({
                data: { studentId: parseInt(studentId) }
            });
        }
        return existing;
    }

    // ===== ATTENDANCE STATS =====
    static async updateAttendanceStats(studentId) {
        const sid = parseInt(studentId);
        await this.initializeStats(sid);

        const attendance = await prisma.attendance.findMany({
            where: { studentId: sid }
        });

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
        const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
        const lateDays = attendance.filter(a => a.status === 'LATE').length;
        const curfewViolations = attendance.filter(a => a.curfewViolation).length;
        const totalCurfewViolationMinutes = attendance.reduce((sum, a) => sum + (a.violationMinutes || 0), 0);

        const attendancePercentage = totalDays > 0
            ? Math.round((presentDays / totalDays) * 100)
            : 100;

        await prisma.studentStats.update({
            where: { studentId: sid },
            data: {
                totalDays,
                presentDays,
                absentDays,
                lateDays,
                curfewViolations,
                totalCurfewViolationMinutes,
                attendancePercentage,
                lastUpdated: new Date()
            }
        });

        return await this.calculateOverallRisk(sid);
    }

    // ===== LEAVE STATS =====
    static async updateLeaveStats(studentId) {
        const sid = parseInt(studentId);
        await this.initializeStats(sid);

        const leaves = await prisma.leave.findMany({
            where: { studentId: sid }
        });

        const totalLeavesApplied = leaves.length;
        const totalLeavesApproved = leaves.filter(l =>
            ['APPROVED', 'AUTO_APPROVED'].includes(l.status)
        ).length;
        const totalLeavesRejected = leaves.filter(l => l.status === 'REJECTED').length;
        const totalLeavesAutoApproved = leaves.filter(l => l.status === 'AUTO_APPROVED').length;
        const totalLeavesFlagged = leaves.filter(l => l.status === 'FLAGGED').length;

        const approvedLeaves = leaves.filter(l =>
            ['APPROVED', 'AUTO_APPROVED'].includes(l.status)
        );
        const totalLeaveDaysTaken = approvedLeaves.reduce((sum, leave) => {
            const days = Math.ceil((new Date(leave.toDateTime) - new Date(leave.fromDateTime)) / (1000 * 60 * 60 * 24)) + 1;
            return sum + Math.max(1, days);
        }, 0);

        const completedLeaves = leaves.filter(l => l.returnedOnTime !== null);
        const onTimeReturns = completedLeaves.filter(l => l.returnedOnTime).length;
        const lateReturns = completedLeaves.filter(l => !l.returnedOnTime).length;
        const totalLateReturnHours = leaves.reduce((sum, l) => sum + (l.lateReturnHours || 0), 0);
        const returnReliabilityScore = completedLeaves.length > 0
            ? Math.round((onTimeReturns / completedLeaves.length) * 100)
            : 100;

        const avgLeaveDuration = approvedLeaves.length > 0
            ? Math.round((totalLeaveDaysTaken / approvedLeaves.length) * 10) / 10
            : 0;

        let avgLeaveFrequency = 0;
        if (leaves.length >= 2) {
            const sortedLeaves = leaves.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            let totalGaps = 0;
            for (let i = 1; i < sortedLeaves.length; i++) {
                const gap = (new Date(sortedLeaves[i].createdAt) - new Date(sortedLeaves[i - 1].createdAt)) / (1000 * 60 * 60 * 24);
                totalGaps += gap;
            }
            avgLeaveFrequency = Math.round(totalGaps / (sortedLeaves.length - 1));
        }

        const leaveTypeCounts = {};
        leaves.forEach(l => {
            leaveTypeCounts[l.leaveType] = (leaveTypeCounts[l.leaveType] || 0) + 1;
        });
        const frequentLeaveType = Object.keys(leaveTypeCounts).length > 0
            ? Object.keys(leaveTypeCounts).reduce((a, b) =>
                leaveTypeCounts[a] > leaveTypeCounts[b] ? a : b
            )
            : null;

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);

        const leavesThisMonth = leaves.filter(l => new Date(l.createdAt) >= thisMonthStart).length;
        const leavesThisSemester = leaves.filter(l => new Date(l.createdAt) >= semesterStart).length;

        await prisma.studentStats.update({
            where: { studentId: sid },
            data: {
                totalLeavesApplied,
                totalLeavesApproved,
                totalLeavesRejected,
                totalLeavesAutoApproved,
                totalLeavesFlagged,
                totalLeaveDaysTaken,
                onTimeReturns,
                lateReturns,
                totalLateReturnHours,
                returnReliabilityScore,
                avgLeaveDuration,
                avgLeaveFrequency,
                frequentLeaveType,
                leavesThisMonth,
                leavesThisSemester,
                lastUpdated: new Date()
            }
        });

        return await this.calculateOverallRisk(sid);
    }

    // ===== OVERALL RISK SCORE CALCULATION =====
    static async calculateOverallRisk(studentId) {
        const sid = parseInt(studentId);
        const stats = await prisma.studentStats.findUnique({
            where: { studentId: sid }
        });
        if (!stats) return { riskScore: 0, riskCategory: 'LOW' };

        // 1. Attendance Score (0-100, higher = worse attendance)
        const attendanceScore = Math.max(0, 100 - stats.attendancePercentage);

        // 2. Return Reliability Score (0-100, higher = worse reliability)
        const historyScore = Math.max(0, 100 - stats.returnReliabilityScore);

        // 3. Curfew Score (curfew violations)
        const curfewScore = Math.min(100, stats.curfewViolations * 20);

        // 4. Leave Frequency Score (leaves this month)
        const frequencyScore = Math.min(100, stats.leavesThisMonth * 25);

        // 5. Late Return Severity Score (late hours)
        const lateReturnScore = Math.min(100, stats.totalLateReturnHours * 10);

        // Combined Risk Score
        const overallRiskScore = Math.round(
            attendanceScore * 0.30 +
            historyScore * 0.25 +
            curfewScore * 0.20 +
            frequencyScore * 0.15 +
            lateReturnScore * 0.10
        );

        let riskCategory = 'LOW';
        if (overallRiskScore >= 60) riskCategory = 'HIGH';
        else if (overallRiskScore >= 30) riskCategory = 'MEDIUM';

        await prisma.studentStats.update({
            where: { studentId: sid },
            data: {
                overallRiskScore,
                riskCategory,
                lastUpdated: new Date()
            }
        });

        return { riskScore: overallRiskScore, riskCategory };
    }

    // ===== ACCESSORS =====
    static async getStats(studentId) {
        return await prisma.studentStats.findUnique({
            where: { studentId: parseInt(studentId) }
        });
    }

    static async refreshAllStats(studentId) {
        const sid = parseInt(studentId);
        await this.updateAttendanceStats(sid);
        return await this.updateLeaveStats(sid);
    }

    static async getHighRiskStudents() {
        return await prisma.studentStats.findMany({
            where: { riskCategory: 'HIGH' },
            include: { student: true }
        });
    }

    static async getRiskDistribution() {
        const stats = await prisma.studentStats.findMany();
        const dist = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        stats.forEach(s => {
            dist[s.riskCategory] = (dist[s.riskCategory] || 0) + 1;
        });
        return dist;
    }

    static async updateAllStudentStats() {
        const leaves = await prisma.leave.findMany({
            distinct: ['studentId'],
            select: { studentId: true }
        });
        const studentIds = leaves.map(l => l.studentId);

        const results = {
            processed: 0,
            errors: []
        };

        for (const studentId of studentIds) {
            try {
                await this.refreshAllStats(studentId);
                results.processed++;
            } catch (error) {
                results.errors.push({ studentId, error: error.message });
            }
        }

        return results;
    }

    // ===== LEAVE REQUEST RISK CALCULATION =====
    static async calculateLeaveRequestRisk(studentId, fromDate, toDate, student = {}) {
        const CalendarService = require('./calendarService');
        const sid = parseInt(studentId);
        
        let stats = await this.getStats(sid);
        if (!stats) {
            stats = await this.initializeStats(sid);
            await this.refreshAllStats(sid);
            stats = await this.getStats(sid);
        }

        const calendarAnalysis = await CalendarService.analyzeLeaveDates(fromDate, toDate, student);
        const baseRiskScore = stats?.overallRiskScore || 0;
        const calendarScore = calendarAnalysis.calendarScore;

        let combinedRiskScore = Math.round(
            baseRiskScore * 0.60 + 
            calendarScore * 0.40 +
            calendarAnalysis.riskModifier
        );

        combinedRiskScore = Math.max(0, Math.min(100, combinedRiskScore));

        let riskCategory = 'LOW';
        if (combinedRiskScore >= 60) riskCategory = 'HIGH';
        else if (combinedRiskScore >= 30) riskCategory = 'MEDIUM';

        let aiDecision = 'MANUAL';
        let aiDecisionReason = '';

        if (!calendarAnalysis.canApply) {
            aiDecision = 'FLAGGED';
            aiDecisionReason = 'Leave blocked during ' + calendarAnalysis.overlappingEvents.map(e => e.title).join(', ');
        } else if (combinedRiskScore <= 20 && calendarAnalysis.recommendation === 'AUTO_APPROVE') {
            aiDecision = 'AUTO_APPROVED';
            aiDecisionReason = 'Low risk student with no calendar conflicts';
        } else if (combinedRiskScore >= 60 || calendarAnalysis.recommendation === 'FLAG') {
            aiDecision = 'FLAGGED';
            aiDecisionReason = 'High risk profile or calendar conflict requires review';
        }

        return {
            riskScore: combinedRiskScore,
            riskCategory,
            predictionFactors: {
                attendanceScore: 100 - (stats?.attendancePercentage || 100),
                historyScore: 100 - (stats?.returnReliabilityScore || 100),
                calendarScore: calendarScore,
                patternScore: stats?.overallRiskScore || 0
            },
            aiDecision,
            aiDecisionReason,
            calendarAnalysis,
            studentProfile: {
                attendancePercentage: stats?.attendancePercentage || 100,
                returnReliabilityScore: stats?.returnReliabilityScore || 100,
                leavesThisMonth: stats?.leavesThisMonth || 0,
                curfewViolations: stats?.curfewViolations || 0,
                lateReturns: stats?.lateReturns || 0,
                overallRiskCategory: stats?.riskCategory || 'LOW'
            },
            recommendation: calendarAnalysis.canApply 
                ? (aiDecision === 'AUTO_APPROVED' ? 'APPROVE' : aiDecision === 'FLAGGED' ? 'REVIEW' : 'APPROVE')
                : 'REJECT'
        };
    }

    // ===== SQL ANALYTICS PORT =====
    static async getRiskDistributionAggregated() {
        try {
            const distribution = await prisma.$queryRaw`
                SELECT 
                    "riskCategory" AS "riskCategory",
                    COUNT(*)::int AS "studentCount",
                    ROUND(AVG("overallRiskScore")::numeric, 2)::float AS "averageRiskScore",
                    MIN("overallRiskScore")::float AS "minRiskScore",
                    MAX("overallRiskScore")::float AS "maxRiskScore"
                FROM student_stats
                GROUP BY "riskCategory"
                ORDER BY "riskCategory" DESC
            `;
            return distribution;
        } catch (error) {
            console.error('Error in getRiskDistributionAggregated:', error);
            throw error;
        }
    }

    static async getLeaveStatisticsAggregated() {
        try {
            const statistics = await prisma.$queryRaw`
                SELECT 
                    "leaveType" AS "leaveType",
                    "status" AS "status",
                    COUNT(*)::int AS "totalRequests",
                    ROUND(AVG(EXTRACT(EPOCH FROM ("toDateTime" - "fromDateTime")) / 86400)::numeric, 1)::float AS "averageDurationDays",
                    ROUND(SUM(EXTRACT(EPOCH FROM ("toDateTime" - "fromDateTime")) / 86400)::numeric, 1)::float AS "totalDaysCovered"
                FROM leaves
                GROUP BY "leaveType", "status"
                ORDER BY "leaveType" ASC, "status" ASC
            `;
            return statistics;
        } catch (error) {
            console.error('Error in getLeaveStatisticsAggregated:', error);
            throw error;
        }
    }

    static async getAttendanceSummaryByHostelAggregated() {
        try {
            const summary = await prisma.$queryRaw`
                SELECT 
                    u."hostelBlock" AS "hostelBlock",
                    COUNT(s.id)::int AS "totalStudents",
                    ROUND(AVG(s."attendancePercentage")::numeric, 2)::float AS "averageAttendancePercentage",
                    ROUND(AVG(s."overallRiskScore")::numeric, 2)::float AS "averageRiskScore",
                    SUM(CASE WHEN s."overallRiskScore" > 60 THEN 1 ELSE 0 END)::int AS "highRiskStudents",
                    SUM(CASE WHEN s."overallRiskScore" >= 30 AND s."overallRiskScore" <= 60 THEN 1 ELSE 0 END)::int AS "mediumRiskStudents",
                    SUM(CASE WHEN s."overallRiskScore" < 30 THEN 1 ELSE 0 END)::int AS "lowRiskStudents"
                FROM student_stats s
                JOIN users u ON s."studentId" = u.id
                WHERE u."hostelBlock" IS NOT NULL
                GROUP BY u."hostelBlock"
                ORDER BY u."hostelBlock" ASC
            `;
            return summary;
        } catch (error) {
            console.error('Error in getAttendanceSummaryByHostelAggregated:', error);
            throw error;
        }
    }

    static async getTopReliableStudentsAggregated(limit = 10) {
        try {
            const topStudents = await prisma.studentStats.findMany({
                where: {
                    totalLeavesApproved: { gt: 0 }
                },
                include: {
                    student: true
                },
                orderBy: [
                    { returnReliabilityScore: 'desc' },
                    { attendancePercentage: 'desc' }
                ],
                take: limit
            });

            return topStudents.map(item => ({
                studentName: item.student.name,
                studentId: item.studentId,
                hostelBlock: item.student.hostelBlock,
                returnReliabilityScore: item.returnReliabilityScore,
                attendancePercentage: item.attendancePercentage,
                totalLeavesApproved: item.totalLeavesApproved,
                lateReturns: item.lateReturns,
                totalLateReturnHours: item.totalLateReturnHours
            }));
        } catch (error) {
            console.error('Error in getTopReliableStudentsAggregated:', error);
            throw error;
        }
    }
}

module.exports = StatsService;
