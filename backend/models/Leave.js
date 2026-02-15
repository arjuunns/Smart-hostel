const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leaveType: {
        type: String,
        enum: ['REGULAR', 'EMERGENCY', 'MEDICAL', 'OTHER'],
        default: 'REGULAR'
    },
    fromDateTime: {
        type: Date,
        required: [true, 'From date/time is required']
    },
    toDateTime: {
        type: Date,
        required: [true, 'To date/time is required']
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'FLAGGED'],
        default: 'PENDING'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    remarks: {
        type: String,
        trim: true
    },
    gatePassId: {
        type: String,
        unique: true,
        sparse: true
    },
    currentStatus: {
        type: String,
        enum: ['IN', 'OUT'],
        default: 'IN'
    },
    
    // ===== ML-RELATED FIELDS =====
    // Risk assessment
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    riskCategory: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: null
    },
    // Factors that contributed to the risk score
    predictionFactors: {
        attendanceScore: { type: Number, default: null },
        historyScore: { type: Number, default: null },
        calendarScore: { type: Number, default: null },
        patternScore: { type: Number, default: null }
    },
    // Was this auto-approved or flagged by AI?
    aiDecision: {
        type: String,
        enum: ['AUTO_APPROVED', 'FLAGGED', 'MANUAL', null],
        default: null
    },
    aiDecisionReason: {
        type: String,
        default: null
    },
    
    // ===== RETURN TRACKING =====
    returnedOnTime: {
        type: Boolean,
        default: null
    },
    actualReturnDateTime: {
        type: Date,
        default: null
    },
    lateReturnHours: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for faster ML queries
leaveSchema.index({ studentId: 1, createdAt: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ riskCategory: 1 });

// Generate gate pass ID when leave is approved
leaveSchema.methods.generateGatePass = function() {
    this.gatePassId = `GP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return this.gatePassId;
};

module.exports = mongoose.model('Leave', leaveSchema);
