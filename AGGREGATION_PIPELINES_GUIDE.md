# MongoDB Aggregation Pipelines - Implementation Guide

## Overview
This guide documents the **4 MongoDB aggregation pipelines** added to the Smart Hostel project to demonstrate advanced MongoDB features for your data engineering evaluation.

---

## 1. Risk Distribution Aggregation
**Location:** [backend/services/statsService.js](backend/services/statsService.js) - `getRiskDistributionAggregated()`  
**Route:** `GET /api/stats/aggregation/risk-distribution`

### Pipeline Stages:
```javascript
db.studentstats.aggregate([
    // Stage 1: Match students with calculated risk scores
    { $match: { riskCategory: { $exists: true } } },
    
    // Stage 2: Group by risk category and calculate statistics
    {
        $group: {
            _id: '$riskCategory',
            count: { $sum: 1 },
            avgRiskScore: { $avg: '$overallRiskScore' },
            maxRiskScore: { $max: '$overallRiskScore' },
            minRiskScore: { $min: '$overallRiskScore' }
        }
    },
    
    // Stage 3: Sort results
    { $sort: { _id: -1 } },
    
    // Stage 4: Project final shape
    {
        $project: {
            _id: 0,
            riskCategory: '$_id',
            studentCount: '$count',
            averageRiskScore: { $round: ['$avgRiskScore', 2] },
            maxRiskScore: '$maxRiskScore',
            minRiskScore: '$minRiskScore'
        }
    }
])
```

### MongoDB Features Used:
- **$match** - Filter documents
- **$group** - Group by risk category
- **$sum** - Aggregate count
- **$avg**, **$max**, **$min** - Aggregate functions
- **$sort** - Order results
- **$project** - Reshape output

### Expected Output:
```json
[
  {
    "riskCategory": "HIGH",
    "studentCount": 15,
    "averageRiskScore": 72.5,
    "maxRiskScore": 95,
    "minRiskScore": 61
  },
  {
    "riskCategory": "MEDIUM",
    "studentCount": 42,
    "averageRiskScore": 45.3,
    "maxRiskScore": 60,
    "minRiskScore": 21
  },
  {
    "riskCategory": "LOW",
    "studentCount": 143,
    "averageRiskScore": 12.8,
    "maxRiskScore": 20,
    "minRiskScore": 0
  }
]
```

---

## 2. Leave Statistics Aggregation
**Location:** [backend/services/statsService.js](backend/services/statsService.js) - `getLeaveStatisticsAggregated()`  
**Route:** `GET /api/stats/aggregation/leave-statistics`

### Pipeline Stages:
```javascript
db.leaves.aggregate([
    // Stage 1: Match all leaves
    { $match: {} },
    
    // Stage 2: Group by leave type and status
    {
        $group: {
            _id: {
                leaveType: '$leaveType',
                status: '$status'
            },
            count: { $sum: 1 },
            avgDuration: {
                $avg: {
                    $divide: [
                        { $subtract: ['$toDateTime', '$fromDateTime'] },
                        86400000 // milliseconds in a day
                    ]
                }
            },
            totalDays: {
                $sum: {
                    $divide: [
                        { $subtract: ['$toDateTime', '$fromDateTime'] },
                        86400000
                    ]
                }
            }
        }
    },
    
    // Stage 3: Sort results
    { $sort: { '_id.leaveType': 1, '_id.status': 1 } },
    
    // Stage 4: Project clean output
    {
        $project: {
            _id: 0,
            leaveType: '$_id.leaveType',
            status: '$_id.status',
            totalRequests: '$count',
            averageDurationDays: { $round: ['$avgDuration', 1] },
            totalDaysCovered: { $round: ['$totalDays', 1] }
        }
    }
])
```

### MongoDB Features Used:
- **$group** - Group by multiple fields
- **$divide** - Arithmetic operation
- **$subtract** - Date arithmetic
- **$round** - Rounding computed values
- **$project** - Field reshaping

### Expected Output:
```json
[
  {
    "leaveType": "EMERGENCY",
    "status": "APPROVED",
    "totalRequests": 8,
    "averageDurationDays": 1.5,
    "totalDaysCovered": 12
  },
  {
    "leaveType": "REGULAR",
    "status": "APPROVED",
    "totalRequests": 125,
    "averageDurationDays": 3.2,
    "totalDaysCovered": 400
  },
  {
    "leaveType": "REGULAR",
    "status": "PENDING",
    "totalRequests": 22,
    "averageDurationDays": 2.8,
    "totalDaysCovered": 61.6
  }
]
```

---

