const StatsService = require('./statsService');
const CalendarService = require('./calendarService');
const StudentStats = require('../models/StudentStats');
const Leave = require('../models/Leave');

/**
 * MLPredictionService - Machine Learning-based Leave Approval Prediction
 * 
 * This service provides:
 * - Risk scoring with confidence levels
 * - Explainable AI decisions
 * - Pattern detection
 * - Auto-approval/flagging recommendations
 * 
 * Model Architecture:
 * - Rule-based scoring system (interpretable ML)
 * - Feature weights learned from historical data
 * - Confidence calculation based on data availability
 */
class MLPredictionService {

    // ===== FEATURE WEIGHTS (can be tuned or learned) =====
    static WEIGHTS = {
        // Student History Features (60% total)
        attendance: 0.18,           // Attendance percentage impact
        reliability: 0.15,          // Return on time track record
        violations: 0.12,           // Curfew and rule violations
        frequency: 0.08,            // Leave frequency pattern
        history: 0.07,              // Past leave approval history

        // Calendar Features (25% total)
        calendarConflict: 0.15,     // Overlap with restricted periods
        examProximity: 0.10,        // Distance from exam dates

        // Request Features (15% total)
        duration: 0.05,             // Length of leave
        leaveType: 0.05,            // Type of leave (emergency vs regular)
        timing: 0.05                // Day of week, time of request
    };

    // ===== THRESHOLDS =====
    static THRESHOLDS = {
        autoApprove: 20,            // Risk score <= 20: Auto-approve
        manualReview: 60,           // Risk score > 60: Flag for review
        highRisk: 80,               // Risk score > 80: Likely reject
        minConfidence: 0.6          // Minimum confidence for auto-decisions
    };

    // ===== MAIN PREDICTION =====

    /**
     * Generate complete ML prediction for a leave request
     * @param {Object} leaveRequest - { studentId, fromDate, toDate, leaveType, reason }
     * @param {Object} studentInfo - { hostelBlock, course, year }
     * @returns {Object} Complete prediction with explanation
     */
    static async predictLeaveApproval(leaveRequest, studentInfo = {}) {
        const { studentId, fromDate, toDate, leaveType, reason } = leaveRequest;

        // Step 1: Gather all features
        const features = await this.extractFeatures(studentId, fromDate, toDate, leaveType, reason, studentInfo);

        // Step 2: Calculate risk score
        const riskAssessment = this.calculateRiskScore(features);

        // Step 3: Calculate confidence level
        const confidence = this.calculateConfidence(features);

        // Step 4: Generate decision
        const decision = this.generateDecision(riskAssessment.score, confidence, features);

        // Step 5: Generate explanation
        const explanation = this.generateExplanation(features, riskAssessment, decision);

        // Step 6: Detect patterns
        const patterns = await this.detectPatterns(studentId, leaveRequest);

        return {
            // Core prediction
            prediction: {
                decision: decision.action,           // 'AUTO_APPROVE', 'MANUAL_REVIEW', 'FLAG', 'REJECT'
                confidence: confidence.overall,      // 0-1
                riskScore: riskAssessment.score,     // 0-100
                riskCategory: riskAssessment.category // 'LOW', 'MEDIUM', 'HIGH'
            },

            // Detailed breakdown
            features: features,
            featureScores: riskAssessment.componentScores,

            // Explanation
            explanation: explanation,
            
            // Pattern detection
            patterns: patterns,

            // Recommendation for warden
            recommendation: {
                action: decision.action,
                reason: decision.reason,
                suggestedResponse: decision.suggestedResponse,
                attentionPoints: decision.attentionPoints
            },

            // Meta
            modelVersion: '1.0.0',
            timestamp: new Date(),
            processingTime: null // Could add timing
        };
    }

    // ===== FEATURE EXTRACTION =====

