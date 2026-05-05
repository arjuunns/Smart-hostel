# Detailed MongoDB Functionality Mapping Report

## Purpose
This report maps each major functionality in the Smart Hostel project to the MongoDB features, Mongoose methods, schema patterns, and query operators used in that functionality.

Use this as a viva or evaluation guide when asked:
- What MongoDB feature did you use here?
- Which method did you use?
- Why was MongoDB a good fit?

## 1. Authentication and User Management

### Functionality
- Register new user
- Login user
- Load current logged-in user
- Protect routes by token and role

### Code Areas
- [backend/routes/auth.js](backend/routes/auth.js)
- [backend/middleware/auth.js](backend/middleware/auth.js)
- [backend/models/User.js](backend/models/User.js)

### MongoDB Features Used
- CRUD create: `User.create()` during registration.
- CRUD read: `User.findOne({ email })` during login and duplicate check.
- CRUD read: `User.findById(decoded.id)` in auth middleware.
- Projection: `.select('-passwordHash')` to exclude sensitive data.
- Schema validation: required fields, enum for role, trimming, unique email.
- Pre-save hook: password hashing before document save.
- Instance method: `comparePassword()` for password verification.
- Custom serialization: `toJSON()` removes `passwordHash` from output.

### Viva Answer
This functionality uses basic CRUD, field projection, schema validation, and Mongoose lifecycle hooks. The main MongoDB method pattern is `findOne`, `findById`, and `create`.

## 2. Leave Application

### Functionality
- Student applies for leave
- Leave is stored with ML-related metadata
- Leave gets auto-approved, flagged, or pending
- Gate pass is generated after approval

### Code Areas
- [backend/routes/leaves.js](backend/routes/leaves.js)
- [backend/models/Leave.js](backend/models/Leave.js)
- [backend/services/mlPredictionService.js](backend/services/mlPredictionService.js)
- [backend/services/statsService.js](backend/services/statsService.js)

### MongoDB Features Used
- CRUD create: `Leave.create()` when a student applies.
- Embedded/nested document: `predictionFactors` inside the leave document.
- Reference: `studentId` and `approvedBy` point to `User` documents.
- Update method: `leave.save()` after generating gate pass or changing status.
- Query filters: status checks with `$in`, date validation, and `findOne`/`findById`.
- Indexes: `studentId + createdAt`, `status`, `riskCategory`.
- Field storage for ML: `riskScore`, `riskCategory`, `aiDecision`, `aiDecisionReason`, `returnedOnTime`, `lateReturnHours`.

### Viva Answer
This functionality shows document modeling, embedded fields, references, indexing, and create/update operations in MongoDB.

## 3. Leave History and Leave Review

### Functionality
- Student sees own leaves
- Warden sees pending, flagged, auto-approved, emergency, and all leaves
- Single leave can be loaded by ID

### Code Areas
- [backend/routes/leaves.js](backend/routes/leaves.js)
- [backend/routes/reports.js](backend/routes/reports.js)

### MongoDB Features Used
- CRUD read: `Leave.find({ studentId: req.user._id })` for student history.
- CRUD read: `Leave.find({ status: { $in: ['PENDING', 'FLAGGED'] } })` for review queues.
- CRUD read: `Leave.findById(req.params.id)` for single leave.
- Sorting: `.sort({ createdAt: -1 })` and `.sort({ riskScore: -1, createdAt: -1 })`.
- Populate: `studentId`, `approvedBy`.
- Filtering: `$in`, exact match, and dynamic filter objects.

### Viva Answer
This part mainly uses read queries with filtering, sorting, and populate to show related student and approval data.

## 4. Leave Approval and Rejection

### Functionality
- Warden approves or rejects leave
- Gate pass is created on approval
- Attendance is automatically marked as on leave
- Audit log is created for traceability

### Code Areas
- [backend/routes/leaves.js](backend/routes/leaves.js)
- [backend/models/AuditLog.js](backend/models/AuditLog.js)
- [backend/models/Attendance.js](backend/models/Attendance.js)

### MongoDB Features Used
- Update: document field mutation followed by `save()`.
- Upsert update: `Attendance.findOneAndUpdate(..., { upsert: true, new: true })`.
- Embedded write: leave decision metadata such as `approvedBy`, `approvedAt`, `remarks`.
- CRUD create: `AuditLog.create()`.
- Reference population: leave fetch populates `studentId`.

### Viva Answer
This feature demonstrates document updates, upsert-based writes, and audit logging using separate collections.

