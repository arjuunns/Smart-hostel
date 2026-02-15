# ✅ Project TODO (Step-by-step with testing after each feature)

## Phase 0 — Setup (DO FIRST)
### ✅ Task 0.1: Initialize Backend Project
- Create Node + Express server
- Install dependencies: express, mongoose, dotenv, cors, bcrypt, jsonwebtoken
- Setup MongoDB connection
✅ Test:
- Server runs on http://localhost:5000
- MongoDB connects successfully

### ✅ Task 0.2: Initialize Frontend Project
- Create frontend folder with:
  - index.html
  - style.css
  - app.js
✅ Test:
- frontend files load in browser without errors

---

## Phase 1 — Authentication & Roles
### ✅ Task 1.1: User Model + Role System
- Create User schema:
  name, email, passwordHash, role (student/warden/guard/admin), hostelBlock, roomNo
✅ Test:
- Can create user in DB via API

### ✅ Task 1.2: Register API
- POST /api/auth/register
✅ Test:
- New user saved with encrypted password

### ✅ Task 1.3: Login API (JWT)
- POST /api/auth/login
✅ Test:
- returns JWT token
- rejects invalid password

### ✅ Task 1.4: Frontend Login/Register
- Basic login UI
- Store JWT in localStorage
✅ Test:
- user can login and token is stored

---

## Phase 2 — Leave Requests (Student)
### ✅ Task 2.1: Leave Model
Fields:
- studentId
- leaveType
- fromDateTime
- toDateTime
- reason
- status (PENDING/APPROVED/REJECTED)
- approvedBy
- approvedAt
- remarks
- gatePassId (generated after approval)
✅ Test:
- leave saves correctly

### ✅ Task 2.2: Apply Leave API
- POST /api/leaves/apply
✅ Test:
- student creates leave request successfully

### ✅ Task 2.3: Student Leave History API
- GET /api/leaves/mine
✅ Test:
- student sees only own leaves

### ✅ Task 2.4: Student Dashboard UI
- Apply leave form
- Show leave list + status
✅ Test:
- frontend shows live leave requests

---

## Phase 3 — Warden Approval + Audit Logs
### ✅ Task 3.1: Warden View Pending Leaves
- GET /api/leaves/pending
✅ Test:
- only wardens/admin can access

### ✅ Task 3.2: Approve/Reject Leave API
- PATCH /api/leaves/:id/decision
Body:
- action: APPROVE/REJECT
- remarks
✅ Test:
- leave status updates
- approvedBy + approvedAt filled

### ✅ Task 3.3: Audit Logs Model + Logging
- Store: action, performedBy, targetType, targetId, timestamp
✅ Test:
- approve/reject creates audit log entry

### ✅ Task 3.4: Warden Dashboard UI
- List leaves
- Approve/Reject buttons
✅ Test:
- UI updates status after action

---

## Phase 4 — Gate Pass + QR System
### ✅ Task 4.1: Generate Gate Pass on Approval
- When approved -> generate gatePassId automatically
✅ Test:
- approved leave contains gatePassId

### ✅ Task 4.2: GateLogs Model
Fields:
- studentId
- leaveId
- gatePassId
- action (EXIT/ENTRY)
- timestamp
- performedBy (guardId)
✅ Test:
- log entry stored correctly

### ✅ Task 4.3: Guard Exit Scan API
- POST /api/gate/exit
Body: { gatePassId }
✅ Test:
- creates EXIT log
- prevents duplicate EXIT

### ✅ Task 4.4: Guard Entry Scan API
- POST /api/gate/entry
Body: { gatePassId }
✅ Test:
- creates ENTRY log
- prevents ENTRY without EXIT

### ✅ Task 4.5: Out-of-Hostel Live List API
- GET /api/gate/out
✅ Test:
- shows students currently OUT

### ✅ Task 4.6: Frontend QR Display + Guard Scan Page
- Student sees QR once leave approved
- Guard enters gatePassId manually (MVP scan)
✅ Test:
- exit + entry workflow works end-to-end

---

## Phase 5 — Attendance System
### ✅ Task 5.1: Attendance Model
Fields:
- studentId
- date
- status (PRESENT/ABSENT/ON_LEAVE)
- markedBy
- createdAt
✅ Test:
- attendance saves correctly

### ✅ Task 5.2: Auto Mark ON_LEAVE
- If approved leave covers date -> attendance becomes ON_LEAVE
✅ Test:
- leave approval updates attendance correctly

### ✅ Task 5.3: Manual Attendance Marking API
- POST /api/attendance/mark
✅ Test:
- warden marks present/absent

### ✅ Task 5.4: Attendance History API
- GET /api/attendance/mine (student)
- GET /api/attendance/all (warden/admin)
✅ Test:
- correct role-based access

### ✅ Task 5.5: Attendance UI
- Warden can mark attendance
- Student can view attendance
✅ Test:
- UI displays latest attendance

---