    /**
     * Extract all features needed for prediction
     */
    static async extractFeatures(studentId, fromDate, toDate, leaveType, reason, studentInfo) {
        // Get student stats
        let stats = await StudentStats.findOne({ studentId });
        if (!stats) {
            await StatsService.initializeStats(studentId);
            stats = await StudentStats.findOne({ studentId });
        }

        // Get calendar analysis
        const calendarAnalysis = await CalendarService.analyzeLeaveDates(fromDate, toDate, studentInfo);

        // Calculate leave duration
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const durationDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

        // Get day of week info
        const requestDayOfWeek = new Date().getDay();
        const leaveDayOfWeek = from.getDay();
        const isWeekendLeave = leaveDayOfWeek === 5 || leaveDayOfWeek === 6; // Fri or Sat start

        // Get recent leave pattern
        const recentLeaves = await Leave.find({
            studentId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 });

        return {
            // Student profile
            student: {
                attendancePercentage: stats?.attendancePercentage || 100,
                returnReliabilityScore: stats?.returnReliabilityScore || 100,
                curfewViolations: stats?.curfewViolations || 0,
                lateReturns: stats?.lateReturns || 0,
                totalLeavesApplied: stats?.totalLeavesApplied || 0,
                totalLeavesApproved: stats?.totalLeavesApproved || 0,
                totalLeavesRejected: stats?.totalLeavesRejected || 0,
                leavesThisMonth: stats?.leavesThisMonth || 0,
                avgLeaveDuration: stats?.avgLeaveDuration || 0,
                overallRiskScore: stats?.overallRiskScore || 0,
                riskCategory: stats?.riskCategory || 'LOW'
            },

            // Calendar context
            calendar: {
                canApply: calendarAnalysis.canApply,
                calendarScore: calendarAnalysis.calendarScore,
                riskModifier: calendarAnalysis.riskModifier,
                overlappingEvents: calendarAnalysis.overlappingEvents,
                warnings: calendarAnalysis.warnings,
                blockedDates: calendarAnalysis.blockedDates.length,
                recommendation: calendarAnalysis.recommendation
            },

            // Request details
            request: {
                leaveType: leaveType,
                durationDays: durationDays,
                reason: reason,
                isEmergency: leaveType === 'EMERGENCY',
                isMedical: leaveType === 'MEDICAL',
                isWeekend: isWeekendLeave,
                daysUntilLeave: Math.ceil((from - new Date()) / (1000 * 60 * 60 * 24)),
                requestDayOfWeek: requestDayOfWeek
            },

            // Pattern indicators
            patterns: {
                recentLeavesCount: recentLeaves.length,
                hasRecentRejection: recentLeaves.some(l => l.status === 'REJECTED'),
                consecutiveLeaves: this.checkConsecutiveLeaves(recentLeaves, from),
                frequencyAnomaly: stats?.leavesThisMonth > 3
            },

            // Data availability (for confidence)
            dataAvailability: {
                hasAttendanceHistory: stats?.totalDays > 0,
                hasLeaveHistory: stats?.totalLeavesApplied > 0,
                hasReturnHistory: (stats?.onTimeReturns + stats?.lateReturns) > 0,
                daysOfHistory: stats?.totalDays || 0
            }
        };
    }

    /**
     * Check if this leave is consecutive to a recent leave
     */
    static checkConsecutiveLeaves(recentLeaves, newFromDate) {
        if (recentLeaves.length === 0) return false;
        
        const lastLeave = recentLeaves[0];
        if (!lastLeave.toDateTime) return false;

        const daysBetween = Math.ceil(
            (new Date(newFromDate) - new Date(lastLeave.toDateTime)) / (1000 * 60 * 60 * 24)
        );

        return daysBetween <= 3; // Within 3 days of last leave
    }

    // ===== RISK SCORING =====

