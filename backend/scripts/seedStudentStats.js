/**
 * Seed Script: Populate StudentStats with realistic data
 * Run with: node scripts/seedStudentStats.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('../models/User');
const StudentStats = require('../models/StudentStats');

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-hostel';

// Helper to calculate risk score from components
function calculateRiskScore(componentScores) {
    const weights = {
        attendance: 0.25,
        reliability: 0.25,
        violations: 0.20,
        frequency: 0.20,
        history: 0.10
    };
    
    const score = (
        componentScores.attendance * weights.attendance +
        componentScores.reliability * weights.reliability +
        componentScores.violations * weights.violations +
        componentScores.frequency * weights.frequency +
        componentScores.history * weights.history
    );
    
    return Math.round(score);
}

// Helper to determine risk category
function getRiskCategory(score) {
    if (score < 30) return 'LOW';
    if (score < 65) return 'MEDIUM';
    return 'HIGH';
}

// Generate realistic stats for a student
function generateStudentStats(student) {
    // Random attendance between 70-98%
    const attendancePercentage = Math.floor(Math.random() * (98 - 70) + 70);
    
    // Calculate days based on attendance
    const totalDays = Math.floor(Math.random() * (150 - 100) + 100);
    const presentDays = Math.round(totalDays * (attendancePercentage / 100));
    const absentDays = totalDays - presentDays;
    const lateDays = Math.floor(absentDays * 0.3);

    // Leave metrics
    const totalLeavesApplied = Math.floor(Math.random() * (15 - 3) + 3);
    const totalLeavesApproved = Math.round(totalLeavesApplied * 0.85);
    const totalLeavesRejected = Math.round(totalLeavesApplied * 0.05);
    const totalLeavesAutoApproved = Math.round(totalLeavesApproved * 0.4);
    const totalLeavesFlagged = totalLeavesApplied - totalLeavesApproved - totalLeavesRejected;
    const totalLeaveDaysTaken = Math.floor(Math.random() * (45 - 10) + 10);

    // Reliability metrics
    const onTimeReturns = Math.round(totalLeavesApproved * 0.8);
    const lateReturns = totalLeavesApproved - onTimeReturns;
    const totalLateReturnHours = lateReturns * Math.floor(Math.random() * (48 - 1) + 1);
    const returnReliabilityScore = Math.max(50, 100 - (lateReturns * 10));

    // Violation metrics
    const curfewViolations = Math.floor(Math.random() * 5);
    const totalCurfewViolationMinutes = curfewViolations * Math.floor(Math.random() * (120 - 15) + 15);
    const unauthorizedAbsences = Math.floor(Math.random() * 3);

    // Pattern metrics
    const avgLeaveDuration = totalLeaveDaysTaken > 0 ? 
        (totalLeaveDaysTaken / totalLeavesApproved).toFixed(2) : 0;
    const avgLeaveFrequency = totalLeavesApproved > 0 ? 
        (totalDays / totalLeavesApproved).toFixed(2) : 0;
    const leaveTypes = ['REGULAR', 'EMERGENCY', 'MEDICAL'];
    const frequentLeaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
    const leavesThisMonth = Math.floor(Math.random() * 3);
    const leavesThisSemester = totalLeavesApproved;

    // Generate last leave date (within last 3 months)
    const lastLeaveDate = new Date();
    lastLeaveDate.setDate(lastLeaveDate.getDate() - Math.floor(Math.random() * 90));

    // Component scores (higher = more risky)
    const componentScores = {
        attendance: Math.max(0, 100 - attendancePercentage),
        reliability: Math.max(0, 100 - returnReliabilityScore),
        violations: Math.min(100, (curfewViolations + unauthorizedAbsences) * 15),
        frequency: Math.min(100, (totalLeavesApplied / 15) * 100),
        history: Math.min(100, (totalLeavesRejected + totalLeavesFlagged) * 20)
    };

    // Calculate overall risk score
    const overallRiskScore = calculateRiskScore(componentScores);

    return {
        studentId: student._id,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendancePercentage,
        totalLeavesApplied,
        totalLeavesApproved,
        totalLeavesRejected,
        totalLeavesAutoApproved,
        totalLeavesFlagged,
        totalLeaveDaysTaken,
        onTimeReturns,
        lateReturns,
        totalLateReturnHours,
        returnReliabilityScore,
        curfewViolations,
        totalCurfewViolationMinutes,
        unauthorizedAbsences,
        avgLeaveDuration: parseFloat(avgLeaveDuration),
        avgLeaveFrequency: parseFloat(avgLeaveFrequency),
        frequentLeaveType,
        lastLeaveDate,
        leavesThisMonth,
        leavesThisSemester,
        overallRiskScore,
        riskCategory: getRiskCategory(overallRiskScore),
        componentScores,
        lastUpdated: new Date(),
        statsVersion: 1
    };
}

// Main function
async function seedStudentStats() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Get all students
        console.log('\n📚 Fetching students from database...');
        const students = await User.find({ role: 'student' }).limit(50);
        console.log(`✅ Found ${students.length} students`);

        if (students.length === 0) {
            console.log('⚠️  No students found in database!');
            console.log('💡 Tip: Create some student accounts first before seeding stats');
            await mongoose.connection.close();
            return;
        }

        // Clear existing stats (optional - uncomment to reset)
        // await StudentStats.deleteMany({});
        // console.log('🗑️  Cleared existing StudentStats');

        // Generate and save stats for each student
        console.log('\n📊 Generating realistic student statistics...\n');
        let created = 0;
        let updated = 0;

        for (const student of students) {
            const statsData = generateStudentStats(student);
            
            try {
                const result = await StudentStats.findOneAndUpdate(
                    { studentId: student._id },
                    statsData,
                    { upsert: true, new: true, runValidators: true }
                );

                if (result) {
                    const isNew = !result.lastUpdated || 
                        result.lastUpdated.getTime() === statsData.lastUpdated.getTime();
                    
                    if (isNew) {
                        created++;
                        console.log(`✓ Created stats for ${student.name} (${student.hostelBlock}/${student.roomNo})`);
                    } else {
                        updated++;
                        console.log(`↻ Updated stats for ${student.name} (Risk: ${statsData.riskCategory})`);
                    }
                }
            } catch (err) {
                console.error(`✗ Error for ${student.name}:`, err.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 SEEDING SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Created: ${created} new student stats records`);
        console.log(`↻  Updated: ${updated} existing records`);
        console.log(`📊 Total: ${created + updated} records processed`);

        // Show some statistics
        console.log('\n' + '='.repeat(60));
        console.log('📊 AGGREGATE STATISTICS');
        console.log('='.repeat(60));

        const stats = await StudentStats.aggregate([
            {
                $group: {
                    _id: '$riskCategory',
                    count: { $sum: 1 },
                    avgAttendance: { $avg: '$attendancePercentage' },
                    avgRisk: { $avg: '$overallRiskScore' },
                    avgReliability: { $avg: '$returnReliabilityScore' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\nRisk Distribution:');
        stats.forEach(cat => {
            console.log(`  ${cat._id}: ${cat.count} students`);
            console.log(`    - Avg Attendance: ${cat.avgAttendance.toFixed(1)}%`);
            console.log(`    - Avg Risk Score: ${cat.avgRisk.toFixed(1)}`);
            console.log(`    - Avg Reliability: ${cat.avgReliability.toFixed(1)}%\n`);
        });

        // Overall statistics
        const overall = await StudentStats.aggregate([
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    avgAttendance: { $avg: '$attendancePercentage' },
                    avgRisk: { $avg: '$overallRiskScore' },
                    avgLeaves: { $avg: '$totalLeavesApproved' },
                    avgReturns: { $avg: '$onTimeReturns' }
                }
            }
        ]);

        if (overall.length > 0) {
            const o = overall[0];
            console.log('Overall Metrics:');
            console.log(`  Total Students: ${o.totalStudents}`);
            console.log(`  Average Attendance: ${o.avgAttendance.toFixed(1)}%`);
            console.log(`  Average Risk Score: ${o.avgRisk.toFixed(1)}`);
            console.log(`  Average Leaves Approved: ${o.avgLeaves.toFixed(1)}`);
            console.log(`  Average On-Time Returns: ${o.avgReturns.toFixed(1)}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Seeding completed successfully!');
        console.log('='.repeat(60));

        console.log('\n💡 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Login as warden in the frontend');
        console.log('   3. Navigate to "📊 MongoDB Analytics" tab');
        console.log('   4. View the aggregated statistics\n');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed\n');
    }
}

// Run the script
seedStudentStats();
