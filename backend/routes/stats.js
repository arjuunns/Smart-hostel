const express = require('express');
const router = express.Router();
const StatsService = require('../services/statsService');
const { prisma } = require('../config/db');
const { protect: auth } = require('../middleware/auth');

// ===== STUDENT ROUTES =====

router.get('/my-stats', auth, async (req, res) => {
    try {
        let stats = await StatsService.getStats(req.user.id);
        
        if (!stats) {
            stats = await StatsService.initializeStats(req.user.id);
        }

        res.json({ 
            success: true, 
            data: stats 
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

router.get('/my-risk', auth, async (req, res) => {
    try {
        const stats = await StatsService.getStats(req.user.id);
        
        if (!stats) {
            return res.json({
                success: true,
                data: {
                    riskScore: 0,
                    riskCategory: 'LOW',
                    message: 'No history yet - you have a clean record!'
                }
            });
        }

        res.json({
            success: true,
            data: {
                riskScore: stats.overallRiskScore,
                riskCategory: stats.riskCategory,
                componentScores: {
                    attendance: 100 - stats.attendancePercentage,
                    history: 100 - stats.returnReliabilityScore,
                    curfew: stats.curfewViolations * 20,
                    frequency: stats.leavesThisMonth * 25
                },
                attendancePercentage: stats.attendancePercentage,
                returnReliabilityScore: stats.returnReliabilityScore,
                tips: generateImprovementTips(stats)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ===== WARDEN/ADMIN ROUTES =====

router.get('/student/:studentId', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized to view student stats' 
            });
        }

        const stats = await StatsService.getStats(req.params.studentId);
        
        if (!stats) {
            return res.status(404).json({
                success: false,
                message: 'No stats found for this student'
            });
        }

        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.post('/refresh/:studentId', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const stats = await StatsService.refreshAllStats(req.params.studentId);
        
        res.json({ 
            success: true, 
            message: 'Stats refreshed successfully',
            data: stats 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/high-risk', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const highRiskStudents = await StatsService.getHighRiskStudents();
        const formatted = highRiskStudents.map(item => ({
            ...item,
            studentId: item.student
        }));
        
        res.json({ 
            success: true, 
            count: formatted.length,
            data: formatted 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/distribution', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const distribution = await StatsService.getRiskDistribution();
        
        res.json({ 
            success: true, 
            data: distribution 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.post('/refresh-all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const results = await StatsService.updateAllStudentStats();
        
        res.json({ 
            success: true, 
            message: `Processed ${results.processed} students`,
            data: results 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/leaderboard', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const topStudents = await prisma.studentStats.findMany({
            include: {
                student: {
                    select: {
                        name: true,
                        hostelBlock: true,
                        roomNo: true
                    }
                }
            },
            orderBy: [
                { attendancePercentage: 'desc' },
                { returnReliabilityScore: 'desc' }
            ],
            take: limit
        });

        const formatted = topStudents.map(item => ({
            id: item.id,
            attendancePercentage: item.attendancePercentage,
            returnReliabilityScore: item.returnReliabilityScore,
            overallRiskScore: item.overallRiskScore,
            studentId: item.student
        }));

        res.json({ 
            success: true, 
            data: formatted 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ===== MONGODB/SQL AGGREGATION ROUTES =====

router.get('/aggregation/risk-distribution', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const distribution = await StatsService.getRiskDistributionAggregated();
        
        res.json({ 
            success: true, 
            message: 'Risk distribution aggregated using PostgreSQL SQL grouping queries',
            data: distribution 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/aggregation/leave-statistics', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        let statistics = await StatsService.getLeaveStatisticsAggregated();
        
        statistics = statistics.map(stat => ({
            leaveType: stat.leaveType || 'UNKNOWN',
            status: stat.status || 'PENDING',
            totalRequests: stat.totalRequests || 0,
            averageDurationDays: stat.averageDurationDays || 0,
            totalDaysCovered: stat.totalDaysCovered || 0
        }));
        
        res.json({ 
            success: true, 
            message: 'Leave statistics aggregated using SQL timestamp interval duration mappings',
            data: statistics 
        });
    } catch (error) {
        console.error('Error in leave statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/aggregation/attendance-by-hostel', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const summary = await StatsService.getAttendanceSummaryByHostelAggregated();
        
        res.json({ 
            success: true, 
            message: 'Attendance summary aggregated using SQL join operations on tables users and student_stats',
            data: summary 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

router.get('/aggregation/top-reliable-students', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const limit = parseInt(req.query.limit) || 10;
        const topStudents = await StatsService.getTopReliableStudentsAggregated(limit);
        
        res.json({ 
            success: true, 
            message: `Top ${limit} reliable students retrieved using SQL joins with ORDER BY queries`,
            data: topStudents 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ===== HELPER FUNCTIONS =====

function generateImprovementTips(stats) {
    const tips = [];

    if (stats.attendancePercentage < 80) {
        tips.push('Improve your attendance to increase approval chances for future leaves.');
    }
    if (stats.returnReliabilityScore < 80) {
        tips.push('Return on time from leaves to build a better reliability score.');
    }
    if (stats.curfewViolations > 0) {
        tips.push('Avoid curfew violations to maintain a good standing.');
    }
    if (stats.leavesThisMonth > 3) {
        tips.push('You have multiple leave requests this month. Space them out if possible.');
    }
    if (stats.overallRiskScore < 20) {
        tips.push('Great job! Your excellent record qualifies you for auto-approval.');
    }

    return tips;
}

module.exports = router;
