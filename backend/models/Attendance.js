const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PRESENT', 'ABSENT', 'ON_LEAVE', 'LATE'],
        required: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // ===== ENHANCED TRACKING FOR ML =====
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    // Curfew tracking (e.g., 10 PM rule)
    curfewViolation: {
        type: Boolean,
        default: false
    },
    curfewTime: {
        type: Date,
        default: null // Expected curfew time
    },
    violationMinutes: {
        type: Number,
        default: 0 // How many minutes late
    },
    // Location/method of check-in
    checkInMethod: {
        type: String,
        enum: ['MANUAL', 'QR_SCAN', 'FACE_RECOGNITION', 'BIOMETRIC'],
        default: 'MANUAL'
    }
}, {
    timestamps: true
});

// Compound index for unique attendance per student per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
// Index for curfew violation queries
attendanceSchema.index({ curfewViolation: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
