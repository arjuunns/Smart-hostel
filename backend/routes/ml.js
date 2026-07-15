const express = require('express');
const router = express.Router();
const MLPredictionService = require('../services/mlPredictionService');
const { prisma } = require('../config/db');
const { protect: auth } = require('../middleware/auth');

// ===== PREDICTION ROUTES =====

router.post('/predict', auth, async (req, res) => {
    try {
        const { fromDate, toDate, leaveType, reason } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                message: 'fromDate and toDate are required'
            });
        }

        const leaveRequest = {
            studentId: req.user.id,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            leaveType: leaveType || 'REGULAR',
            reason: reason || ''
        };

        const studentInfo = {
            hostelBlock: req.user.hostelBlock,
            course: req.user.course,
            year: req.user.year
        };

        const prediction = await MLPredictionService.predictLeaveApproval(leaveRequest, studentInfo);

        if (req.user.role === 'student') {
            return res.json({
                success: true,
                data: {
                    riskScore: prediction.prediction.riskScore,
                    riskCategory: prediction.prediction.riskCategory,
                    likelihood: prediction.prediction.riskScore <= 30 ? 'HIGH' : 
                                prediction.prediction.riskScore <= 60 ? 'MEDIUM' : 'LOW',
                    message: prediction.recommendation.suggestedResponse,
                    warnings: prediction.explanation.negativeFactors,
                    positives: prediction.explanation.positiveFactors,
                    tips: generateStudentTips(prediction)
                }
            });
        }

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/predict/:leaveId', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const leaveId = parseInt(req.params.leaveId);
        const leave = await prisma.leave.findUnique({
            where: { id: leaveId },
            include: { student: true }
        });
        
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }

        const leaveRequest = {
            studentId: leave.studentId,
            fromDate: leave.fromDateTime,
            toDate: leave.toDateTime,
            leaveType: leave.leaveType,
            reason: leave.reason
        };

        const studentInfo = {
            hostelBlock: leave.student.hostelBlock,
            course: leave.student.course,
            year: leave.student.year
        };

        const prediction = await MLPredictionService.predictLeaveApproval(leaveRequest, studentInfo);

        res.json({
            success: true,
            data: {
                leave: {
                    id: leave.id,
                    studentName: leave.student.name,
                    fromDate: leave.fromDateTime,
                    toDate: leave.toDateTime,
                    leaveType: leave.leaveType,
                    currentStatus: leave.status
                },
                prediction: prediction
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/predict-batch', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const pendingLeaves = await prisma.leave.findMany({
            where: { status: 'PENDING' },
            include: { student: true },
            orderBy: { createdAt: 'asc' }
        });

        if (pendingLeaves.length === 0) {
            return res.json({
                success: true,
                message: 'No pending leaves to analyze',
                data: []
            });
        }

        const predictions = [];

        for (const leave of pendingLeaves) {
            try {
                const leaveRequest = {
                    studentId: leave.studentId,
                    fromDate: leave.fromDateTime,
                    toDate: leave.toDateTime,
                    leaveType: leave.leaveType,
                    reason: leave.reason
                };

                const prediction = await MLPredictionService.predictLeaveApproval(leaveRequest, {
                    hostelBlock: leave.student.hostelBlock,
                    course: leave.student.course,
                    year: leave.student.year
                });

                predictions.push({
                    leave: {
                        id: leave.id,
                        studentName: leave.student.name,
                        studentEmail: leave.student.email,
                        hostelBlock: leave.student.hostelBlock,
                        fromDate: leave.fromDateTime,
                        toDate: leave.toDateTime,
                        leaveType: leave.leaveType,
                        reason: leave.reason,
                        createdAt: leave.createdAt
                    },
                    prediction: {
                        decision: prediction.prediction.decision,
                        riskScore: prediction.prediction.riskScore,
                        riskCategory: prediction.prediction.riskCategory,
                        confidence: prediction.prediction.confidence
                    },
                    recommendation: prediction.recommendation,
                    patterns: prediction.patterns
                });
            } catch (err) {
                predictions.push({
                    leave: { id: leave.id },
                    error: err.message
                });
            }
        }

        predictions.sort((a, b) => {
            const scoreA = a.prediction?.riskScore || 0;
            const scoreB = b.prediction?.riskScore || 0;
            return scoreB - scoreA;
        });

        const summary = {
            total: predictions.length,
            autoApprove: predictions.filter(p => p.prediction?.decision === 'AUTO_APPROVE').length,
            needsReview: predictions.filter(p => p.prediction?.decision === 'MANUAL_REVIEW').length,
            flagged: predictions.filter(p => p.prediction?.decision === 'FLAG').length,
            rejected: predictions.filter(p => p.prediction?.decision === 'REJECT').length
        };

        res.json({
            success: true,
            summary: summary,
            data: predictions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/patterns/:studentId', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const patterns = await MLPredictionService.detectPatterns(req.params.studentId, {});

        res.json({
            success: true,
            data: patterns
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/model-info', auth, async (req, res) => {
    try {
        const modelInfo = MLPredictionService.getModelInfo();

        res.json({
            success: true,
            data: modelInfo
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/dashboard', auth, async (req, res) => {
    try {
        if (!['warden', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalPending,
            totalAutoApproved,
            totalFlagged,
            recentApproved,
            recentRejected
        ] = await Promise.all([
            prisma.leave.count({ where: { status: 'PENDING' } }),
            prisma.leave.count({ where: { status: 'AUTO_APPROVED', createdAt: { gte: thirtyDaysAgo } } }),
            prisma.leave.count({ where: { status: 'FLAGGED', createdAt: { gte: thirtyDaysAgo } } }),
            prisma.leave.count({ where: { status: 'APPROVED', createdAt: { gte: thirtyDaysAgo } } }),
            prisma.leave.count({ where: { status: 'REJECTED', createdAt: { gte: thirtyDaysAgo } } })
        ]);

        const pendingLeaves = await prisma.leave.findMany({
            where: { status: 'PENDING' },
            include: { student: true },
            take: 10
        });
        
        let highRiskCount = 0;
        for (const leave of pendingLeaves) {
            try {
                const prediction = await MLPredictionService.predictLeaveApproval({
                    studentId: leave.studentId,
                    fromDate: leave.fromDateTime,
                    toDate: leave.toDateTime,
                    leaveType: leave.leaveType,
                    reason: leave.reason
                });
                if (prediction.prediction.riskCategory === 'HIGH') highRiskCount++;
            } catch (e) {
                // Ignore errors
            }
        }

        res.json({
            success: true,
            data: {
                pendingLeaves: totalPending,
                last30Days: {
                    autoApproved: totalAutoApproved,
                    flagged: totalFlagged,
                    manuallyApproved: recentApproved,
                    rejected: recentRejected,
                    total: totalAutoApproved + totalFlagged + recentApproved + recentRejected
                },
                highRiskPending: highRiskCount,
                modelVersion: MLPredictionService.getModelInfo().version
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

function generateStudentTips(prediction) {
    const tips = [];
    const riskScore = prediction.prediction.riskScore;

    if (riskScore <= 20) {
        tips.push('✅ Your profile qualifies for quick approval!');
    }

    if (prediction.features.student.attendancePercentage < 80) {
        tips.push('📊 Improving your attendance can help future leave approvals');
    }

    if (prediction.features.student.leavesThisMonth >= 3) {
        tips.push('📅 You have multiple leaves this month - consider spacing them out');
    }

    if (prediction.features.calendar.warnings.length > 0) {
        tips.push('⚠️ Consider choosing dates without academic conflicts');
    }

    if (prediction.features.request.daysUntilLeave < 2) {
        tips.push('⏰ Applying earlier gives better chances of approval');
    }

    if (prediction.patterns.detected.length > 0) {
        tips.push('🔍 Varying your leave patterns may improve approval chances');
    }

    return tips;
}

module.exports = router;