## 3. Attendance Summary by Hostel Aggregation
**Location:** [backend/services/statsService.js](backend/services/statsService.js) - `getAttendanceSummaryByHostelAggregated()`  
**Route:** `GET /api/stats/aggregation/attendance-by-hostel`

### Pipeline Stages:
```javascript
db.studentstats.aggregate([
    // Stage 1: Lookup user details (JOIN operation)
    {
        $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'studentDetails'
        }
    },
    
    // Stage 2: Unwind the array created by $lookup
    { $unwind: { path: '$studentDetails', preserveNullAndEmptyArrays: true } },
    
    // Stage 3: Filter for students with hostel info
    { $match: { 'studentDetails.hostelBlock': { $exists: true, $ne: null } } },
    
    // Stage 4: Group by hostel with conditional counting
    {
        $group: {
            _id: '$studentDetails.hostelBlock',
            totalStudents: { $sum: 1 },
            avgAttendance: { $avg: '$attendancePercentage' },
            avgRiskScore: { $avg: '$overallRiskScore' },
            highRiskStudents: {
                $sum: {
                    $cond: [{ $gt: ['$overallRiskScore', 60] }, 1, 0]
                }
            },
            mediumRiskStudents: {
                $sum: {
                    $cond: [{ $and: [{ $gte: ['$overallRiskScore', 30] }, { $lte: ['$overallRiskScore', 60] }] }, 1, 0]
                }
            },
            lowRiskStudents: {
                $sum: {
                    $cond: [{ $lt: ['$overallRiskScore', 30] }, 1, 0]
                }
            }
        }
    },
    
    // Stage 5: Sort by hostel name
    { $sort: { _id: 1 } },
    
    // Stage 6: Project clean output
    {
        $project: {
            _id: 0,
            hostelBlock: '$_id',
            totalStudents: 1,
            averageAttendancePercentage: { $round: ['$avgAttendance', 2] },
            averageRiskScore: { $round: ['$avgRiskScore', 2] },
            highRiskStudents: 1,
            mediumRiskStudents: 1,
            lowRiskStudents: 1
        }
    }
])
```

### MongoDB Features Used:
- **$lookup** - JOIN another collection
- **$unwind** - Flatten array
- **$cond** - Conditional logic
- **$gt**, **$gte**, **$lte**, **$lt** - Comparison operators
- **$and** - Logical AND
- **$round** - Number rounding

### Expected Output:
```json
[
  {
    "hostelBlock": "Block A",
    "totalStudents": 120,
    "averageAttendancePercentage": 85.5,
    "averageRiskScore": 42.3,
    "highRiskStudents": 8,
    "mediumRiskStudents": 35,
    "lowRiskStudents": 77
  },
  {
    "hostelBlock": "Block B",
    "totalStudents": 95,
    "averageAttendancePercentage": 82.1,
    "averageRiskScore": 38.7,
    "highRiskStudents": 5,
    "mediumRiskStudents": 28,
    "lowRiskStudents": 62
  }
]
```

---

## 4. Top Reliable Students Aggregation
**Location:** [backend/services/statsService.js](backend/services/statsService.js) - `getTopReliableStudentsAggregated()`  
**Route:** `GET /api/stats/aggregation/top-reliable-students?limit=10`

### Pipeline Stages:
```javascript
db.studentstats.aggregate([
    // Stage 1: Lookup student details
    {
        $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
        }
    },
    
    // Stage 2: Unwind the array
    { $unwind: '$student' },
    
    // Stage 3: Filter students with approved leaves
    { $match: { totalLeavesApproved: { $gt: 0 } } },
    
    // Stage 4: Sort by reliability (descending)
    { $sort: { returnReliabilityScore: -1, attendancePercentage: -1 } },
    
    // Stage 5: Limit to top 10
    { $limit: 10 },
    
    // Stage 6: Project clean output
    {
        $project: {
            _id: 0,
            studentName: '$student.name',
            studentId: '$studentId',
            hostelBlock: '$student.hostelBlock',
            returnReliabilityScore: 1,
            attendancePercentage: 1,
            totalLeavesApproved: 1,
            lateReturns: 1,
            totalLateReturnHours: 1
        }
    }
])
```

### MongoDB Features Used:
- **$lookup** - JOIN operation
- **$match** - Filtering
- **$sort** - Sorting
- **$limit** - Limit results
- **$project** - Field selection

