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
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
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
    }
}, {
    timestamps: true
});

// Generate gate pass ID when leave is approved
leaveSchema.methods.generateGatePass = function() {
    this.gatePassId = `GP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return this.gatePassId;
};

module.exports = mongoose.model('Leave', leaveSchema);