## 5. Gate Pass and QR Workflow

### Functionality
- Student exits hostel using gate pass ID
- Student re-enters hostel
- Guard sees out-students list
- Force return can be done by warden/admin
- Gate logs are stored

### Code Areas
- [backend/routes/gate.js](backend/routes/gate.js)
- [backend/models/GateLog.js](backend/models/GateLog.js)
- [backend/models/Leave.js](backend/models/Leave.js)

### MongoDB Features Used
- CRUD read: `Leave.findOne({ gatePassId })` to verify a gate pass.
- CRUD create: `GateLog.create(...)` for exit/entry events.
- CRUD update: `leave.currentStatus = 'OUT'` / `'IN'` followed by `save()`.
- Reference: `leaveId`, `studentId`, `performedBy` fields.
- Populate: `studentId` and `performedBy` in gate log reads.
- Date filtering: `$gte` and `$lte` in gate log queries.
- Sorting and limiting: `.sort({ timestamp: -1 }).limit(100)`.

### Viva Answer
This functionality uses a mix of read, create, update, references, populate, and date-range filtering.

## 6. Attendance Marking

### Functionality
- Warden marks attendance for one student
- Warden bulk-marks attendance
- Student sees attendance history
- Attendance is auto-marked on approved leave dates

### Code Areas
- [backend/routes/attendance.js](backend/routes/attendance.js)
- [backend/models/Attendance.js](backend/models/Attendance.js)
- [backend/routes/leaves.js](backend/routes/leaves.js)

### MongoDB Features Used
- CRUD create/update: `Attendance.findOneAndUpdate(..., { upsert: true, new: true })`.
- Query validation: `User.findOne({ _id: studentId, role: 'student' })`.
- Date filtering: `date: { $gte: ..., $lte: ... }`.
- Populate: `markedBy`.
- Compound unique index: `studentId + date`.
- Additional index: `curfewViolation + date`.

### Viva Answer
Attendance shows one of the strongest MongoDB patterns in the project: upsert, compound unique indexing, and date filtering.

## 7. Student Statistics and Risk Scoring

### Functionality
- Generate student statistics
- Calculate overall risk score
- Return leaderboard and risk distribution
- Find high-risk students
- Refresh all stats

### Code Areas
- [backend/routes/stats.js](backend/routes/stats.js)
- [backend/services/statsService.js](backend/services/statsService.js)
- [backend/models/StudentStats.js](backend/models/StudentStats.js)

### MongoDB Features Used
- CRUD create: `StudentStats.create({ studentId })` for initialization.
- CRUD read: `StudentStats.findOne({ studentId })` for reading stats.
- CRUD update: `StudentStats.findOneAndUpdate(...)` for metric refresh.
- Aggregation-like counting: `countDocuments()` for risk distribution.
- Distinct values: `Leave.distinct('studentId')` for batch refresh.
- Populate: `studentId` in leaderboard/high-risk student lists.
- Sorting and limit: `.sort({ overallRiskScore: -1 })`, `.limit(limit)`.
- Nested object: `componentScores`.
- Indexes: `overallRiskScore`, `riskCategory`, `attendancePercentage`.

### Viva Answer
This module is a strong example of MongoDB-driven analytics using reads, updates, counts, distinct values, nested fields, and ranking queries.

## 8. Academic Calendar Management

### Functionality
- View current restrictions
- View upcoming events and restrictions
- Analyze leave dates against calendar
- Suggest better leave dates
- Create, update, delete, seed, and toggle calendar events

### Code Areas
- [backend/routes/calendar.js](backend/routes/calendar.js)
- [backend/services/calendarService.js](backend/services/calendarService.js)
- [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)

### MongoDB Features Used
- CRUD create: `AcademicCalendar.create()` via service.
- CRUD read: `AcademicCalendar.find(...)` in multiple queries.
- CRUD update: `AcademicCalendar.findByIdAndUpdate(...)`.
- CRUD delete: `AcademicCalendar.findByIdAndDelete(...)`.
- Query operators: `$or`, `$in`, `$gte`, `$lte` for overlap and restriction logic.
- Arrays: `affectsHostels`, `affectsCourses`, `affectsYears`.
- Static methods: `getEventsInRange()`, `getCurrentRestrictions()`.
- Virtual field: `isCurrentlyActive`.
- Indexes: `startDate + endDate`, `eventType`, `isActive + startDate`.
- Populate: `createdBy`.

