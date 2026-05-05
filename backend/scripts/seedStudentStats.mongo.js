
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

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

function getRiskCategory(score) {
    if (score < 30) return 'LOW';
    if (score < 65) return 'MEDIUM';
    return 'HIGH';
}

function generateStudentStats(studentId, studentName, hostelBlock, roomNo) {
    // Random attendance between 70-98%
    const attendancePercentage = random(70, 98);
    
    // Calculate days based on attendance
    const totalDays = random(100, 150);
    const presentDays = Math.round(totalDays * (attendancePercentage / 100));
    const absentDays = totalDays - presentDays;
    const lateDays = Math.floor(absentDays * 0.3);

    // Leave metrics
    const totalLeavesApplied = random(3, 15);
    const totalLeavesApproved = Math.round(totalLeavesApplied * 0.85);
    const totalLeavesRejected = Math.round(totalLeavesApplied * 0.05);
    const totalLeavesAutoApproved = Math.round(totalLeavesApproved * 0.4);
    const totalLeavesFlagged = totalLeavesApplied - totalLeavesApproved - totalLeavesRejected;
    const totalLeaveDaysTaken = random(10, 45);

    // Reliability metrics
    const onTimeReturns = Math.round(totalLeavesApproved * 0.8);
    const lateReturns = totalLeavesApproved - onTimeReturns;
    const totalLateReturnHours = lateReturns * random(1, 48);
    const returnReliabilityScore = Math.max(50, 100 - (lateReturns * 10));

    // Violation metrics
    const curfewViolations = random(0, 5);
    const totalCurfewViolationMinutes = curfewViolations * random(15, 120);
    const unauthorizedAbsences = random(0, 3);

    // Pattern metrics
    const avgLeaveDuration = totalLeaveDaysTaken > 0 ? 
        randomFloat(totalLeaveDaysTaken / totalLeavesApproved * 0.8, totalLeaveDaysTaken / totalLeavesApproved * 1.2) : 0;
    const avgLeaveFrequency = totalLeavesApproved > 0 ? 
        randomFloat(totalDays / totalLeavesApproved * 0.9, totalDays / totalLeavesApproved * 1.1) : 0;
    const leaveTypes = ['REGULAR', 'EMERGENCY', 'MEDICAL'];
    const frequentLeaveType = totalLeavesApproved > 0 
        ? leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
        : 'REGULAR';
    const leavesThisMonth = random(0, 3);
    const leavesThisSemester = totalLeavesApproved;

    // Generate last leave date (within last 3 months, or today if no leaves)
    const lastLeaveDate = new Date();
    if (totalLeavesApproved > 0) {
        lastLeaveDate.setDate(lastLeaveDate.getDate() - random(0, 90));
    }

    // Component scores (higher = more risky) - rounded
    const componentScores = {
        attendance: Math.round(Math.max(0, 100 - attendancePercentage)),
        reliability: Math.round(Math.max(0, 100 - returnReliabilityScore)),
        violations: Math.round(Math.min(100, (curfewViolations + unauthorizedAbsences) * 15)),
        frequency: Math.round(Math.min(100, (totalLeavesApplied / 15) * 100)),
        history: Math.round(Math.min(100, (totalLeavesRejected + totalLeavesFlagged) * 20))
    };

    // Calculate overall risk score
    const overallRiskScore = calculateRiskScore(componentScores);

    return {
        studentId: ObjectId(studentId),
        totalDays: Math.max(100, totalDays),
        presentDays: Math.max(60, presentDays),
        absentDays: Math.max(0, absentDays),
        lateDays: Math.max(0, lateDays),
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        totalLeavesApplied: Math.max(0, totalLeavesApplied),
        totalLeavesApproved: Math.max(0, totalLeavesApproved),
        totalLeavesRejected: Math.max(0, totalLeavesRejected),
        totalLeavesAutoApproved: Math.max(0, totalLeavesAutoApproved),
        totalLeavesFlagged: Math.max(0, totalLeavesFlagged),
        totalLeaveDaysTaken: Math.max(0, totalLeaveDaysTaken),
        onTimeReturns: Math.max(0, onTimeReturns),
        lateReturns: Math.max(0, lateReturns),
        totalLateReturnHours: Math.max(0, totalLateReturnHours),
        returnReliabilityScore: Math.round(returnReliabilityScore * 100) / 100,
        curfewViolations: Math.max(0, curfewViolations),
        totalCurfewViolationMinutes: Math.max(0, totalCurfewViolationMinutes),
        unauthorizedAbsences: Math.max(0, unauthorizedAbsences),
        avgLeaveDuration: Math.round(avgLeaveDuration * 100) / 100,
        avgLeaveFrequency: Math.round(avgLeaveFrequency * 100) / 100,
        frequentLeaveType: frequentLeaveType || 'REGULAR',
        lastLeaveDate: new Date(lastLeaveDate),
        leavesThisMonth: Math.max(0, leavesThisMonth),
        leavesThisSemester: Math.max(0, leavesThisSemester),
        overallRiskScore: Math.round(overallRiskScore),
        riskCategory: getRiskCategory(overallRiskScore),
        componentScores: {
            attendance: Math.max(0, Math.min(100, componentScores.attendance || 0)),
            reliability: Math.max(0, Math.min(100, componentScores.reliability || 0)),
            violations: Math.max(0, Math.min(100, componentScores.violations || 0)),
            frequency: Math.max(0, Math.min(100, componentScores.frequency || 0)),
            history: Math.max(0, Math.min(100, componentScores.history || 0))
        },
        lastUpdated: new Date(),
        statsVersion: 1
    };
}

