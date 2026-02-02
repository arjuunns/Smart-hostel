const mongoose = require('mongoose');

const gateLogSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leave',
        required: true
    },
    gatePassId: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['EXIT', 'ENTRY'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GateLog', gateLogSchema);