### Viva Answer
This module demonstrates advanced MongoDB document design, query operators, arrays, indexes, static methods, virtuals, and CRUD on calendar events.

## 9. ML Prediction and Explainability

### Functionality
- Predict leave approval risk
- Predict existing leave risk
- Predict batch pending leaves
- Detect leave patterns
- Show ML dashboard information

### Code Areas
- [backend/routes/ml.js](backend/routes/ml.js)
- [backend/services/mlPredictionService.js](backend/services/mlPredictionService.js)
- [backend/models/Leave.js](backend/models/Leave.js)
- [backend/models/StudentStats.js](backend/models/StudentStats.js)

### MongoDB Features Used
- Read queries: `Leave.find(...)`, `Leave.findById(...)`, `StudentStats.findOne(...)`.
- Range filtering: `createdAt: { $gte: ... }`.
- Populate: `leave.studentId` for associated student data.
- Batch processing: iterate over pending leaves queried from MongoDB.
- Count queries: `countDocuments()` for dashboard metrics.
- Nested objects in output: prediction factor breakdowns and component scores.

### Viva Answer
This feature uses MongoDB as the data source for ML-style scoring, pattern detection, and dashboard statistics. The ML logic lives in services, but the data comes from MongoDB queries and populated references.

## 10. Reports and CSV Export

### Functionality
- Leave report
- Attendance report
- Gate logs report
- Audit logs report
- CSV export

### Code Areas
- [backend/routes/reports.js](backend/routes/reports.js)

### MongoDB Features Used
- Read queries with filters and date ranges.
- Populate related data before export.
- Sorting by timestamp or date.
- Query operator usage: `$gte`, `$lte`, exact match.
- Count-like summary creation from fetched documents.
- Optional `format=csv` output after query execution.

### Viva Answer
The report module is mostly MongoDB read/query logic plus application-side summarization and CSV formatting.

## 11. Role-Based Access Control

### Functionality
- Student, warden, guard, admin permissions
- Restrict route access by role

### Code Areas
- [backend/middleware/auth.js](backend/middleware/auth.js)
- [backend/routes/auth.js](backend/routes/auth.js)

### MongoDB Features Used
- Read current user from MongoDB using `findById`.
- Projection to hide password hash.
- User role stored as enum in schema.
- Access control depends on persisted MongoDB user document.

### Viva Answer
Role-based access is powered by a MongoDB user schema with role values and a protected middleware lookup.

## 12. Summary of MongoDB Features Used in the Project

### CRUD
- Create: `create()`
- Read: `find()`, `findOne()`, `findById()`, `findByIdAndUpdate()`, `findByIdAndDelete()`
- Update: `save()`, `findOneAndUpdate()`, `findByIdAndUpdate()`
- Delete: `findByIdAndDelete()`

### Schema Design
- Embedded/nested objects
- Arrays
- References with `ref`
- Enums
- Required fields
- Unique fields
- Virtuals
- Statics
- Methods
- Pre-save hooks

### Query Features
- `$in`
- `$or`
- `$gte`
- `$lte`
- Exact match filtering
- Sorting
- Limiting
- Distinct
- Count documents

### Performance Features
- Compound indexes
- Unique indexes
- Indexed filtering fields
- Projection with `.select()`
- Populate to fetch referenced documents

## 13. What Is Not Clearly Used

These are not clearly demonstrated in the current backend code:
- Native MongoDB aggregation pipeline using `.aggregate()`
- Sharding configuration
- Transactions / multi-document sessions

If asked directly, answer honestly that the project currently emphasizes document modeling, query filtering, indexing, populate, upserts, and service-level aggregation-like computation rather than native aggregation pipelines or sharding.

## 14. Short Viva Script

If the teacher points to any functionality, you can answer like this:

### Example 1: Leave application
We used `Leave.create()`, nested fields like `predictionFactors`, references to `studentId`, and indexes on `studentId`, `status`, and `riskCategory`.

### Example 2: Attendance marking
We used `findOneAndUpdate()` with upsert, a compound unique index on `studentId` and `date`, and date filtering with `$gte` and `$lte`.

### Example 3: Gate entry/exit
We used `Leave.findOne({ gatePassId })`, `GateLog.create()`, `populate()`, and status updates with `save()`.

### Example 4: Reports
We used `find()`, `populate()`, sorting, filtering, and application-side summarization to generate reports and CSV output.

### Example 5: Calendar
We used arrays, static methods, indexes, query operators, and CRUD on calendar events to analyze leave conflicts.