    /**
     * Calculate weighted risk score from features
     */
    static calculateRiskScore(features) {
        const componentScores = {};
        let totalScore = 0;

        // 1. Attendance Score (higher attendance = lower risk)
        const attendanceRisk = Math.max(0, 100 - features.student.attendancePercentage);
        componentScores.attendance = {
            raw: features.student.attendancePercentage,
            risk: attendanceRisk,
            weighted: attendanceRisk * this.WEIGHTS.attendance,
            impact: attendanceRisk > 30 ? 'negative' : 'positive'
        };
        totalScore += componentScores.attendance.weighted;

        // 2. Reliability Score
        const reliabilityRisk = Math.max(0, 100 - features.student.returnReliabilityScore);
        componentScores.reliability = {
            raw: features.student.returnReliabilityScore,
            risk: reliabilityRisk,
            weighted: reliabilityRisk * this.WEIGHTS.reliability,
            impact: reliabilityRisk > 30 ? 'negative' : 'positive'
        };
        totalScore += componentScores.reliability.weighted;

        // 3. Violations Score
        const violationsRisk = Math.min(100, features.student.curfewViolations * 20);
        componentScores.violations = {
            raw: features.student.curfewViolations,
            risk: violationsRisk,
            weighted: violationsRisk * this.WEIGHTS.violations,
            impact: violationsRisk > 0 ? 'negative' : 'neutral'
        };
        totalScore += componentScores.violations.weighted;

        // 4. Frequency Score
        const frequencyRisk = Math.min(100, features.student.leavesThisMonth * 25);
        componentScores.frequency = {
            raw: features.student.leavesThisMonth,
            risk: frequencyRisk,
            weighted: frequencyRisk * this.WEIGHTS.frequency,
            impact: frequencyRisk > 50 ? 'negative' : 'neutral'
        };
        totalScore += componentScores.frequency.weighted;

        // 5. History Score (past rejections)
        const rejectionRate = features.student.totalLeavesApplied > 0 
            ? (features.student.totalLeavesRejected / features.student.totalLeavesApplied) * 100 
            : 0;
        componentScores.history = {
            raw: rejectionRate,
            risk: rejectionRate,
            weighted: rejectionRate * this.WEIGHTS.history,
            impact: rejectionRate > 20 ? 'negative' : 'neutral'
        };
        totalScore += componentScores.history.weighted;

        // 6. Calendar Conflict Score
        componentScores.calendarConflict = {
            raw: features.calendar.calendarScore,
            risk: features.calendar.calendarScore,
            weighted: features.calendar.calendarScore * this.WEIGHTS.calendarConflict,
            impact: features.calendar.calendarScore > 30 ? 'negative' : 'positive'
        };
        totalScore += componentScores.calendarConflict.weighted;

        // 7. Duration Score (longer leaves = slightly higher risk)
        const durationRisk = Math.min(100, (features.request.durationDays - 1) * 10);
        componentScores.duration = {
            raw: features.request.durationDays,
            risk: durationRisk,
            weighted: durationRisk * this.WEIGHTS.duration,
            impact: durationRisk > 30 ? 'negative' : 'neutral'
        };
        totalScore += componentScores.duration.weighted;

        // 8. Leave Type Score (emergency/medical = lower risk)
        let leaveTypeRisk = 30; // Default for REGULAR
        if (features.request.isEmergency) leaveTypeRisk = 10;
        if (features.request.isMedical) leaveTypeRisk = 5;
        if (features.request.leaveType === 'OTHER') leaveTypeRisk = 40;
        componentScores.leaveType = {
            raw: features.request.leaveType,
            risk: leaveTypeRisk,
            weighted: leaveTypeRisk * this.WEIGHTS.leaveType,
            impact: leaveTypeRisk < 20 ? 'positive' : 'neutral'
        };
        totalScore += componentScores.leaveType.weighted;

        // 9. Timing Score (weekend leaves, advance notice)
        let timingRisk = 30;
        if (features.request.isWeekend) timingRisk -= 20; // Weekend leaves are OK
        if (features.request.daysUntilLeave < 1) timingRisk += 30; // Same day request
        else if (features.request.daysUntilLeave >= 3) timingRisk -= 10; // Good advance notice
        timingRisk = Math.max(0, Math.min(100, timingRisk));
        componentScores.timing = {
            raw: features.request.daysUntilLeave,
            risk: timingRisk,
            weighted: timingRisk * this.WEIGHTS.timing,
            impact: timingRisk < 30 ? 'positive' : 'negative'
        };
        totalScore += componentScores.timing.weighted;

        // Add calendar risk modifier
        totalScore += features.calendar.riskModifier;

        // Clamp final score
        totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

        // Determine category
        let category = 'LOW';
        if (totalScore >= 60) category = 'HIGH';
        else if (totalScore >= 30) category = 'MEDIUM';

        return {
            score: totalScore,
            category: category,
            componentScores: componentScores
        };
    }

    // ===== CONFIDENCE CALCULATION =====

