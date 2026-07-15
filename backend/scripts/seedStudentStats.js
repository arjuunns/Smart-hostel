/**
 * Seed Script: Populate PostgreSQL with realistic demo data
 * Run with: node scripts/seedStudentStats.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create pool and client
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to calculate risk score
function calculateRiskScore(attendancePercentage, returnReliabilityScore, curfewViolations, leavesThisMonth, totalLateReturnHours) {
    const attendanceScore = Math.max(0, 100 - attendancePercentage);
    const historyScore = Math.max(0, 100 - returnReliabilityScore);
    const curfewScore = Math.min(100, curfewViolations * 20);
    const frequencyScore = Math.min(100, leavesThisMonth * 25);
    const lateReturnScore = Math.min(100, totalLateReturnHours * 10);

    return Math.round(
        attendanceScore * 0.30 +
        historyScore * 0.25 +
        curfewScore * 0.20 +
        frequencyScore * 0.15 +
        lateReturnScore * 0.10
    );
}

function getRiskCategory(score) {
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
}

async function main() {
    try {
        console.log('🔗 Connecting to PostgreSQL...');
        await prisma.$connect();
        console.log('✅ Connected successfully!');

        // 1. Create Demo Users
        console.log('\n👤 Creating demo users...');
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('Password123!', salt);

        const usersData = [
            // Admin
            { email: 'admin@hostel.com', name: 'System Admin', role: 'admin', passwordHash: defaultPassword },
            // Warden
            { email: 'warden@hostel.com', name: 'Warden John', role: 'warden', hostelBlock: 'Block A', passwordHash: defaultPassword },
            // Guard
            { email: 'guard@hostel.com', name: 'Guard Ram', role: 'guard', passwordHash: defaultPassword },
            // Students
            { email: 'arjun@student.com', name: 'Arjun Mehta', role: 'student', hostelBlock: 'Block A', roomNo: 'A-101', phone: '9876543210', parentPhone: '9876543211', passwordHash: defaultPassword },
            { email: 'priya@student.com', name: 'Priya Sharma', role: 'student', hostelBlock: 'Block A', roomNo: 'A-102', phone: '9876543220', parentPhone: '9876543221', passwordHash: defaultPassword },
            { email: 'rohit@student.com', name: 'Rohit Sen', role: 'student', hostelBlock: 'Block B', roomNo: 'B-205', phone: '9876543230', parentPhone: '9876543231', passwordHash: defaultPassword },
            { email: 'ananya@student.com', name: 'Ananya Iyer', role: 'student', hostelBlock: 'Block B', roomNo: 'B-206', phone: '9876543240', parentPhone: '9876543241', passwordHash: defaultPassword },
            { email: 'amit@student.com', name: 'Amit Verma', role: 'student', hostelBlock: 'Block C', roomNo: 'C-312', phone: '9876543250', parentPhone: '9876543251', passwordHash: defaultPassword }
        ];

        const users = [];
        for (const u of usersData) {
            const existing = await prisma.user.findUnique({ where: { email: u.email } });
            if (!existing) {
                const created = await prisma.user.create({ data: u });
                users.push(created);
                console.log(`✓ Created User: ${u.name} (${u.role})`);
            } else {
                users.push(existing);
                console.log(`- User already exists: ${u.name}`);
            }
        }

        const students = users.filter(u => u.role === 'student');

        // 3. Clear existing transaction and stats data for clean re-seeding
        console.log('\n🧹 Clearing existing transaction data...');
        await prisma.gateLog.deleteMany({});
        await prisma.leave.deleteMany({});
        await prisma.attendance.deleteMany({});
        await prisma.studentStats.deleteMany({});

        // 2. Create Default Calendar Events
        console.log('\n📅 Seeding calendar events...');
        const CalendarService = require('../services/calendarService');
        await CalendarService.seedDefaultEvents('2025-2026', users.find(u => u.role === 'admin')?.id || 1);
        console.log('✓ Seeding calendar complete!');

        // 4. Create Sample Leave Applications & Student Stats
        console.log('\n📊 Creating leave applications & seeding student stats...');
        
        for (const student of students) {
            // Remove existing stats if any
            await prisma.studentStats.deleteMany({ where: { studentId: student.id } }).catch(() => {});
            
            // Random parameters for simulation
            const isHighRisk = student.email === 'rohit@student.com';
            const isMediumRisk = student.email === 'amit@student.com';

            const attendancePercentage = isHighRisk ? 72 : isMediumRisk ? 81 : 96;
            const returnReliabilityScore = isHighRisk ? 60 : isMediumRisk ? 80 : 100;
            const curfewViolations = isHighRisk ? 4 : isMediumRisk ? 1 : 0;
            const leavesThisMonth = isHighRisk ? 4 : isMediumRisk ? 2 : 1;
            const totalLateReturnHours = isHighRisk ? 18.5 : isMediumRisk ? 4.0 : 0.0;

            const overallRiskScore = calculateRiskScore(
                attendancePercentage,
                returnReliabilityScore,
                curfewViolations,
                leavesThisMonth,
                totalLateReturnHours
            );

            const riskCategory = getRiskCategory(overallRiskScore);

            // Generate Stats record
            await prisma.studentStats.create({
                data: {
                    studentId: student.id,
                    totalLeavesApplied: leavesThisMonth + 3,
                    totalLeavesApproved: leavesThisMonth + 2,
                    totalLeavesRejected: isHighRisk ? 1 : 0,
                    totalLeavesAutoApproved: isHighRisk ? 0 : 2,
                    totalLeavesFlagged: isHighRisk ? 3 : 0,
                    totalLeaveDaysTaken: (leavesThisMonth + 2) * 2,
                    onTimeReturns: leavesThisMonth + 1,
                    lateReturns: isHighRisk ? 2 : isMediumRisk ? 1 : 0,
                    totalLateReturnHours,
                    returnReliabilityScore,
                    avgLeaveDuration: 2.5,
                    avgLeaveFrequency: 12.0,
                    frequentLeaveType: 'REGULAR',
                    leavesThisMonth,
                    leavesThisSemester: leavesThisMonth + 3,
                    totalDays: 45,
                    presentDays: Math.round(45 * (attendancePercentage / 100)),
                    absentDays: 45 - Math.round(45 * (attendancePercentage / 100)),
                    lateDays: isHighRisk ? 5 : 0,
                    curfewViolations,
                    totalCurfewViolationMinutes: curfewViolations * 45,
                    attendancePercentage,
                    overallRiskScore,
                    riskCategory
                }
            });

            // Create some past leaves for this student
            await prisma.leave.create({
                data: {
                    studentId: student.id,
                    leaveType: 'REGULAR',
                    fromDateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    toDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                    reason: 'Going to native home',
                    status: 'APPROVED',
                    gatePassId: `GP-${student.id}-PAST`,
                    currentStatus: 'IN',
                    returnedOnTime: isHighRisk ? false : true,
                    actualReturnDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                    lateReturnHours: isHighRisk ? 6 : 0
                }
            });

            console.log(`✓ Seeded profile, stats, and past leaves for student: ${student.name} (Risk: ${riskCategory})`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Seeding completed successfully!');
        console.log('='.repeat(60));
        console.log('\n💡 Next Steps:');
        console.log('   1. Start the server using: npm run dev');
        console.log('   2. Login to the React frontend with the following credentials:');
        console.log('      - Student: arjun@student.com  / Password123!');
        console.log('      - Warden:  warden@hostel.com / Password123!');
        console.log('      - Guard:   guard@hostel.com  / Password123!');
        console.log('      - Admin:   admin@hostel.com  / Password123!\n');

    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        pool.end();
        console.log('🔌 Database connection closed.\n');
    }
}

main();
