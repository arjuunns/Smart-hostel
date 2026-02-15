const express = require('express');
const router = express.Router();
const StatsService = require('../services/statsService');
const StudentStats = require('../models/StudentStats');
const { protect: auth } = require('../middleware/auth');

/**
 * Stats API Routes
 * Provides access to student statistics for ML-based leave approval
 */

// ===== STUDENT ROUTES =====

/**
 * GET /api/stats/my-stats
 * Get current logged-in student's statistics
 */
router.get('/my-stats', auth, async (req, res) => {
    try {
        let stats = await StatsService.getStats(req.user.id);
        
        if (!stats) {
            // Initialize stats if not exists
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

/**
 * GET /api/stats/my-risk
 * Get current student's risk assessment summary
 */
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
                componentScores: stats.componentScores,
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

/**
 * GET /api/stats/student/:studentId
 * Get stats for a specific student (warden/admin only)
 */
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

/**
 * POST /api/stats/refresh/:studentId
 * Manually refresh stats for a student (warden/admin only)
 */
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

/**
 * GET /api/stats/high-risk
 * Get all high-risk students (warden/admin only)
 */
router.get('/high-risk', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized' 
            });
        }

        const highRiskStudents = await StatsService.getHighRiskStudents();
        
        res.json({ 
            success: true, 
            count: highRiskStudents.length,
            data: highRiskStudents 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * GET /api/stats/distribution
 * Get risk distribution across all students (warden/admin only)
 */
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

/**
 * POST /api/stats/refresh-all
 * Refresh stats for all students (admin only)
 */
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

/**
 * GET /api/stats/leaderboard
 * Get students ranked by attendance (for gamification)
 */
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const topStudents = await StudentStats.find({})
            .populate('studentId', 'name hostelBlock roomNo')
            .sort({ attendancePercentage: -1, returnReliabilityScore: -1 })
            .limit(limit)
            .select('studentId attendancePercentage returnReliabilityScore overallRiskScore');

        res.json({ 
            success: true, 
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

/**
 * Generate improvement tips based on stats
 */
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