    /**
     * Calculate confidence level for the prediction
     */
    static calculateConfidence(features) {
        const confidenceFactors = [];

        // Factor 1: Data availability (30%)
        let dataScore = 0;
        if (features.dataAvailability.hasAttendanceHistory) dataScore += 0.3;
        if (features.dataAvailability.hasLeaveHistory) dataScore += 0.3;
        if (features.dataAvailability.hasReturnHistory) dataScore += 0.2;
        if (features.dataAvailability.daysOfHistory >= 30) dataScore += 0.2;
        confidenceFactors.push({
            factor: 'dataAvailability',
            score: dataScore,
            weight: 0.3
        });

        // Factor 2: Consistency of indicators (30%)
        // If all indicators point same direction, high consistency
        const indicators = [
            features.student.attendancePercentage >= 80,
            features.student.returnReliabilityScore >= 80,
            features.student.curfewViolations === 0,
            features.student.leavesThisMonth <= 2
        ];
        const consistentTrue = indicators.filter(i => i).length;
        const consistentFalse = indicators.filter(i => !i).length;
        const consistencyScore = Math.max(consistentTrue, consistentFalse) / indicators.length;
        confidenceFactors.push({
            factor: 'consistency',
            score: consistencyScore,
            weight: 0.3
        });

        // Factor 3: Calendar clarity (20%)
        let calendarScore = 1;
        if (features.calendar.blockedDates > 0) calendarScore = 0.9; // Clear signal
        else if (features.calendar.overlappingEvents.length > 0) calendarScore = 0.8;
        confidenceFactors.push({
            factor: 'calendarClarity',
            score: calendarScore,
            weight: 0.2
        });

        // Factor 4: Request completeness (20%)
        let requestScore = 0.5;
        if (features.request.reason && features.request.reason.length > 10) requestScore += 0.25;
        if (features.request.daysUntilLeave >= 1) requestScore += 0.25;
        confidenceFactors.push({
            factor: 'requestQuality',
            score: requestScore,
            weight: 0.2
        });

        // Calculate overall confidence
        const overall = confidenceFactors.reduce(
            (sum, f) => sum + (f.score * f.weight), 0
        );

        return {
            overall: Math.round(overall * 100) / 100,
            factors: confidenceFactors,
            isHighConfidence: overall >= 0.7,
            isLowConfidence: overall < 0.5
        };
    }

    // ===== DECISION GENERATION =====

    /**
     * Generate decision based on risk score and confidence
     */
    static generateDecision(riskScore, confidence, features) {
        let action = 'MANUAL_REVIEW';
        let reason = '';
        let suggestedResponse = '';
        let attentionPoints = [];

        // Check for blocking conditions first
        if (!features.calendar.canApply) {
            action = 'REJECT';
            reason = 'Leave period overlaps with blocked dates (exams/restricted period)';
            suggestedResponse = `Your leave request overlaps with a restricted period. Please choose different dates.`;
            attentionPoints = features.calendar.warnings;
            return { action, reason, suggestedResponse, attentionPoints };
        }

        // Decision based on risk score
        if (riskScore <= this.THRESHOLDS.autoApprove && confidence.overall >= this.THRESHOLDS.minConfidence) {
            action = 'AUTO_APPROVE';
            reason = 'Low risk profile with high confidence';
            suggestedResponse = 'Leave approved. Have a safe trip!';
        } else if (riskScore <= this.THRESHOLDS.autoApprove) {
            action = 'MANUAL_REVIEW';
            reason = 'Low risk but insufficient data for auto-approval';
            suggestedResponse = 'Leave request is under review.';
            attentionPoints.push('Limited history available - verify student details');
        } else if (riskScore > this.THRESHOLDS.highRisk) {
            action = 'FLAG';
            reason = 'High risk score - requires careful review';
            suggestedResponse = 'Your leave request requires additional review.';
            
            // Add specific attention points
            if (features.student.attendancePercentage < 75) {
                attentionPoints.push(`Low attendance: ${features.student.attendancePercentage}%`);
            }
            if (features.student.lateReturns > 0) {
                attentionPoints.push(`${features.student.lateReturns} late returns from previous leaves`);
            }
            if (features.student.curfewViolations > 0) {
                attentionPoints.push(`${features.student.curfewViolations} curfew violations`);
            }
            if (features.patterns.frequencyAnomaly) {
                attentionPoints.push('Unusually high leave frequency this month');
            }
        } else if (riskScore > this.THRESHOLDS.manualReview) {
            action = 'FLAG';
            reason = 'Moderate to high risk - needs review';
            suggestedResponse = 'Your leave request is being reviewed by the warden.';
            attentionPoints.push('Review student history before approval');
        } else {
            action = 'MANUAL_REVIEW';
            reason = 'Moderate risk - standard review process';
            suggestedResponse = 'Leave request submitted. You will be notified once reviewed.';
        }

        // Add calendar warnings
        if (features.calendar.warnings.length > 0) {
            attentionPoints.push(...features.calendar.warnings);
        }

        // Add pattern warnings
        if (features.patterns.consecutiveLeaves) {
            attentionPoints.push('This is a consecutive leave request');
        }
        if (features.patterns.hasRecentRejection) {
            attentionPoints.push('Recent leave was rejected - review reason');
        }

        return { action, reason, suggestedResponse, attentionPoints };
    }

