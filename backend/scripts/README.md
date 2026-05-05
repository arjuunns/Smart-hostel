# MongoDB Seeding Scripts

## Overview

This directory contains scripts to populate MongoDB with realistic test data for the Smart Hostel system.

## Available Scripts

### 1. Seed Student Statistics
**File**: `seedStudentStats.js`

Populates the `StudentStats` collection with realistic student performance metrics.

**Features**:
- ✅ Generates realistic attendance percentages (70-98%)
- ✅ Creates leave history with approvals/rejections/flags
- ✅ Calculates reliability scores based on return patterns
- ✅ Generates violation metrics (curfew, unauthorized absences)
- ✅ Computes risk scores using weighted components
- ✅ Creates realistic date ranges and patterns
- ✅ Supports upsert (creates or updates existing records)

**Usage**:

```bash
# Via npm script (recommended)
npm run seed:stats

# Or directly with Node
node scripts/seedStudentStats.js

# From within backend directory
cd backend
npm run seed:stats
```

**What it does**:
1. Connects to MongoDB using `MONGO_URI` from `.env`
2. Fetches all students from the database
3. Generates realistic stats for each student
4. Creates or updates StudentStats records
5. Displays summary with aggregate statistics

**Output Example**:
```
🔗 Connecting to MongoDB...
✅ Connected to MongoDB

📚 Fetching students from database...
✅ Found 25 students

📊 Generating realistic student statistics...

✓ Created stats for Arjun Singh (Block A/201)
✓ Created stats for Priya Sharma (Block B/305)
...

============================================================
📈 SEEDING SUMMARY
============================================================
✅ Created: 25 new student stats records
↻  Updated: 0 existing records
📊 Total: 25 records processed

============================================================
📊 AGGREGATE STATISTICS
============================================================

Risk Distribution:
  LOW: 8 students
    - Avg Attendance: 89.2%
    - Avg Risk Score: 22.5
    - Avg Reliability: 87.3%

  MEDIUM: 12 students
    - Avg Attendance: 78.6%
    - Avg Risk Score: 48.1
    - Avg Reliability: 72.1%

  HIGH: 5 students
    - Avg Attendance: 71.2%
    - Avg Risk Score: 68.9
    - Avg Reliability: 58.4%
```

## Prerequisites

Before running seeding scripts:

1. **Database must be running**:
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

2. **Backend must have students created**:
   - Create at least one student account via the frontend login page, OR
   - Use a separate seeding script to create test users first

3. **.env file must be configured** with:
   ```
   MONGO_URI=mongodb://localhost:27017/smart-hostel
   JWT_SECRET=your_secret
   ```

## Data Generated

### Student Statistics Fields

The script generates realistic data for:

**Attendance Metrics**:
- `totalDays`: 100-150 days
- `presentDays`: Calculated from attendance %
- `attendancePercentage`: 70-98%
- `lateDays`: Derived from absent days

**Leave Metrics**:
- `totalLeavesApplied`: 3-15 applications
- `totalLeavesApproved`: ~85% of applications
- `totalLeavesRejected`: ~5% of applications
- `totalLeavesFlagged`: Remaining flagged
- `totalLeaveDaysTaken`: 10-45 days total

**Reliability Metrics**:
- `onTimeReturns`: ~80% of approved leaves
- `lateReturns`: Remaining with 1-48 hours delay
- `returnReliabilityScore`: 50-100

**Violation Metrics**:
- `curfewViolations`: 0-5 violations
- `unauthorizedAbsences`: 0-3 incidents

**Risk Assessment**:
- `overallRiskScore`: 0-100 (computed)
- `riskCategory`: LOW / MEDIUM / HIGH
- `componentScores`: Individual component risks

## Testing the Data

### 1. Verify Data in Database

```bash
# Using MongoDB shell
mongo

> db.studentstats.find().pretty()

# Or using MongoDB Compass
# Connect to: mongodb://localhost:27017
# Browse "smart-hostel" database → "studentstats" collection
```

### 2. Test Aggregation Endpoints

After seeding, restart your backend and test:

```bash
# Test Risk Distribution Aggregation
curl http://localhost:3000/api/stats/aggregation/risk-distribution \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Leave Statistics
curl http://localhost:3000/api/stats/aggregation/leave-statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Attendance by Hostel
curl http://localhost:3000/api/stats/aggregation/attendance-by-hostel \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Top Reliable Students
curl http://localhost:3000/api/stats/aggregation/top-reliable-students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. View in Frontend

1. Start frontend: `npm run dev` (in frontend directory)
2. Login as Warden
3. Navigate to **📊 MongoDB Analytics** tab
4. Switch between tabs to see different aggregations

## Customization

To modify data generation patterns, edit `seedStudentStats.js`:

```javascript
// Adjust attendance range (currently 70-98%)
const attendancePercentage = Math.floor(Math.random() * (98 - 70) + 70);

// Adjust number of leaves (currently 3-15)
const totalLeavesApplied = Math.floor(Math.random() * (15 - 3) + 3);

// Adjust approval rate (currently 85%)
const totalLeavesApproved = Math.round(totalLeavesApplied * 0.85);

// Adjust on-time return rate (currently 80%)
const onTimeReturns = Math.round(totalLeavesApproved * 0.8);
```

## Troubleshooting

### Error: "No students found in database!"
**Solution**: Create at least one student account first
- Use the frontend signup, OR
- Create test data manually in MongoDB

### Error: "MONGO_URI not set"
**Solution**: Add to `.env` file:
```
MONGO_URI=mongodb://localhost:27017/smart-hostel
```

### Error: "Cannot connect to MongoDB"
**Solution**: 
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB is accessible on localhost:27017

### Data not appearing in frontend
**Solution**:
1. Verify data was created: `db.studentstats.count()`
2. Restart backend server
3. Clear browser cache or use incognito mode
4. Login as Warden (other roles cannot see analytics)
5. Navigate to **📊 MongoDB Analytics** tab

## Advanced Usage

### Reset and Reseed

To completely reset and regenerate all stats:

```bash
# 1. Delete all existing stats
mongo smart-hostel
> db.studentstats.deleteMany({})

# 2. Run seed script
npm run seed:stats
```

### Seed with Custom Data

To create a custom seeding script:

```javascript
const StudentStats = require('../models/StudentStats');

const customStats = {
    studentId: ObjectId('...'),
    attendancePercentage: 95,
    totalLeavesApproved: 5,
    returnReliabilityScore: 98,
    overallRiskScore: 15,
    riskCategory: 'LOW',
    // ... other fields
};

await StudentStats.create(customStats);
```

## Next Steps

After seeding:
1. ✅ Backend data is populated
2. ✅ Aggregation pipelines are working
3. ✅ Frontend analytics are displaying data
4. 📋 Ready for viva evaluation!

## Questions?

If you encounter issues:
- Check MongoDB logs: `tail -f /usr/local/var/log/mongodb/mongo.log`
- Verify `.env` configuration
- Ensure backend is running: `npm run dev`
- Check browser console for API errors
