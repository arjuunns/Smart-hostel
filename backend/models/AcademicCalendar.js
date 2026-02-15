const mongoose = require('mongoose');

/**
 * AcademicCalendar Model
 * Stores academic events, exam periods, holidays, and restricted leave periods
 */
const academicCalendarSchema = new mongoose.Schema({
    // Event details
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    
    // Event type
    eventType: {
        type: String,
        enum: [
            'EXAM',              // Exam period - leaves blocked/flagged
            'EXAM_PREP',         // Exam preparation period - leaves discouraged
            'HOLIDAY',           // Official holiday - leaves allowed freely
            'RESTRICTED',        // Restricted period - no leaves allowed
            'EVENT',             // College event - attendance required
            'VACATION',          // Semester break - leaves auto-approved
            'ORIENTATION',       // Orientation week - no leaves
            'FESTIVAL'           // Festival - leaves generally approved
        ],
        required: true
    },

    // Date range
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },

    // Leave policy during this period
    leavePolicy: {
        type: String,
        enum: [
            'BLOCKED',           // No leaves allowed
            'FLAGGED',           // Leaves auto-flagged for review
            'DISCOURAGED',       // Allowed but increases risk score
            'NORMAL',            // Normal processing
            'ENCOURAGED'         // Auto-approval likely (vacations)
        ],
        default: 'NORMAL'
    },

    // Risk score modifier
    riskModifier: {
        type: Number,
        default: 0,  // -50 to +50, added to base risk score
        min: -50,
        max: 50
    },

    // Scope
    affectsHostels: [{
        type: String  // e.g., ['Block A', 'Block B'] or empty for all
    }],
    affectsCourses: [{
        type: String  // e.g., ['CSE', 'ECE'] or empty for all
    }],
    affectsYears: [{
        type: Number  // e.g., [1, 2] or empty for all
    }],

    // Priority (higher = more important)
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },

    // Notification settings
    notifyBefore: {
        type: Number,
        default: 3  // Days before to notify students
    },
    notificationSent: {
        type: Boolean,
        default: false
    },

    // Meta
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    academicYear: {
        type: String,  // e.g., '2025-2026'
        required: true
    },
    semester: {
        type: String,
        enum: ['ODD', 'EVEN', 'BOTH'],
        default: 'BOTH'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
academicCalendarSchema.index({ startDate: 1, endDate: 1 });
academicCalendarSchema.index({ eventType: 1 });
academicCalendarSchema.index({ isActive: 1, startDate: 1 });

// Virtual for checking if event is currently active
academicCalendarSchema.virtual('isCurrentlyActive').get(function() {
    const now = new Date();
    return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Static method to get events for a date range
academicCalendarSchema.statics.getEventsInRange = async function(startDate, endDate) {
    return this.find({
        isActive: true,
        $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
    }).sort({ priority: -1, startDate: 1 });
};

// Static method to get current restrictions
academicCalendarSchema.statics.getCurrentRestrictions = async function() {
    const now = new Date();
    return this.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        leavePolicy: { $in: ['BLOCKED', 'FLAGGED', 'DISCOURAGED'] }
    }).sort({ priority: -1 });
};

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
