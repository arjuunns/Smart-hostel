# Smart Hostel Leave & Attendance Automation System (MVP)

## Goal
Build a working Smart Hostel Leave + Attendance automation system using:
- Frontend: HTML + CSS + JavaScript (simple UI)
- Backend: Node.js + Express.js
- Database: MongoDB (Mongoose)

This is an MVP system that supports:
- Student leave requests
- Warden approval
- Attendance marking
- Gate pass + entry/exit logging via QR code
- Live list of students currently out
- Parent notification placeholder (console-based for MVP)
- Reports exporting (basic JSON/CSV MVP)

## Roles
- Student
- Warden
- Guard
- Admin

## Core Modules
### Student
- Register/Login
- Apply Leave
- View Leave Status (Pending/Approved/Rejected)
- View Leave History
- Get Gate Pass QR after approval

### Warden/Admin
- Approve/Reject Leave with remark
- View leave logs (who approved what and when)
- Mark attendance (present/absent/onLeave auto)
- Force mark returned (override)

### Guard
- Scan QR (Exit/Entry)
- Manual entry fallback
- Live "Out Students" list

## Key Data Entities (MongoDB Collections)
- users
- leaves
- attendance
- gateLogs
- hostels (rooms/blocks)
- auditLogs

## Important Automation Rules
1. When leave is approved -> generate a gatePassId + QR payload
2. When student exits -> create gate exit log + set status OUT
3. When student enters -> create gate entry log + set status IN
4. If leave approved -> attendance should auto mark "On Leave" for those dates
5. Overstay alert triggers if current time > leave.endTime and student still OUT

## MVP Approach
- Keep UI simple with 3 dashboards: Student, Warden, Guard (Admin can be same as Warden)
- Authentication can start with basic login (email + password) and store JWT token
- Parent notification is mocked initially (console log), later can be SMS/WhatsApp

## Testing Rule (IMPORTANT)
After each feature implementation:
1. backend route must work via Postman/curl
2. frontend UI must call it successfully
3. DB must store correct data
Only then proceed to next feature.

## Folder Structure
/backend
  server.js
  /config
  /models
  /routes
  /middleware
/frontend
  index.html
  student.html
  warden.html
  guard.html
  style.css
  app.js

## Minimum UI Pages
- index.html (login/register)
- student.html (apply leave + view status + gate pass QR)
- warden.html (approve/reject leaves + attendance view)
- guard.html (scan QR + out list)

## Notes
- QR code payload format:
  { "gatePassId": "...", "studentId": "...", "leaveId": "...", "type":"LEAVE" }

- Audit log must store:
  action, performedBy, targetId, timestamp