// ============================================================
// MAIN SEEDING FUNCTION
// ============================================================

function seedStudentStats() {
    try {
        console.log('📚 Fetching students from database...');
        
        // Get all students
        const students = db.users.find({ role: 'student' }).limit(50).toArray();
        
        if (students.length === 0) {
            console.log('⚠️  No students found in database!');
            console.log('💡 Create some student accounts first');
            return;
        }
        
        console.log(`✅ Found ${students.length} students\n`);
        console.log('📊 Generating realistic student statistics...\n');

        let created = 0;
        let updated = 0;

        // Generate and insert/update stats for each student
        students.forEach((student, index) => {
            const statsData = generateStudentStats(
                student._id.toString(),
                student.name,
                student.hostelBlock,
                student.roomNo
            );

            // Use updateOne with upsert to create or update
            const result = db.studentstats.updateOne(
                { studentId: ObjectId(student._id) },
                { $set: statsData },
                { upsert: true }
            );

            if (result.upsertedId) {
                created++;
                console.log(`✓ Created stats for ${student.name} (${student.hostelBlock}/${student.roomNo})`);
            } else if (result.modifiedCount > 0) {
                updated++;
                console.log(`↻ Updated stats for ${student.name} (Risk: ${statsData.riskCategory})`);
            }

            // Show progress every 10 records
            if ((index + 1) % 10 === 0) {
                console.log(`  ... processed ${index + 1}/${students.length}`);
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log('📈 SEEDING SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Created: ${created} new student stats records`);
        console.log(`↻  Updated: ${updated} existing records`);
        console.log(`📊 Total: ${created + updated} records processed`);

        // Show aggregate statistics
        console.log('\n' + '='.repeat(60));
        console.log('📊 AGGREGATE STATISTICS');
        console.log('='.repeat(60));

        const stats = db.studentstats.aggregate([
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
        ]).toArray();

        console.log('\nRisk Distribution:');
        stats.forEach(cat => {
            console.log(`  ${cat._id}: ${cat.count} students`);
            console.log(`    - Avg Attendance: ${cat.avgAttendance.toFixed(1)}%`);
            console.log(`    - Avg Risk Score: ${cat.avgRisk.toFixed(1)}`);
            console.log(`    - Avg Reliability: ${cat.avgReliability.toFixed(1)}%\n`);
        });

        // Overall statistics
        const overall = db.studentstats.aggregate([
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
        ]).toArray();

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
        console.error('❌ Error during seeding:', error.message);
    }
}

// ============================================================
// RUN THE SEEDING
// ============================================================

console.log('\n🔄 Starting StudentStats seeding process...\n');
seedStudentStats();