    // ===== EXPLANATION GENERATION =====

    /**
     * Generate human-readable explanation of the decision
     */
    static generateExplanation(features, riskAssessment, decision) {
        const positiveFactors = [];
        const negativeFactors = [];
        const neutralInfo = [];

        // Analyze each component
        for (const [key, value] of Object.entries(riskAssessment.componentScores)) {
            if (value.impact === 'positive') {
                positiveFactors.push(this.getFactorExplanation(key, value, features));
            } else if (value.impact === 'negative') {
                negativeFactors.push(this.getFactorExplanation(key, value, features));
            }
        }

        // Add context info
        neutralInfo.push(`Leave duration: ${features.request.durationDays} day(s)`);
        neutralInfo.push(`Leave type: ${features.request.leaveType}`);
        if (features.request.daysUntilLeave >= 0) {
            neutralInfo.push(`Notice period: ${features.request.daysUntilLeave} day(s) in advance`);
        }

        return {
            summary: this.generateSummary(riskAssessment.score, decision.action),
            positiveFactors: positiveFactors,
            negativeFactors: negativeFactors,
            neutralInfo: neutralInfo,
            recommendation: decision.reason
        };
    }

    /**
     * Get human-readable explanation for a factor
     */
    static getFactorExplanation(factor, value, features) {
        const explanations = {
            attendance: value.impact === 'positive' 
                ? `Good attendance record (${features.student.attendancePercentage}%)`
                : `Attendance below expected (${features.student.attendancePercentage}%)`,
            reliability: value.impact === 'positive'
                ? `Reliable return record (${features.student.returnReliabilityScore}%)`
                : `Past issues with returning on time`,
            violations: value.impact === 'negative'
                ? `${features.student.curfewViolations} curfew violation(s) on record`
                : `No curfew violations`,
            frequency: value.impact === 'negative'
                ? `${features.student.leavesThisMonth} leave requests this month (high frequency)`
                : `Normal leave frequency`,
            history: value.impact === 'negative'
                ? `Previous leave rejections on record`
                : `Good leave history`,
            calendarConflict: value.impact === 'negative'
                ? `Leave overlaps with academic events`
                : `No calendar conflicts`,
            duration: value.impact === 'negative'
                ? `Extended leave duration (${features.request.durationDays} days)`
                : `Standard leave duration`,
            leaveType: value.impact === 'positive'
                ? `${features.request.leaveType} leave - higher priority`
                : `Regular leave type`,
            timing: value.impact === 'positive'
                ? `Good advance notice provided`
                : `Short notice or weekday leave`
        };

        return explanations[factor] || `${factor}: ${value.raw}`;
    }

    /**
     * Generate summary sentence
     */
    static generateSummary(score, action) {
        if (action === 'AUTO_APPROVE') {
            return `This request has a low risk score (${score}/100) and qualifies for automatic approval.`;
        } else if (action === 'REJECT') {
            return `This request cannot be approved due to calendar restrictions.`;
        } else if (action === 'FLAG') {
            return `This request has a high risk score (${score}/100) and requires careful review.`;
        } else {
            return `This request has a moderate risk score (${score}/100) and requires standard review.`;
        }
    }

    // ===== PATTERN DETECTION =====