## Phase 6 — Special Cases
### ✅ Task 6.1: Emergency Leave Flag
- Add leaveType=EMERGENCY
- Fast filter for wardens
✅ Test:
- emergency leaves appear separately

### ✅ Task 6.2: Overstay Alert API
- GET /api/leaves/overstay
Criteria:
- currentTime > toDateTime AND student is still OUT
✅ Test:
- shows overstayed students correctly

### ✅ Task 6.3: Force Mark Returned API
- PATCH /api/gate/force-return/:leaveId
✅ Test:
- marks student as returned + creates audit log

---

## Phase 7 — Reports & Export (MVP)
### ✅ Task 7.1: Leave Report API
- GET /api/reports/leaves?from=&to=
✅ Test:
- returns aggregated leave report

### ✅ Task 7.2: Attendance Report API
- GET /api/reports/attendance?date=
✅ Test:
- returns summary counts

### ✅ Task 7.3: Export as CSV (MVP)
- return CSV headers
✅ Test:
- CSV downloads correctly

---

## Phase 8 — Notifications & Reminders (Mocked)
### ✅ Task 8.1: Parent Notification Mock
- On approve + exit + entry -> console.log notification
✅ Test:
- logs trigger correctly

### ✅ Task 8.2: Reminder Scheduler (Optional MVP)
- simple cron job
✅ Test:
- alerts for return deadline

---

## Completion ✅
✅ Final End-to-End Test Checklist
- Student registers + logs in
- Applies leave
- Warden approves
- Student sees QR
- Guard scans exit
- Guard scans entry
- Attendance marks ON_LEAVE automatically
- Live out list works
- Reports generate correctly

---

## Phase 9 — AI/ML Smart Leave Approval System ✅

### ✅ Module 1: Data Collection & Storage Infrastructure
- Enhanced Leave model with ML fields (riskScore, riskCategory, predictionFactors, aiDecision, aiDecisionReason, returnedOnTime, lateReturnHours)
- Enhanced Attendance model with tracking fields (checkInTime, checkOutTime, curfewViolation, violationMinutes)
- Created StudentStats model for aggregated ML features (attendance %, reliability score, leave metrics, violation counts, pattern metrics)
- Created StatsService with risk calculation and weighted scoring
- Created stats API routes (/api/stats/my-stats, /my-risk, /student/:id, /high-risk, /distribution)
✅ Test:
- Student stats aggregate correctly
- Risk scores calculate from historical data

### ✅ Module 2: Academic Calendar Integration
- Created AcademicCalendar model (events, policies, affected leave types, risk modifiers)
- Created CalendarService with analyzeLeaveDates, getCalendarScore, suggestLeaveDates
- Created calendar API routes (/api/calendar/current-restrictions, /analyze-dates, /suggest-dates, /all, /event)
✅ Test:
- Calendar events affect leave risk scoring
- Blocked dates prevent leave applications

### ✅ Module 3: ML Prediction Model
- Created MLPredictionService with feature extraction and risk scoring
- Weight distribution: Attendance (18%), Reliability (15%), Violations (12%), Calendar (15%), Exam Proximity (10%), Frequency (8%), History (7%), Duration (5%), Leave Type (5%), Timing (5%)
- Confidence calculation based on data quality and factor consistency
- Pattern detection (weekend extensions, leave clustering, frequency anomalies)
- Decision thresholds: AUTO_APPROVE ≤20 (confidence ≥60%), MANUAL_REVIEW 21-60, FLAG 61-80, REJECT >80
- Created ML API routes (/api/ml/predict, /predict/:leaveId, /patterns/:studentId, /model-info, /dashboard)
- Integrated ML prediction into leave application flow (auto-sets status to AUTO_APPROVED/FLAGGED/PENDING)
✅ Test:
- Predictions return with risk scores, categories, and explanations
- Low-risk leaves auto-approved with gate pass
- High-risk leaves flagged for manual review

### ✅ Module 4: Auto-Approval & Flagging System UI
- Updated student.html:
  - ML Risk Profile Card in dashboard (risk meter, score, tips)
  - ML Prediction Preview in apply leave form (real-time prediction before submit)
  - Auto-approved/flagged message handling
  - Profile stats display (attendance, reliability, violations)
- Updated warden.html:
  - Flagged Leaves section with AI reasons
  - ML Insights card (avg risk score, auto-approval rate, high-risk students)
  - Academic Calendar management section
  - Risk indicators in leave tables
- Updated app.js:
  - ML API methods (predictLeave, getMyStats, getMyRisk, getMLDashboard)
  - Calendar API methods (getCalendarEvents, createCalendarEvent, deleteCalendarEvent)
  - ML utility functions (getRiskBadge, getRiskColor, getRiskLabel, getApprovalLikelihood)
- Updated style.css with ML-specific styles (risk badges, prediction box, meters, calendar badges)
✅ Test:
- Students see risk profile on dashboard
- Real-time prediction preview before applying leave
- Wardens see flagged leaves highlighted
- Calendar events manageable by warden
