const mongoose = require('mongoose');

/**
 * StudentStats Model
 * Aggregated statistics used by ML model for leave approval predictions
 */
const studentStatsSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // ===== ATTENDANCE METRICS =====
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 100, min: 0, max: 100 },

    // ===== LEAVE METRICS =====
    totalLeavesApplied: { type: Number, default: 0 },
    totalLeavesApproved: { type: Number, default: 0 },
    totalLeavesRejected: { type: Number, default: 0 },
    totalLeavesAutoApproved: { type: Number, default: 0 },
    totalLeavesFlagged: { type: Number, default: 0 },
    totalLeaveDaysTaken: { type: Number, default: 0 }, // Total days on leave

    // ===== RELIABILITY METRICS =====
    onTimeReturns: { type: Number, default: 0 },
    lateReturns: { type: Number, default: 0 },
    totalLateReturnHours: { type: Number, default: 0 }, // Cumulative late hours
    returnReliabilityScore: { type: Number, default: 100, min: 0, max: 100 },

    // ===== VIOLATION METRICS =====
    curfewViolations: { type: Number, default: 0 },
    totalCurfewViolationMinutes: { type: Number, default: 0 },
    unauthorizedAbsences: { type: Number, default: 0 },

    // ===== PATTERN METRICS (for ML) =====
    avgLeaveDuration: { type: Number, default: 0 }, // Average days per leave
    avgLeaveFrequency: { type: Number, default: 0 }, // Avg days between leave requests
    frequentLeaveType: { type: String, default: null },
    lastLeaveDate: { type: Date, default: null },
    leavesThisMonth: { type: Number, default: 0 },
    leavesThisSemester: { type: Number, default: 0 },

    // ===== OVERALL RISK ASSESSMENT =====
    overallRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskCategory: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW'
    },

    // ===== COMPUTED SCORES (for transparency) =====
    componentScores: {
        attendance: { type: Number, default: 0 },     // 0-100, higher = more risky
        reliability: { type: Number, default: 0 },    // 0-100, higher = more risky
        violations: { type: Number, default: 0 },     // 0-100, higher = more risky
        frequency: { type: Number, default: 0 },      // 0-100, higher = more risky
        history: { type: Number, default: 0 }         // 0-100, higher = more risky
    },

    // ===== META =====
    lastUpdated: { type: Date, default: Date.now },
    statsVersion: { type: Number, default: 1 } // For future schema migrations
});

// Indexes
studentStatsSchema.index({ overallRiskScore: -1 });
studentStatsSchema.index({ riskCategory: 1 });
studentStatsSchema.index({ attendancePercentage: 1 });

module.exports = mongoose.model('StudentStats', studentStatsSchema);