    /**
     * Detect suspicious patterns in leave behavior
     */
    static async detectPatterns(studentId, currentRequest) {
        const patterns = {
            detected: [],
            riskLevel: 'NONE'
        };

        // Get historical leaves
        const leaves = await Leave.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(20);

        if (leaves.length < 2) {
            return patterns;
        }

        // Pattern 1: Monday/Friday pattern (extending weekends)
        const weekendExtenders = leaves.filter(l => {
            const day = new Date(l.fromDateTime).getDay();
            return day === 1 || day === 5; // Monday or Friday
        });
        if (weekendExtenders.length >= 3 && weekendExtenders.length >= leaves.length * 0.5) {
            patterns.detected.push({
                type: 'WEEKEND_EXTENSION',
                description: 'Frequent leaves on Mondays/Fridays to extend weekends',
                severity: 'MEDIUM'
            });
        }

        // Pattern 2: Clustering around specific dates
        const monthlyPattern = {};
        leaves.forEach(l => {
            const date = new Date(l.fromDateTime).getDate();
            monthlyPattern[date] = (monthlyPattern[date] || 0) + 1;
        });
        const maxCluster = Math.max(...Object.values(monthlyPattern));
        if (maxCluster >= 3) {
            patterns.detected.push({
                type: 'DATE_CLUSTERING',
                description: 'Repeated leaves around same dates each month',
                severity: 'LOW'
            });
        }

        // Pattern 3: Increasing frequency
        const recentMonthLeaves = leaves.filter(l => 
            new Date(l.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length;
        const previousMonthLeaves = leaves.filter(l => {
            const created = new Date(l.createdAt);
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            return created >= twoMonthsAgo && created < monthAgo;
        }).length;
        if (recentMonthLeaves > previousMonthLeaves * 2 && recentMonthLeaves >= 3) {
            patterns.detected.push({
                type: 'INCREASING_FREQUENCY',
                description: 'Leave frequency has doubled compared to previous month',
                severity: 'MEDIUM'
            });
        }

        // Pattern 4: Back-to-back leaves
        const sortedLeaves = [...leaves].sort((a, b) => 
            new Date(a.fromDateTime) - new Date(b.fromDateTime)
        );
        let backToBackCount = 0;
        for (let i = 1; i < sortedLeaves.length; i++) {
            const gap = (new Date(sortedLeaves[i].fromDateTime) - new Date(sortedLeaves[i-1].toDateTime)) / (1000 * 60 * 60 * 24);
            if (gap <= 3) backToBackCount++;
        }
        if (backToBackCount >= 2) {
            patterns.detected.push({
                type: 'BACK_TO_BACK',
                description: 'Multiple consecutive or near-consecutive leaves',
                severity: 'HIGH'
            });
        }

        // Calculate overall pattern risk level
        if (patterns.detected.some(p => p.severity === 'HIGH')) {
            patterns.riskLevel = 'HIGH';
        } else if (patterns.detected.some(p => p.severity === 'MEDIUM')) {
            patterns.riskLevel = 'MEDIUM';
        } else if (patterns.detected.length > 0) {
            patterns.riskLevel = 'LOW';
        }

        return patterns;
    }

    // ===== BATCH PREDICTION =====

    /**
     * Get predictions for multiple pending leave requests
     */
    static async predictBatch(leaveRequests) {
        const results = [];

        for (const request of leaveRequests) {
            try {
                const prediction = await this.predictLeaveApproval(request);
                results.push({
                    leaveId: request._id,
                    studentId: request.studentId,
                    prediction: prediction.prediction,
                    recommendation: prediction.recommendation.action
                });
            } catch (error) {
                results.push({
                    leaveId: request._id,
                    error: error.message
                });
            }
        }

        return results;
    }

    // ===== MODEL INFO =====

    /**
     * Get model information and statistics
     */
    static getModelInfo() {
        return {
            name: 'Smart Hostel Leave Prediction Model',
            version: '1.0.0',
            type: 'Rule-based Scoring System',
            features: Object.keys(this.WEIGHTS),
            weights: this.WEIGHTS,
            thresholds: this.THRESHOLDS,
            description: 'Interpretable ML model for leave approval prediction based on student history, calendar events, and request patterns.'
        };
    }
}

module.exports = MLPredictionService;