### Expected Output:
```json
[
  {
    "studentName": "Ravi Kumar",
    "studentId": "60d5f3a1b2c1d4e5f6g7h8i9",
    "hostelBlock": "Block A",
    "returnReliabilityScore": 100,
    "attendancePercentage": 98,
    "totalLeavesApproved": 5,
    "lateReturns": 0,
    "totalLateReturnHours": 0
  },
  {
    "studentName": "Priya Sharma",
    "studentId": "60d5f3a1b2c1d4e5f6g7h8i10",
    "hostelBlock": "Block C",
    "returnReliabilityScore": 100,
    "attendancePercentage": 95,
    "totalLeavesApproved": 8,
    "lateReturns": 0,
    "totalLateReturnHours": 0
  }
]
```

---

## How to Test These Routes

### Using Postman or curl:

```bash
# 1. Risk Distribution
curl -X GET http://localhost:5000/api/stats/aggregation/risk-distribution \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Leave Statistics
curl -X GET http://localhost:5000/api/stats/aggregation/leave-statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Attendance by Hostel
curl -X GET http://localhost:5000/api/stats/aggregation/attendance-by-hostel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Top Reliable Students (with limit parameter)
curl -X GET "http://localhost:5000/api/stats/aggregation/top-reliable-students?limit=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### In Browser (if logged in as warden/admin):
```
http://localhost:5000/api/stats/aggregation/risk-distribution
http://localhost:5000/api/stats/aggregation/leave-statistics
http://localhost:5000/api/stats/aggregation/attendance-by-hostel
http://localhost:5000/api/stats/aggregation/top-reliable-students
```

---

## MongoDB Aggregation Pipeline Concepts Used

| Concept | Where Used | Purpose |
|---------|-----------|---------|
| **$match** | All pipelines | Filter documents |
| **$group** | All except #4 | Aggregate data by categories |
| **$lookup** | #3, #4 | Join collections (SQL equivalent) |
| **$unwind** | #3, #4 | Flatten arrays from $lookup |
| **$sort** | All pipelines | Order results |
| **$limit** | #4 | Limit number of results |
| **$project** | All pipelines | Reshape output fields |
| **$sum** | #1, #2, #3 | Count and sum values |
| **$avg**, **$max**, **$min** | #1, #2, #3 | Aggregate statistics |
| **$divide**, **$subtract** | #2 | Arithmetic operations |
| **$cond** | #3 | Conditional logic |
| **$round** | #2, #3 | Round numbers |
| **Comparison operators** | #2, #3 | $gt, $gte, $lte, $lt |
| **Logical operators** | #3 | $and |

---

## For Your Viva Presentation

When the teacher asks about aggregation pipelines, you can say:

> "I have implemented **4 MongoDB aggregation pipelines** in my Smart Hostel project:
> 
> 1. **Risk Distribution Pipeline** - Groups students by risk category and calculates average/max/min risk scores using `$group`, `$avg`, `$max`, `$sum` operators
> 
> 2. **Leave Statistics Pipeline** - Aggregates leave data by type and status, computes average duration and total days using `$group` with arithmetic operations (`$divide`, `$subtract`)
> 
> 3. **Attendance by Hostel Pipeline** - Uses `$lookup` to join StudentStats with Users collection, then groups by hostel block with conditional counting using `$cond` operator
> 
> 4. **Top Reliable Students Pipeline** - Demonstrates `$lookup`, `$sort`, `$limit`, and `$project` to create a leaderboard of most reliable students
> 
> All pipelines are accessible via REST API endpoints at `/api/stats/aggregation/*` and include proper role-based authorization for wardens and admins only."

---

## Code Files Modified

1. **[backend/services/statsService.js](backend/services/statsService.js)**
   - Added 4 new aggregation methods:
     - `getRiskDistributionAggregated()`
     - `getLeaveStatisticsAggregated()`
     - `getAttendanceSummaryByHostelAggregated()`
     - `getTopReliableStudentsAggregated()`

2. **[backend/routes/stats.js](backend/routes/stats.js)**
   - Added 4 new routes:
     - `GET /api/stats/aggregation/risk-distribution`
     - `GET /api/stats/aggregation/leave-statistics`
     - `GET /api/stats/aggregation/attendance-by-hostel`
     - `GET /api/stats/aggregation/top-reliable-students`

---

## Key Points for Teacher

✅ **Demonstrates MongoDB Aggregation Framework knowledge**
- Uses all major aggregation stages
- Combines multiple stages in practical ways
- Shows understanding of data aggregation and transformation

✅ **Real-world Use Cases**
- Risk distribution for hostel management
- Leave statistics for policy analysis
- Hostel-based attendance tracking
- Student leaderboard for gamification

✅ **Performance Optimization**
- Processing done in MongoDB, not application layer
- Reduced data transfer over network
- Efficient grouping and filtering

---
