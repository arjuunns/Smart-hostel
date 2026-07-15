import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import logo from '../assets/image.png';
import { formatDate, formatDateTime, getStatusBadgeClass, generateQRUrl } from '../utils/helpers';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeSection, setActiveSection] = useState('dashboard');

    // Dashboard Data
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, attendance: '-' });
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [activeLeave, setActiveLeave] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // Leave Apply Form State
    const [leaveType, setLeaveType] = useState('REGULAR');
    const [fromDateTime, setFromDateTime] = useState('');
    const [toDateTime, setToDateTime] = useState('');
    const [reason, setReason] = useState('');
    const [leaveMsg, setLeaveMsg] = useState({ text: '', type: '' });

    // History & Attendance lists
    const [allLeaves, setAllLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, onLeave: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    // QR Modal State
    const [qrModal, setQrModal] = useState({ show: false, gatePassId: '', leaveId: '' });

    // Load dashboard stats
    useEffect(() => {
        if (activeSection === 'dashboard') {
            loadDashboard();
        } else if (activeSection === 'my-leaves') {
            loadAllLeaves();
        } else if (activeSection === 'attendance') {
            loadAttendance();
        }
    }, [activeSection]);

    const loadDashboard = async () => {
        setDashboardLoading(true);
        try {
            const res = await api.getMyLeaves();
            if (res.success) {
                const leaves = res.data;
                const total = leaves.length;
                const pending = leaves.filter(l => l.status === 'PENDING').length;
                const approved = leaves.filter(l => l.status === 'APPROVED').length;

                // Recent 5
                setRecentLeaves(leaves.slice(0, 5));

                // Active gate pass
                const active = leaves.find(
                    l => l.status === 'APPROVED' && l.gatePassId && l.currentStatus !== 'RETURNED'
                );
                setActiveLeave(active || null);

                // Fetch attendance for percentage
                const attRes = await api.getMyAttendance();
                let attendancePercent = '-';
                if (attRes.success && attRes.summary) {
                    const { total, present } = attRes.summary;
                    attendancePercent = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
                }

                setStats({ total, pending, approved, attendance: attendancePercent });
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setDashboardLoading(false);
        }
    };

    const loadAllLeaves = async () => {
        setLeavesLoading(true);
        try {
            const res = await api.getMyLeaves();
            if (res.success) {
                setAllLeaves(res.data);
            }
        } catch (error) {
            console.error('Error loading leaves:', error);
        } finally {
            setLeavesLoading(false);
        }
    };

    const loadAttendance = async () => {
        setAttendanceLoading(true);
        try {
            const res = await api.getMyAttendance();
            if (res.success) {
                const { summary, data } = res;
                setAttendanceStats({
                    total: summary.total,
                    present: summary.present,
                    absent: summary.absent,
                    onLeave: summary.onLeave
                });
                setAttendanceRecords(data);
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        setLeaveMsg({ text: '', type: '' });

        const leaveData = { leaveType, fromDateTime, toDateTime, reason };

        try {
            const res = await api.applyLeave(leaveData);
            if (res.success) {
                setLeaveMsg({ text: 'Leave application submitted successfully!', type: 'success' });
                // Reset form
                setLeaveType('REGULAR');
                setFromDateTime('');
                setToDateTime('');
                setReason('');
                setTimeout(() => {
                    setActiveSection('my-leaves');
                }, 1500);
            } else {
                setLeaveMsg({ text: res.message || 'Failed to submit leave', type: 'error' });
            }
        } catch (error) {
            setLeaveMsg({ text: 'Error submitting leave application', type: 'error' });
        }
    };

    const showQRCode = (gatePassId, leaveId) => {
        setQrModal({ show: true, gatePassId, leaveId });
    };

    const closeQRModal = () => {
        setQrModal({ show: false, gatePassId: '', leaveId: '' });
    };

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2>
                    <img src={logo} alt="Smart Hostel" className="logo" /> Smart Hostel
                </h2>
                <div className="user-info">
                    <div className="name">{user?.name || 'Student'}</div>
                    <div className="role">{user?.role?.toUpperCase() || 'STUDENT'}</div>
                </div>
                <nav>
                    <a
                        href="#"
                        className={activeSection === 'dashboard' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('dashboard'); }}
                    >
                        Dashboard
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'apply-leave' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('apply-leave'); }}
                    >
                        Apply Leave
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'my-leaves' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('my-leaves'); }}
                    >
                        My Leaves
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'attendance' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('attendance'); }}
                    >
                        Attendance
                    </a>
                </nav>
                <div className="theme-toggle" onClick={toggleTheme}>
                    <svg className="theme-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {theme === 'dark' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        )}
                    </svg>
                    <span>Toggle Theme</span>
                </div>
                <div className="logout-btn">
                    <button className="btn btn-secondary" onClick={logout} style={{ width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {activeSection === 'dashboard' && (
                    <section id="dashboard-section">
                        <h1>Welcome, <span id="studentName">{user?.name}</span>!</h1>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value" id="totalLeaves">{stats.total}</div>
                                <div className="stat-label">Total Leaves</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="pendingLeaves">{stats.pending}</div>
                                <div className="stat-label">Pending</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="approvedLeaves">{stats.approved}</div>
                                <div className="stat-label">Approved</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="attendancePercent">{stats.attendance}</div>
                                <div className="stat-label">Attendance %</div>
                            </div>
                        </div>

                        {activeLeave && (
                            <div className="card" id="activeGatePassCard">
                                <h3>Active Gate Pass</h3>
                                <div id="activeGatePassContent">
                                    <p><strong>Leave:</strong> {activeLeave.leaveType} - {activeLeave.reason?.substring(0, 50)}...</p>
                                    <p><strong>Valid:</strong> {formatDateTime(activeLeave.fromDateTime)} to {formatDateTime(activeLeave.toDateTime)}</p>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        <span className={`badge ${getStatusBadgeClass(activeLeave.currentStatus || 'APPROVED')}`}>
                                            {activeLeave.currentStatus || 'APPROVED'}
                                        </span>
                                    </p>
                                    <div className="qr-container">
                                        <img
                                            src={generateQRUrl({
                                                gatePassId: activeLeave.gatePassId,
                                                studentId: activeLeave.studentId,
                                                leaveId: activeLeave._id,
                                                type: 'LEAVE'
                                            })}
                                            alt="QR Code"
                                        />
                                        <div className="gate-pass-id">{activeLeave.gatePassId}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card">
                            <h3>Recent Leaves</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="recentLeavesTable">
                                        {dashboardLoading ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">Loading...</td>
                                            </tr>
                                        ) : recentLeaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">No leaves found</td>
                                            </tr>
                                        ) : (
                                            recentLeaves.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.leaveType}</td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'apply-leave' && (
                    <section id="apply-leave-section">
                        <h1>Apply for Leave</h1>
                        <div className="card">
                            <form id="leaveForm" onSubmit={handleApplyLeave}>
                                <div className="form-group">
                                    <label htmlFor="leaveType">Leave Type</label>
                                    <select
                                        id="leaveType"
                                        required
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                    >
                                        <option value="REGULAR">Regular Leave</option>
                                        <option value="EMERGENCY">Emergency Leave</option>
                                        <option value="MEDICAL">Medical Leave</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="fromDateTime">From Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            id="fromDateTime"
                                            required
                                            value={fromDateTime}
                                            onChange={(e) => setFromDateTime(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="toDateTime">To Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            id="toDateTime"
                                            required
                                            value={toDateTime}
                                            onChange={(e) => setToDateTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reason">Reason</label>
                                    <textarea
                                        id="reason"
                                        required
                                        placeholder="Enter your reason for leave..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    ></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary">
                                    Submit Leave Application
                                </button>
                            </form>
                            {leaveMsg.text && (
                                <div id="leaveMessage" className={`message ${leaveMsg.type}`}>
                                    {leaveMsg.text}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeSection === 'my-leaves' && (
                    <section id="my-leaves-section">
                        <h1>My Leave History</h1>
                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Reason</th>
                                            <th>Status</th>
                                            <th>Remarks</th>
                                            <th>Gate Pass</th>
                                        </tr>
                                    </thead>
                                    <tbody id="allLeavesTable">
                                        {leavesLoading ? (
                                            <tr>
                                                <td colSpan="7" className="empty-state">Loading...</td>
                                            </tr>
                                        ) : allLeaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="empty-state">No leaves found</td>
                                            </tr>
                                        ) : (
                                            allLeaves.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.leaveType}</td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>{leave.reason?.substring(0, 30)}...</td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                    <td>{leave.remarks || '-'}</td>
                                                    <td>
                                                        {leave.gatePassId ? (
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => showQRCode(leave.gatePassId, leave._id)}
                                                            >
                                                                View QR
                                                            </button>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'attendance' && (
                    <section id="attendance-section">
                        <h1>My Attendance</h1>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value" id="attTotal">{attendanceStats.total}</div>
                                <div className="stat-label">Total Days</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="attPresent">{attendanceStats.present}</div>
                                <div className="stat-label">Present</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="attAbsent">{attendanceStats.absent}</div>
                                <div className="stat-label">Absent</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="attOnLeave">{attendanceStats.onLeave}</div>
                                <div className="stat-label">On Leave</div>
                            </div>
                        </div>

                        <div className="card">
                            <h3>Attendance Records</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Marked By</th>
                                        </tr>
                                    </thead>
                                    <tbody id="attendanceTable">
                                        {attendanceLoading ? (
                                            <tr>
                                                <td colSpan="3" className="empty-state">Loading...</td>
                                            </tr>
                                        ) : attendanceRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="empty-state">No attendance records</td>
                                            </tr>
                                        ) : (
                                            attendanceRecords.map(att => (
                                                <tr key={att._id}>
                                                    <td>{formatDate(att.date)}</td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(att.status)}`}>
                                                            {att.status}
                                                        </span>
                                                    </td>
                                                    <td>{att.markedBy?.name || 'System'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* QR Modal */}
            {qrModal.show && (
                <div className="modal-overlay" onClick={closeQRModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Gate Pass QR Code</h3>
                        <div id="qrContent">
                            <div className="qr-container">
                                <img
                                    src={generateQRUrl({
                                        gatePassId: qrModal.gatePassId,
                                        studentId: user?._id,
                                        leaveId: qrModal.leaveId,
                                        type: 'LEAVE'
                                    })}
                                    alt="QR Code"
                                />
                                <div className="gate-pass-id">{qrModal.gatePassId}</div>
                                <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
                                    Show this QR code to the guard at the gate
                                </p>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={closeQRModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
