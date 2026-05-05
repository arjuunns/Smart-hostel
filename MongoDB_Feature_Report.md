# MongoDB Feature Report for Data Engineering Evaluation

## Project Overview
This Smart Hostel project uses MongoDB through Mongoose in the backend to manage users, attendance, leave applications, gate logs, academic calendar rules, audit logs, and student risk statistics. The code shows practical document modeling, relational references, indexed queries, filtered reads, update workflows, and report generation.

## 1. CRUD Operations

### Create
The project creates new documents in several places:
- Leave applications are created in [backend/routes/leaves.js](backend/routes/leaves.js) when a student submits a leave request.
- Attendance records are created or updated in [backend/routes/attendance.js](backend/routes/attendance.js) using upsert logic.
- Audit logs are created in [backend/routes/leaves.js](backend/routes/leaves.js) after a leave decision.
- Student statistics records are initialized in [backend/services/statsService.js](backend/services/statsService.js).

### Read
The project uses multiple MongoDB read operations:
- Leave records are fetched in [backend/routes/leaves.js](backend/routes/leaves.js), [backend/routes/reports.js](backend/routes/reports.js), and [backend/routes/gate.js](backend/routes/gate.js).
- Attendance records are fetched in [backend/routes/attendance.js](backend/routes/attendance.js) and [backend/routes/reports.js](backend/routes/reports.js).
- Student statistics are read in [backend/routes/stats.js](backend/routes/stats.js) and [backend/services/statsService.js](backend/services/statsService.js).
- User records are read in [backend/middleware/auth.js](backend/middleware/auth.js) and [backend/routes/attendance.js](backend/routes/attendance.js).

### Update
Update behavior is used throughout the project:
- Leave approval and rejection updates existing leave documents in [backend/routes/leaves.js](backend/routes/leaves.js).
- Attendance marking uses findOneAndUpdate with upsert in [backend/routes/attendance.js](backend/routes/attendance.js).
- Student stats are recalculated and updated in [backend/services/statsService.js](backend/services/statsService.js).

### Delete
No explicit delete endpoint or delete query is visible in the current backend code. If your evaluator asks about delete, you should say the project currently does not expose a delete workflow.

## 2. Embedded Documents and Nested Documents

The project models nested fields inside documents, which is a strong MongoDB document-modeling feature:
- [backend/models/Leave.js](backend/models/Leave.js) includes predictionFactors as a nested object.
- [backend/models/StudentStats.js](backend/models/StudentStats.js) includes componentScores as a nested object.
- [backend/models/AuditLog.js](backend/models/AuditLog.js) uses a flexible details field for structured payloads.
- [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js) stores structured calendar metadata and policy information inside one document.

This is useful to explain as embedded-document design because related data is kept inside one MongoDB document instead of forcing separate tables.

## 3. Arrays in MongoDB

Arrays are used in the academic calendar model:
- affectsHostels in [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)
- affectsCourses in [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)
- affectsYears in [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)

These arrays allow one calendar event to apply to multiple hostels, courses, or year groups.

## 4. Update Operators and Update Style

The project uses update-style MongoDB operations, mainly through Mongoose update methods:
- findOneAndUpdate is used in [backend/routes/attendance.js](backend/routes/attendance.js)
- findOneAndUpdate is used in [backend/services/statsService.js](backend/services/statsService.js)
- findOneAndUpdate is used in [backend/routes/leaves.js](backend/routes/leaves.js)

Direct operator-heavy updates such as $inc, $push, or $pull are not clearly present in the codebase. So the correct statement for an evaluation is that the project uses update methods and upsert-based writes, but not many explicit MongoDB update operators.

## 5. Aggregation

No native MongoDB aggregation pipeline call using .aggregate() was found in the backend.

However, the project does perform aggregation-like processing in application code:
- [backend/services/statsService.js](backend/services/statsService.js) calculates attendance, leave, and risk summaries from multiple documents.
- [backend/routes/reports.js](backend/routes/reports.js) builds report summaries from queried documents.
- [backend/routes/stats.js](backend/routes/stats.js) computes leaderboard and risk summary output.

If the evaluator expects a formal MongoDB aggregation pipeline, this is the one area where the project is currently weak.

## 6. Indexing

The project uses indexes in multiple schemas for performance and uniqueness:
- [backend/models/Attendance.js](backend/models/Attendance.js) defines a unique compound index on studentId and date, plus an index on curfewViolation and date.
- [backend/models/Leave.js](backend/models/Leave.js) defines indexes on studentId and createdAt, status, and riskCategory.
- [backend/models/StudentStats.js](backend/models/StudentStats.js) defines indexes on overallRiskScore, riskCategory, and attendancePercentage.
- [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js) defines indexes on date ranges, eventType, and active events.

This is one of the strongest parts of the project for your evaluation because it shows both query optimization and schema design.

## 7. Projection and Field Selection

The project uses projection to return only required fields:
- [backend/middleware/auth.js](backend/middleware/auth.js) excludes passwordHash from the authenticated user object.
- [backend/routes/attendance.js](backend/routes/attendance.js) selects only name, email, hostelBlock, and roomNo for student lists.
- [backend/routes/stats.js](backend/routes/stats.js) selects only the fields needed for leaderboard output.
- [backend/routes/reports.js](backend/routes/reports.js) populates only selected fields before generating reports.

## 8. References and Populate

The backend uses MongoDB references with Mongoose populate:
- studentId in Attendance, Leave, GateLog, and StudentStats references the User collection.
- approvedBy in Leave references the User collection.
- performedBy in GateLog and AuditLog references the User collection.
- leaveId in GateLog references the Leave collection.

Populate is used heavily in:
- [backend/routes/leaves.js](backend/routes/leaves.js)
- [backend/routes/attendance.js](backend/routes/attendance.js)
- [backend/routes/reports.js](backend/routes/reports.js)
- [backend/routes/gate.js](backend/routes/gate.js)

This is the main evidence that the project uses relational-style linking inside MongoDB documents.

## 9. Query Operators

The project uses several MongoDB query operators in filters:
- $in in [backend/routes/leaves.js](backend/routes/leaves.js) and [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)
- $gte and $lte in [backend/routes/attendance.js](backend/routes/attendance.js), [backend/routes/reports.js](backend/routes/reports.js), and [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)
- $lt in [backend/routes/leaves.js](backend/routes/leaves.js)
- $or in [backend/models/AcademicCalendar.js](backend/models/AcademicCalendar.js)

These operators help filter by date ranges, status groups, and overlapping events.

## 10. Sharding

No sharding configuration or sharding-related setup is present in the codebase.

For your evaluation, say that the project is designed for a standard MongoDB deployment and does not currently demonstrate sharding.

## 11. Best Evaluation Summary

If you need a short spoken summary, use this:

The project uses MongoDB for CRUD operations, embedded documents, arrays, indexing, projection, populate-based references, and query filtering. It also performs report-style data processing in services and routes. The only major MongoDB syllabus item not clearly implemented is native aggregation pipelines, and sharding is not used.

## 12. Recommended Slide or Viva Order

1. Explain the document models: User, Leave, Attendance, GateLog, AcademicCalendar, StudentStats, AuditLog.
2. Show CRUD flows: leave apply, attendance mark, leave approval, report generation.
3. Show schema design: embedded objects, arrays, references, indexes.
4. Show query optimization: projection, populate, filter operators.
5. Mention limits honestly: no .aggregate() pipeline and no sharding.
