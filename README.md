# Smart Hostel Leave & Attendance Management System

> An intelligent, automated leave and attendance management system featuring weighted rule-based risk scoring, real-time QR gate pass verification, and role-based administrative workflows for educational institutions.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-informational.svg)]()
[![Deploy](https://img.shields.io/badge/deploy-active-success.svg)]()

---

# Table of Contents

- Overview
- Problem Statement
- Features
- Demo
- Screenshots
- Architecture
- Technology Stack
- Project Structure
- Getting Started
- Configuration
- API Documentation
- Database Design
- Core Modules
- Design Decisions
- Challenges & Solutions
- Trade-offs
- Performance Optimizations
- Security
- Scalability
- Testing
- CI/CD
- Deployment
- Monitoring & Logging
- Limitations
- Future Improvements
- Lessons Learned
- Contributing
- License
- Contact

---

# Overview

## What is this project?

Smart Hostel Leave & Attendance Management System is a full-stack, enterprise-grade web application built to streamline campus residential operations. It digitizes the process of requesting leave, approving permissions, tracking student movements through security gates, and monitoring hostel attendance.

The system replaces manual paper registers with dynamic digital gate passes equipped with secure QR codes. Behind the scenes, an algorithmic rule-based risk evaluation engine analyzes leave applications using historical attendance, student return reliability, and academic calendar constraints to auto-approve routine requests or flag high-risk applications for manual warden inspection.

By integrating multi-role dashboards for Students, Wardens, Security Guards, and Administrators, the application maintains continuous operational awareness across the institution.

## Who is it for?

- **Students**: Enables fast leave submission, real-time status tracking, instant QR gate pass retrieval, and historical attendance review.
- **Wardens & Caretakers**: Provides centralized control to review flagged requests, issue manual approvals/rejections, and inspect student risk profiles.
- **Security Guards**: Offers a streamlined mobile/desktop scanner interface to validate student entry and exit via QR code verification.
- **Administrators**: Grants high-level institution analytics, user role management, system audit logging, and academic calendar policy configuration.

## What problem does it solve?

Hostel operations in higher education institutions often suffer from administrative bottlenecks, unmonitored gate activity, delayed emergency approvals, and high rates of manual errors in attendance tracking. Smart Hostel automates routine decisions, eliminates paper passes, tracks curfew violations automatically, and provides automated risk scoring for proactive hostel governance.

---

# Problem Statement

Higher education institutions manage thousands of residential students daily, relying on manual paper-based approval procedures and gate logging.

Current problems:
- Manual leave approvals create long administrative queues and delay emergency student leaves.
- Security guards struggle to verify handwritten gate passes, leading to unauthorized exits or unrecorded returns.
- Absence of real-time attendance integration makes tracking curfew violations and overstays difficult.
- Wardens lack analytical insight into student leave frequency, return reliability, and academic calendar conflicts.

How this project solves them:
- Automated rule-based risk scoring system auto-approves low-risk leave requests instantly.
- Encrypted QR-code digital gate passes facilitate single-tap entry/exit verification for security personnel.
- Automated gate log integration records exact exit/entry timestamps, auto-calculating overstay durations and curfew violations.
- Real-time student statistics calculate return reliability scores, attendance percentages, and flag anomalous activity.

---

# Features

## Core Features

- **Multi-Role Portal Access**: Customized dashboards tailored for Students, Wardens/Caretakers, Security Guards, and System Administrators.
- **Digital QR Gate Pass Generation**: Instant generation of unique QR gate passes upon leave approval.
- **Camera-Based QR Scanner**: Integrated scanner component (`html5-qrcode`) for real-time guard verification.
- **Risk Assessment Engine**: Scores leave applications using weighted metrics (Attendance, Calendar, History, and Pattern scores).
- **Academic Calendar Policy Management**: Dynamic leave restrictions during examination windows, holidays, or hostel-specific blackout dates.
- **Curfew & Overstay Tracking**: Automatic detection and logging of late entries and missed return deadlines.

## Technical Features

- Authentication: JSON Web Token (JWT) based authentication stored securely.
- Authorization: Role-based access control (RBAC) middleware verifying role hierarchy.
- Caching: Efficient database queries leveraging indexed relational lookup models.
- Background Jobs: Automated stat recalculation scripts for student risk metrics.
- Risk Evaluation Engine: Multi-factor statistical engine evaluating leave applications automatically.
- File Uploads: Structured asset management ready for profile avatar & document storage.
- Notifications: In-app real-time status alerts for pending/approved leave updates.
- Search: Filterable data tables for gate logs, user lists, and leave request archives.
- Analytics: Institution-level metrics summarizing occupancy, pending approvals, and curfew violations.

---

# Demo

## Live Demo

https://smart-hostel-demo.example.com

## Video Demo

https://youtube.com/watch?v=example-smart-hostel-demo

## API Documentation

https://smart-hostel-demo.example.com/api-docs

---

# Screenshots

## Home

![Home Page](https://raw.githubusercontent.com/placeholder/smart-hostel/main/docs/images/home.png)

## Dashboard

![Dashboard Overview](https://raw.githubusercontent.com/placeholder/smart-hostel/main/docs/images/dashboard.png)

## Feature 1

![Leave Request & Risk Analysis](https://raw.githubusercontent.com/placeholder/smart-hostel/main/docs/images/leave-request.png)

## Feature 2

![Security Guard QR Scanner](https://raw.githubusercontent.com/placeholder/smart-hostel/main/docs/images/qr-scanner.png)

---

# Architecture

## High-Level Architecture

The system follows a modern decoupled client-server architecture consisting of a React Single-Page Application (SPA) frontend, an Express.js RESTful API layer, and a PostgreSQL database powered by Prisma ORM.

```text
[ React 19 Frontend (Vite) ] <--- HTTP/REST (JWT) ---> [ Express Backend Node.js ] <--- Prisma ORM ---> [ PostgreSQL Database ]
```

## Request Flow

User

↓

Frontend (React Router SPA / Vite)

↓

API Middleware (Authentication & RBAC verification)

↓

Express Controller Layer

↓

Business Logic & Algorithmic Risk Scoring Engine

↓

Database (PostgreSQL via Prisma ORM)

↓

JSON HTTP Response

---

## Component Diagram

```text
+-----------------------------------------------------------------------+
|                          Frontend Layer (React 19)                    |
|  +----------------+  +-------------------+  +----------------------+  |
|  | Auth Context   |  |  Dashboard Views  |  | QR Scanner Component |  |
|  +----------------+  +-------------------+  +----------------------+  |
+-----------------------------------||----------------------------------+
                                    || HTTP / REST API
+-----------------------------------\/----------------------------------+
|                          Backend Layer (Express.js)                   |
|  +----------------+  +-------------------+  +----------------------+  |
|  | JWT Auth Guard |  |  Leave Controller |  |  Risk Scoring Engine |  |
|  +----------------+  +-------------------+  +----------------------+  |
+-----------------------------------||----------------------------------+
                                    || Prisma ORM
+-----------------------------------\/----------------------------------+
|                       Database Layer (PostgreSQL)                     |
|  +---------+  +----------+  +-----------+  +-----------------------+  |
|  |  Users  |  |  Leaves  |  | Gate Logs |  |  Academic Calendar    |  |
|  +---------+  +----------+  +-----------+  +-----------------------+  |
+-----------------------------------------------------------------------+
```

---

## Sequence Diagram

```text
Student                  Frontend                  Express API                 Risk Engine                PostgreSQL
   |                        |                           |                           |                          |
   |--- Submit Leave ------>|                           |                           |                          |
   |                        |--- POST /api/leaves ----->|                           |                          |
   |                        |                           |--- Evaluate Risk -------->|                          |
   |                        |                           |<-- Score & Category ------|                          |
   |                        |                           |                                                      |
   |                        |                           |--- Save Leave Record ------------------------------>|
   |                        |                           |<-- Return Created Leave Record ----------------------|
   |                        |<-- 201 Created Status ----|                                                      |
   |<-- Pass / Status ------|                           |                                                      |
```

---

# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | Core UI component framework |
| Vite 8 | High-performance frontend build tool and dev server |
| React Router v7 | Client-side routing and page navigation |
| HTML5-QRCode | Web-cam based QR code scanning engine |
| Vanilla CSS | Custom design system, responsive styling, and animations |

---

## Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Server runtime environment |
| Express.js 4 | RESTful API backend web framework |
| Prisma ORM 7 | Database object-relational mapping and schema management |
| JSONWebToken | Stateless authentication mechanism |
| BcryptJS | Password hashing algorithm |

---

## Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary relational database storage engine |
| @prisma/adapter-pg | Native driver adapter for Prisma-PostgreSQL connections |

---

## Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Application containerization environment |
| Node.js Engine | Application execution host |

---

## DevOps

| Technology | Purpose |
|------------|---------|
| Nodemon | Server auto-reloading during development |
| Oxlint | Modern high-speed JavaScript/JSX code linter |

---

## External Services

- WebRTC / Camera API: Enables hardware video stream capture for real-time QR scanner.
- Google Fonts API: Serves UI typography standards across client interfaces.

---

# Project Structure

```text
Smart-hostel/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── leaves.js
│   │   ├── gate.js
│   │   └── admin.js
│   ├── scripts/
│   │   └── seedStudentStats.js
│   ├── services/
│   │   ├── calendarService.js
│   │   ├── riskAssessmentService.js
│   │   └── statsService.js
│   ├── prisma.config.ts
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── QrScanner.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Auth.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LeaveRequest.jsx
│   │   │   └── GuardScan.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

Explain each important directory:
- `backend/config/`: Configuration setup files for database client and environment defaults.
- `backend/middleware/`: Express middleware functions for token validation and role access verification.
- `backend/prisma/`: Database schema definitions, Prisma engine configurations, and migration files.
- `backend/routes/`: Express endpoint definitions grouped by feature domains (Auth, Leaves, Gate Logging, Admin).
- `backend/services/`: Core computational services including statistical evaluation and calendar tracking services.
- `frontend/src/components/`: Modular UI widgets including navbars, status cards, and QR camera interfaces.
- `frontend/src/context/`: Global React state managers such as authentication credentials and active user session info.
- `frontend/src/pages/`: Main application view routes for students, wardens, guards, and admins.

---

# Getting Started

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL (v14.0 or higher)

---

## Installation

```bash
git clone https://github.com/your-org/smart-hostel.git

cd Smart-hostel

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory.

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string URL | Yes |
| JWT_SECRET | Cryptographic secret key for signing auth tokens | Yes |
| PORT | Backend API HTTP listener port (default: 5000) | No |

---

## Running Locally

1. Start PostgreSQL server and ensure your target database exists.
2. Push Prisma database schema and run initial seeders:

```bash
cd backend
npx prisma db push
npm run seed:stats
```

3. Launch the Backend API server:

```bash
cd backend
npm run dev
```

4. Launch the Frontend React Application in a separate terminal:

```bash
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## Running with Docker

```bash
docker compose up --build
```

---

# Configuration

Explain important configuration files:

- `backend/prisma/schema.prisma`: Defines relational data models, field types, indices, and foreign key relationships.
- `backend/prisma.config.ts`: Setup configuration for Prisma Client 7 generator adapter options.
- `frontend/vite.config.js`: Bundler configuration specifying plugins, dev server port, and asset processing.

---

# API Documentation

## Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/register | Create new student or user account |
| POST | /api/auth/login | Authenticate user and receive JWT session token |
| GET | /api/auth/me | Retrieve active user profile data |

---

## User APIs

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/users/profile | Fetch authenticated user profile details |
| PUT | /api/users/profile | Update profile preferences and contact info |
| GET | /api/users/stats | Fetch student return and attendance analytics |

---

## Other APIs

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/leaves | Submit a new leave request |
| GET | /api/leaves | Fetch user leave application history |
| PATCH | /api/leaves/:id/status | Update leave request approval status (Warden) |
| POST | /api/gate/verify | Verify QR gate pass ID and log entry/exit action (Guard) |
| GET | /api/admin/calendar | Fetch or configure academic calendar blackout events |

---

# Database Design

## ER Diagram

```text
+-------------------+        +--------------------+
|       User        |        |       Leave        |
+-------------------+        +--------------------+
| id (PK)           |1      *| id (PK)            |
| email             |<-------| studentId (FK)     |
| role              |        | leaveType          |
| hostelBlock       |        | fromDateTime       |
+-------------------+        | toDateTime         |
          | 1                | status             |
          |                  | riskScore          |
          | 1                +--------------------+
+-------------------+                  | 1
|   StudentStats    |                  |
+-------------------+                  | *
| id (PK)           |        +--------------------+
| studentId (FK)    |        |      GateLog       |
| attendancePct     |        +--------------------+
| riskCategory      |        | id (PK)            |
+-------------------+        | gatePassId         |
                             | leaveId (FK)       |
                             | action (ENTRY/EXIT)|
                             +--------------------+
```

---

## Tables

### Users

Purpose: Stores user credentials, contact details, assigned role permissions, and hostel accommodation mapping.

Columns: `id`, `name`, `email`, `passwordHash`, `role`, `hostelBlock`, `roomNo`, `phone`, `parentPhone`, `isActive`, `createdAt`, `updatedAt`

Relationships: Has many `Leave` records, `GateLog` records, `Attendance` records, and one `StudentStats` record.

---

### Leaves

Purpose: Records leave requests submitted by students alongside calculated risk evaluation engine metrics and gate pass metadata.

Columns: `id`, `studentId`, `approvedBy`, `leaveType`, `fromDateTime`, `toDateTime`, `reason`, `status`, `gatePassId`, `currentStatus`, `riskScore`, `riskCategory`, `aiDecision`, `returnedOnTime`, `lateReturnHours`, `createdAt`, `updatedAt`

Relationships: Belongs to `User` (student and approver), has many `GateLog` records.

---

### GateLogs

Purpose: Tracks real-time movement at security checkpoints including timestamps, exit/entry events, and overstay alerts.

Columns: `id`, `gatePassId`, `studentId`, `leaveId`, `action`, `timestamp`, `isOverstayed`, `markedBy`, `remarks`, `createdAt`, `updatedAt`

Relationships: Belongs to `User` (student and security guard), belongs to `Leave`.

---

### StudentStats

Purpose: Stores calculated analytical metrics regarding attendance, return reliability, and aggregate risk profiles for students.

Columns: `id`, `studentId`, `totalLeavesApplied`, `totalLeavesApproved`, `returnReliabilityScore`, `attendancePercentage`, `overallRiskScore`, `riskCategory`, `lastUpdated`

Relationships: Has one-to-one relationship with `User`.

---

### AcademicCalendar

Purpose: Stores institutional calendar events, exam schedules, and holiday leave policies impacting risk evaluation.

Columns: `id`, `title`, `eventType`, `startDate`, `endDate`, `leavePolicy`, `riskModifier`, `isActive`

Relationships: Standalone institutional policy reference table.

---

### AuditLogs

Purpose: Provides an immutable log of administrative actions, status overrides, and system events.

Columns: `id`, `action`, `model`, `documentId`, `performedBy`, `details`, `timestamp`

Relationships: Belongs to `User` (performer).

---

# Core Modules

## Risk Evaluation Module

Purpose: Automatically assesses the risk profile of each incoming leave application.

Responsibilities:
- Calculates weighted risk components: Attendance Score (18%), Return Reliability (15%), Curfew Violations (12%), Calendar Conflict (15%), Exam Proximity (10%), Frequency & Duration.
- Categorizes requests into LOW, MEDIUM, or HIGH risk categories.
- Performs automatic approvals for qualified low-risk routine requests.

Dependencies: `Prisma Database Client`, `StudentStats Model`, `AcademicCalendar Model`.

Key files: `backend/services/riskAssessmentService.js`, `backend/services/statsService.js`

Flow: Receives leave parameters -> Queries student statistics and academic calendar -> Computes weighted formula -> Assigns decision status (`AUTO_APPROVED` or `FLAGGED`).

---

## Gate Control Module

Purpose: Handles real-time verification and gate pass validation at entry/exit points.

Responsibilities:
- Decodes scanned QR code passes.
- Validates active pass status against database records.
- Records timestamped ENTRY/EXIT events and checks for overstay conditions.

Dependencies: `Prisma Database Client`, `Leave Model`, `GateLog Model`.

Key files: `backend/routes/gate.js`, `frontend/src/components/QrScanner.jsx`

Flow: Guard scans QR -> Frontend posts payload to `/api/gate/verify` -> Backend verifies leave validity -> Database logs action -> Response alerts guard.

---

# Design Decisions

## Why Framework Express.js & React?

Reason: Express provides a lightweight, unopinionated foundation perfect for building decoupled RESTful micro-services, while React 19 delivers efficient state management and dynamic UI updates for responsive dashboard applications.

Advantages: Modular middleware support, broad ecosystem, high Developer Experience (DX), and fast frontend client rendering.

Alternative considered: Next.js full-stack framework (rejected in favor of explicit client-server decoupling for dedicated guard scanner deployment).

---

## Why Database PostgreSQL & Prisma ORM?

Reason: Strict relational integrity is mandatory when managing leaves, gate entry logs, and attendance records tied to student accounts.

Advantages: Strong ACID compliance, strong type safety with Prisma Client 7, schema migration tracking, and efficient relational querying.

Trade-offs: Requires dedicated database hosting compared to serverless document stores.

---

## Why Architecture Decoupled Client-Server?

Reason: Allows independent scaling and deployment of the frontend client across mobile kiosk terminals at security gates while maintaining API centralization.

Benefits: Isolation of security guard terminal logic, simplified API versioning, and flexibility for mobile app extensions.

---

# Challenges & Solutions

## Challenge: Camera Stream Access Across Varied Mobile Browsers

Problem: The security guard QR scanner failed to initialize camera feeds reliably on legacy mobile browsers.

Root Cause: Differences in browser WebRTC implementation and permissions handling for media devices.

Solution: Integrated `html5-qrcode` library with fallbacks for back-camera facing modes (`facingMode: "environment"`) and error handling for missing device permissions.

Outcome: Seamless camera access across all standard mobile and tablet devices.

Lessons: Always provide explicit device fallback configurations for web-cam based scanning tools.

---

# Trade-offs

## Monolithic Express Backend vs Serverless Functions

Chosen: Monolithic Express API architecture.

Reason: Predictable performance for continuous database connections and stats recalculation without cold-start latency issues.

Pros: Consistent database connection pooling, simple local debugging, and unified middleware execution.

Cons: Requires continuous instance server management.

Impact: Highly responsive API response times for security gate verification endpoints.

---

# Performance Optimizations

- Database Indexing: Added foreign key and unique field indices (`studentId`, `gatePassId`, `email`) in PostgreSQL to speed up lookup queries.
- Code Splitting: Leveraged Vite build optimizations for asynchronous route loading on the frontend.
- Stat Pre-computation: Offloaded risk engine statistical computations to asynchronous background services (`statsService.js`), storing metrics in `StudentStats` rather than calculating aggregate scores on every request.
- QR Code Caching: Rendered client-side QR codes locally from pass strings to reduce backend network overhead.

---

# Security

- Authentication: JSON Web Tokens (JWT) signed with secret keys and short expiration windows.
- Authorization: Role-Based Access Control middleware (`checkRole`) enforcing endpoint protection for Student, Warden, Guard, and Admin roles.
- Password Hashing: Secure password hashing powered by `bcryptjs` with salt rounds.
- Input Sanitization: Strict parameter validation preventing invalid payload execution.
- SQL Injection Prevention: Parameterized queries enforced automatically by Prisma ORM.
- CORS Configuration: Restrictive Cross-Origin Resource Sharing setup permitting authorized client origins only.

---

# Scalability

- Horizontal Scaling: Stateless Express API servers capable of running behind a load balancer.
- Connection Pooling: Database connection management using `@prisma/adapter-pg`.
- Stateless Services: Auth state stored strictly within JWT payloads, eliminating memory session locks.
- Database Scaling: PostgreSQL read-replica readiness for high-frequency gate log reporting.

---

# Testing

## Unit Tests

Coverage: Risk scoring algorithm modules, password verification functions, and date utility calculations.

Framework: Jest / Node test runner setup.

---

## Integration Tests

Coverage: API endpoint tests for authentication flows, leave submission, and gate verification routes.

---

## End-to-End Tests

Coverage: Complete leave request creation, warden approval, and guard QR code scanning flow.

---

## Manual Testing

Coverage: Cross-browser responsive UI inspection, camera scanning performance under varied light conditions, and role authorization validation.

---

# CI/CD

Pipeline diagram:

Git Commit

↓

Automated Oxlint Code Verification

↓

Backend & Frontend Build Verification

↓

Docker Image Compilation

↓

Push Container Image to Registry

↓

Production Host Deployment

↓

Health Check Endpoint Verification

---

# Deployment

- Hosting Platform: Render / AWS EC2 for API Container Hosting; Vercel / Netlify for Frontend SPA Hosting.
- Infrastructure: PostgreSQL managed instance.
- Rollback Strategy: Container image tagging allowing instant rollback to previous stable deployment releases.

---

# Monitoring & Logging

- Logging: Structured console logging for HTTP access events and database query execution.
- System Audit Logs: Persistent `AuditLog` table capturing high-privilege administrative state modifications.
- Health Endpoints: `/api/health` endpoint for monitoring uptime and database connectivity status.

---

# Limitations

- Internet Connectivity: Security guard scanner requires active network access to query pass statuses against the database.
- Native App Features: Currently operates as a Progressive Web Application rather than a native mobile binary.

---

# Future Improvements

- Short-Term: Push notification support via Web Push API for instant leave status updates.
- Medium-Term: Offline scan queueing for security checkpoints during network connectivity drops.
- Long-Term: Advanced predictive analytics for curfew violation forecasting based on institutional historical patterns.

---

# Lessons Learned

- System Design: Pre-computing relational statistical data significantly reduces runtime overhead during high-volume requests.
- Security Operations: Single-use digital gate passes with short validity windows prevent pass sharing among students.
- Frontend UX: Clear role-specific navigation guards improve user experience and prevent authorization confusion.

---

# Contributing

1. Fork the repository on GitHub.
2. Create a topic feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes adhering to standard guidelines (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request for review.

---

# License

Distributed under the MIT License. See `LICENSE` for more information.

---

# Contact

Author: Project Maintainers

Email: maintainers@smarthostel.example.com

Project Repository: https://github.com/your-org/smart-hostel

---

# Acknowledgements

- React Ecosystem & Community
- Prisma ORM Team
- HTML5-QRCode open source library maintainers
