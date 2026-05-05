const StudentStats = require('../models/StudentStats');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

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

    /**
     * Initialize stats for a new student
     * @param {ObjectId} studentId 
     * @returns {StudentStats}
     */
    static async initializeStats(studentId) {
        const existing = await StudentStats.findOne({ studentId });
        if (!existing) {
            return await StudentStats.create({ studentId });
        }
        return existing;
    }

    // ===== ATTENDANCE STATS =====

    /**
     * Update attendance statistics for a student
     * @param {ObjectId} studentId 
     * @returns {Object} Updated risk assessment
     */
    static async updateAttendanceStats(studentId) {
        await this.initializeStats(studentId);

        const attendance = await Attendance.find({ studentId });

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
        const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
        const lateDays = attendance.filter(a => a.status === 'LATE').length;
        const curfewViolations = attendance.filter(a => a.curfewViolation).length;
        const totalCurfewViolationMinutes = attendance.reduce((sum, a) => sum + (a.violationMinutes || 0), 0);

        const attendancePercentage = totalDays > 0
            ? Math.round((presentDays / totalDays) * 100)
            : 100;

        await StudentStats.findOneAndUpdate(
            { studentId },
            {
                totalDays,
                presentDays,
                absentDays,
                lateDays,
                curfewViolations,
                totalCurfewViolationMinutes,
                attendancePercentage,
                lastUpdated: new Date()
            }
        );

        return await this.calculateOverallRisk(studentId);
    }

    // ===== LEAVE STATS =====

    /**
     * Update leave statistics for a student
     * @param {ObjectId} studentId 
     * @returns {Object} Updated risk assessment
     */
    static async updateLeaveStats(studentId) {
        await this.initializeStats(studentId);

        const leaves = await Leave.find({ studentId });

        // Basic counts
        const totalLeavesApplied = leaves.length;
        const totalLeavesApproved = leaves.filter(l =>
            ['APPROVED', 'AUTO_APPROVED'].includes(l.status)
        ).length;
        const totalLeavesRejected = leaves.filter(l => l.status === 'REJECTED').length;
        const totalLeavesAutoApproved = leaves.filter(l => l.status === 'AUTO_APPROVED').length;
        const totalLeavesFlagged = leaves.filter(l => l.status === 'FLAGGED').length;

        // Calculate total leave days
        const approvedLeaves = leaves.filter(l =>
            ['APPROVED', 'AUTO_APPROVED'].includes(l.status)
        );
        const totalLeaveDaysTaken = approvedLeaves.reduce((sum, leave) => {
            const days = Math.ceil((new Date(leave.toDateTime) - new Date(leave.fromDateTime)) / (1000 * 60 * 60 * 24)) + 1;
            return sum + Math.max(1, days);
        }, 0);

        // Return reliability
        const completedLeaves = leaves.filter(l => l.returnedOnTime !== null);
        const onTimeReturns = completedLeaves.filter(l => l.returnedOnTime).length;
        const lateReturns = completedLeaves.filter(l => !l.returnedOnTime).length;
        const totalLateReturnHours = leaves.reduce((sum, l) => sum + (l.lateReturnHours || 0), 0);
        const returnReliabilityScore = completedLeaves.length > 0
            ? Math.round((onTimeReturns / completedLeaves.length) * 100)
            : 100;

        // Pattern analysis
        const avgLeaveDuration = approvedLeaves.length > 0
            ? Math.round((totalLeaveDaysTaken / approvedLeaves.length) * 10) / 10
            : 0;

        // Calculate average frequency (days between leave requests)
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

        // Find most frequent leave type
        const leaveTypeCounts = {};
        leaves.forEach(l => {
            leaveTypeCounts[l.leaveType] = (leaveTypeCounts[l.leaveType] || 0) + 1;
        });
        const frequentLeaveType = Object.keys(leaveTypeCounts).length > 0
            ? Object.keys(leaveTypeCounts).reduce((a, b) =>
                leaveTypeCounts[a] > leaveTypeCounts[b] ? a : b
            )
            : null;

        // Recent activity
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);

        const leavesThisMonth = leaves.filter(l => new Date(l.createdAt) >= thisMonthStart).length;
        const leavesThisSemester = leaves.filter(l => new Date(l.createdAt) >= semesterStart).length;

        const lastLeave = leaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        await StudentStats.findOneAndUpdate(
            { studentId },
            {
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
                lastLeaveDate: lastLeave?.createdAt || null,
                lastUpdated: new Date()
            }
        );

        return await this.calculateOverallRisk(studentId);
    }

    // ===== RISK CALCULATION =====

    /**
     * Calculate overall risk score based on all factors
     * @param {ObjectId} studentId 
     * @returns {Object} { riskScore, riskCategory, componentScores }
     */
    static async calculateOverallRisk(studentId) {
        const stats = await StudentStats.findOne({ studentId });
        if (!stats) return null;

        // Calculate component scores (0-100, higher = more risky)

        // 1. Attendance Score (30% weight)
        const attendanceRisk = Math.max(0, 100 - stats.attendancePercentage);

        // 2. Return Reliability Score (25% weight)
        const reliabilityRisk = Math.max(0, 100 - stats.returnReliabilityScore);

        // 3. Curfew Violations Score (20% weight)
        // Each violation adds 15 points, max 100
        const violationsRisk = Math.min(100, stats.curfewViolations * 15);

        // 4. Leave Frequency Score (15% weight)
        // More than 5 leave requests per month = high risk
        const frequencyRisk = Math.min(100, stats.leavesThisMonth * 20);

        // 5. Late Returns Score (10% weight)
        // Each late return adds 20 points, max 100
        const historyRisk = Math.min(100, stats.lateReturns * 20);

        // Calculate weighted risk score
        let riskScore = (
            attendanceRisk * 0.30 +
            reliabilityRisk * 0.25 +
            violationsRisk * 0.20 +
            frequencyRisk * 0.15 +
            historyRisk * 0.10
        );

        riskScore = Math.round(riskScore);

        // Determine risk category
        let riskCategory = 'LOW';
        if (riskScore >= 60) riskCategory = 'HIGH';
        else if (riskScore >= 30) riskCategory = 'MEDIUM';

        const componentScores = {
            attendance: Math.round(attendanceRisk),
            reliability: Math.round(reliabilityRisk),
            violations: Math.round(violationsRisk),
            frequency: Math.round(frequencyRisk),
            history: Math.round(historyRisk)
        };

        await StudentStats.findOneAndUpdate(
            { studentId },
            {
                overallRiskScore: riskScore,
                riskCategory,
                componentScores,
                lastUpdated: new Date()
            }
        );

        return { riskScore, riskCategory, componentScores };
    }

    // ===== FULL REFRESH =====

    /**
     * Refresh all stats for a student
     * @param {ObjectId} studentId 
     * @returns {StudentStats}
     */
    static async refreshAllStats(studentId) {
        await this.updateAttendanceStats(studentId);
        await this.updateLeaveStats(studentId);
        return await StudentStats.findOne({ studentId });
    }

    // ===== GETTERS =====

    /**
     * Get stats for a student
     * @param {ObjectId} studentId 
     * @returns {StudentStats}
     */
    static async getStats(studentId) {
        return await StudentStats.findOne({ studentId });
    }

    /**
     * Get all high-risk students
     * @returns {Array<StudentStats>}
     */
    static async getHighRiskStudents() {
        return await StudentStats.find({ riskCategory: 'HIGH' })
            .populate('studentId', 'name email hostelBlock roomNo phone')
            .sort({ overallRiskScore: -1 });
    }

    /**
     * Get risk distribution summary
     * @returns {Object}
     */
    static async getRiskDistribution() {
        const low = await StudentStats.countDocuments({ riskCategory: 'LOW' });
        const medium = await StudentStats.countDocuments({ riskCategory: 'MEDIUM' });
        const high = await StudentStats.countDocuments({ riskCategory: 'HIGH' });
        const total = low + medium + high;

        return {
            total,
            distribution: {
                low: { count: low, percentage: total > 0 ? Math.round((low / total) * 100) : 0 },
                medium: { count: medium, percentage: total > 0 ? Math.round((medium / total) * 100) : 0 },
                high: { count: high, percentage: total > 0 ? Math.round((high / total) * 100) : 0 }
            }
        };
    }

    // ===== BATCH OPERATIONS =====

    /**
     * Update stats for all students (run as cron job)
     */
    static async updateAllStudentStats() {
        const Leave = require('../models/Leave');
        const studentIds = await Leave.distinct('studentId');

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

    /**
     * Calculate risk score for a specific leave request
     * Combines student stats with calendar analysis
     * @param {ObjectId} studentId 
     * @param {Date} fromDate 
     * @param {Date} toDate 
     * @param {Object} student - Student info (hostelBlock, course, year)
     * @returns {Object} Complete risk assessment
     */
    static async calculateLeaveRequestRisk(studentId, fromDate, toDate, student = {}) {
        const CalendarService = require('./calendarService');
        
        // Get or initialize student stats
        let stats = await this.getStats(studentId);
        if (!stats) {
            stats = await this.initializeStats(studentId);
            await this.refreshAllStats(studentId);
            stats = await this.getStats(studentId);
        }

        // Get calendar analysis
        const calendarAnalysis = await CalendarService.analyzeLeaveDates(fromDate, toDate, student);

        // Base risk from student history
        const baseRiskScore = stats?.overallRiskScore || 0;

        // Calendar risk score (0-100)
        const calendarScore = calendarAnalysis.calendarScore;

        // Combined risk calculation
        // Weights: Student history 60%, Calendar 40%
        let combinedRiskScore = Math.round(
            baseRiskScore * 0.60 + 
            calendarScore * 0.40 +
            calendarAnalysis.riskModifier  // Calendar can add/subtract -50 to +50
        );

        // Clamp between 0-100
        combinedRiskScore = Math.max(0, Math.min(100, combinedRiskScore));

        // Determine risk category
        let riskCategory = 'LOW';
        if (combinedRiskScore >= 60) riskCategory = 'HIGH';
        else if (combinedRiskScore >= 30) riskCategory = 'MEDIUM';

        // Determine AI decision
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
            // Risk scores
            riskScore: combinedRiskScore,
            riskCategory,
            
            // Component breakdown
            predictionFactors: {
                attendanceScore: stats?.componentScores?.attendance || 0,
                historyScore: stats?.componentScores?.history || 0,
                calendarScore: calendarScore,
                patternScore: stats?.componentScores?.frequency || 0
            },
            
            // AI decision
            aiDecision,
            aiDecisionReason,
            
            // Calendar details
            calendarAnalysis: {
                canApply: calendarAnalysis.canApply,
                warnings: calendarAnalysis.warnings,
                overlappingEvents: calendarAnalysis.overlappingEvents,
                blockedDates: calendarAnalysis.blockedDates,
                riskModifier: calendarAnalysis.riskModifier
            },
            
            // Student profile summary
            studentProfile: {
                attendancePercentage: stats?.attendancePercentage || 100,
                returnReliabilityScore: stats?.returnReliabilityScore || 100,
                leavesThisMonth: stats?.leavesThisMonth || 0,
                curfewViolations: stats?.curfewViolations || 0,
                lateReturns: stats?.lateReturns || 0,
                overallRiskCategory: stats?.riskCategory || 'LOW'
            },
            
            // Recommendation for warden
            recommendation: calendarAnalysis.canApply 
                ? (aiDecision === 'AUTO_APPROVED' ? 'APPROVE' : aiDecision === 'FLAGGED' ? 'REVIEW' : 'APPROVE')
                : 'REJECT'
        };
    }

    // ===== MONGODB AGGREGATION PIPELINES =====

    /**
     * Get risk distribution across all students using MongoDB aggregation
     * Groups students by risk category and counts them
     * Demonstrates: $group, $sort, $project
     * @returns {Array} Risk distribution with student counts per category
     */
    static async getRiskDistributionAggregated() {
        try {
            const distribution = await StudentStats.aggregate([
                // Stage 1: Match only students with calculated risk scores
                { $match: { riskCategory: { $exists: true } } },
                
                // Stage 2: Group by risk category and count
                {
                    $group: {
                        _id: '$riskCategory',
                        count: { $sum: 1 },
                        avgRiskScore: { $avg: '$overallRiskScore' },
                        maxRiskScore: { $max: '$overallRiskScore' },
                        minRiskScore: { $min: '$overallRiskScore' }
                    }
                },
                
                // Stage 3: Sort by risk level (descending)
                { $sort: { _id: -1 } },
                
                // Stage 4: Project final output
                {
                    $project: {
                        _id: 0,
                        riskCategory: '$_id',
                        studentCount: '$count',
                        averageRiskScore: { $round: ['$avgRiskScore', 2] },
                        maxRiskScore: '$maxRiskScore',
                        minRiskScore: '$minRiskScore'
                    }
                }
            ]);

            return distribution;
        } catch (error) {
            console.error('Error in getRiskDistributionAggregated:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive leave statistics using MongoDB aggregation
     * Groups leave data by type and status to show summary
     * Demonstrates: $match, $group, $sort, $project
     * @returns {Array} Leave statistics grouped by type and status
     */
    static async getLeaveStatisticsAggregated() {
        try {
            const Leave = require('../models/Leave');
            
            const statistics = await Leave.aggregate([
                // Stage 1: Match all leaves
                { $match: {} },
                
                // Stage 2: Group by type and status
                {
                    $group: {
                        _id: {
                            leaveType: '$leaveType',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        avgDuration: {
                            $avg: {
                                $divide: [
                                    { $subtract: ['$toDateTime', '$fromDateTime'] },
                                    86400000 // milliseconds in a day
                                ]
                            }
                        },
                        totalDays: {
                            $sum: {
                                $divide: [
                                    { $subtract: ['$toDateTime', '$fromDateTime'] },
                                    86400000
                                ]
                            }
                        }
                    }
                },
                
                // Stage 3: Sort by leave type and status
                { $sort: { '_id.leaveType': 1, '_id.status': 1 } },
                
                // Stage 4: Project final output
                {
                    $project: {
                        _id: 0,
                        leaveType: '$_id.leaveType',
                        status: '$_id.status',
                        totalRequests: '$count',
                        averageDurationDays: { $round: ['$avgDuration', 1] },
                        totalDaysCovered: { $round: ['$totalDays', 1] }
                    }
                }
            ]);

            return statistics;
        } catch (error) {
            console.error('Error in getLeaveStatisticsAggregated:', error);
            throw error;
        }
    }

    /**
     * Get attendance summary by hostel using MongoDB aggregation with $lookup
     * Joins StudentStats with User collection to group by hostel
     * Demonstrates: $lookup, $group, $sort, $project
     * @returns {Array} Attendance metrics per hostel
     */
    static async getAttendanceSummaryByHostelAggregated() {
        try {
            const summary = await StudentStats.aggregate([
                // Stage 1: Lookup user details to get hostel information
                {
                    $lookup: {
                        from: 'users',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'studentDetails'
                    }
                },
                
                // Stage 2: Unwind the joined array
                { $unwind: { path: '$studentDetails', preserveNullAndEmptyArrays: true } },
                
                // Stage 3: Match only students with hostel information
                { $match: { 'studentDetails.hostelBlock': { $exists: true, $ne: null } } },
                
                // Stage 4: Group by hostel block
                {
                    $group: {
                        _id: '$studentDetails.hostelBlock',
                        totalStudents: { $sum: 1 },
                        avgAttendance: { $avg: '$attendancePercentage' },
                        avgRiskScore: { $avg: '$overallRiskScore' },
                        highRiskStudents: {
                            $sum: {
                                $cond: [{ $gt: ['$overallRiskScore', 60] }, 1, 0]
                            }
                        },
                        mediumRiskStudents: {
                            $sum: {
                                $cond: [{ $and: [{ $gte: ['$overallRiskScore', 30] }, { $lte: ['$overallRiskScore', 60] }] }, 1, 0]
                            }
                        },
                        lowRiskStudents: {
                            $sum: {
                                $cond: [{ $lt: ['$overallRiskScore', 30] }, 1, 0]
                            }
                        }
                    }
                },
                
                // Stage 5: Sort by hostel name
                { $sort: { _id: 1 } },
                
                // Stage 6: Project final output
                {
                    $project: {
                        _id: 0,
                        hostelBlock: '$_id',
                        totalStudents: 1,
                        averageAttendancePercentage: { $round: ['$avgAttendance', 2] },
                        averageRiskScore: { $round: ['$avgRiskScore', 2] },
                        highRiskStudents: 1,
                        mediumRiskStudents: 1,
                        lowRiskStudents: 1
                    }
                }
            ]);

            return summary;
        } catch (error) {
            console.error('Error in getAttendanceSummaryByHostelAggregated:', error);
            throw error;
        }
    }

    /**
     * Get top reliable students (leaderboard) using aggregation
     * Demonstrates: $sort, $limit, $lookup, $project
     * @param {Number} limit - Number of top students to return
     * @returns {Array} Top students sorted by return reliability
     */
    static async getTopReliableStudentsAggregated(limit = 10) {
        try {
            const topStudents = await StudentStats.aggregate([
                // Stage 1: Lookup student details
                {
                    $lookup: {
                        from: 'users',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                
                // Stage 2: Unwind
                { $unwind: '$student' },
                
                // Stage 3: Filter students with approved leaves
                { $match: { totalLeavesApproved: { $gt: 0 } } },
                
                // Stage 4: Sort by return reliability (descending)
                { $sort: { returnReliabilityScore: -1, attendancePercentage: -1 } },
                
                // Stage 5: Limit results
                { $limit: limit },
                
                // Stage 6: Project clean output
                {
                    $project: {
                        _id: 0,
                        rank: { $meta: 'documentInternalId' },
                        studentName: '$student.name',
                        studentId: '$studentId',
                        hostelBlock: '$student.hostelBlock',
                        returnReliabilityScore: 1,
                        attendancePercentage: 1,
                        totalLeavesApproved: 1,
                        lateReturns: 1,
                        totalLateReturnHours: 1
                    }
                }
            ]);

            return topStudents;
        } catch (error) {
            console.error('Error in getTopReliableStudentsAggregated:', error);
            throw error;
        }
    }
}

module.exports = StatsService;
