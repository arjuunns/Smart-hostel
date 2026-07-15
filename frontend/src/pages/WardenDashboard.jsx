import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import logo from '../assets/image.png';
import {
    formatDate,
    formatDateTime,
    getStatusBadgeClass,
    getRiskBadgeClass
} from '../utils/helpers';

const WardenDashboard = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, accent, setAccent } = useTheme();
    const [activeSection, setActiveSection] = useState('dashboard');

    // Dashboard States
    const [counts, setCounts] = useState({ pending: 0, flagged: 0, autoApproved: 0, emergency: 0, out: 0, overstay: 0 });
    const [recentPending, setRecentPending] = useState([]);
    const [flaggedAlerts, setFlaggedAlerts] = useState([]);
    const [emergencyLeaves, setEmergencyLeaves] = useState([]);
    const [insights, setInsights] = useState({ approvedToday: '-', autoApproved: '-', flaggedCount: 0, activeRestrictions: 0 });
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // Sidebar Responsive Toggle
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Section Specific States
    const [flaggedLeaves, setFlaggedLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [outStudents, setOutStudents] = useState([]);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    
    // Attendance States
    const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [hostelFilter, setHostelFilter] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    // Reports Date Range States
    const [reportLeavesFrom, setReportLeavesFrom] = useState('');
    const [reportLeavesTo, setReportLeavesTo] = useState('');
    const [reportAttDate, setReportAttDate] = useState('');
    const [reportGateFrom, setReportGateFrom] = useState('');
    const [reportGateTo, setReportGateTo] = useState('');

    // Calendar Creation Form State
    const [calTitle, setCalTitle] = useState('');
    const [calType, setCalType] = useState('HOLIDAY');
    const [calStart, setCalStart] = useState('');
    const [calEnd, setCalEnd] = useState('');
    const [calPolicy, setCalPolicy] = useState('RESTRICTED');
    const [calDesc, setCalDesc] = useState('');
    const [calMsg, setCalMsg] = useState({ text: '', type: '' });

    // MongoDB Analytics States
    const [analyticsTab, setAnalyticsTab] = useState('risk-distribution');
    const [riskDistData, setRiskDistData] = useState([]);
    const [leaveStatsData, setLeaveStatsData] = useState([]);
    const [attHostelData, setAttHostelData] = useState([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Decision Modal State
    const [decisionModal, setDecisionModal] = useState({ show: false, leaveId: null, studentName: '', reason: '', remarks: '' });

    // Toast/Message state
    const [toast, setToast] = useState({ text: '', type: '' });

    useEffect(() => {
        if (activeSection === 'dashboard') {
            loadDashboard();
        } else if (activeSection === 'flagged-leaves') {
            loadFlaggedLeaves();
        } else if (activeSection === 'pending-leaves') {
            loadPendingLeaves();
        } else if (activeSection === 'all-leaves') {
            loadAllLeaves();
        } else if (activeSection === 'attendance') {
            loadAttendanceForDate();
        } else if (activeSection === 'out-students') {
            loadOutStudents();
        } else if (activeSection === 'calendar') {
            loadCalendarEvents();
        } else if (activeSection === 'mongodb-analytics') {
            loadAnalyticsTab(analyticsTab);
        }
    }, [activeSection, filterStatus, filterType, attendanceDate, hostelFilter]);

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 3000);
    };

    const loadDashboard = async () => {
        setDashboardLoading(true);
        try {
            // Pending Leaves
            const pendingRes = await api.getPendingLeaves();
            let pendingCount = 0;
            if (pendingRes.success) {
                pendingCount = pendingRes.count || 0;
                setRecentPending(pendingRes.data?.slice(0, 5) || []);
            }

            // Flagged Leaves
            const flaggedRes = await api.getFlaggedLeaves();
            let flaggedCount = 0;
            if (flaggedRes.success) {
                flaggedCount = flaggedRes.count || 0;
                setFlaggedAlerts(flaggedRes.data?.slice(0, 3) || []);
            }

            // Auto Approved Leaves Count
            const autoApprovedRes = await api.getAutoApprovedLeaves();
            let autoApprovedCount = 0;
            if (autoApprovedRes.success) {
                autoApprovedCount = autoApprovedRes.count || 0;
            }

            // Emergency Leaves
            const emergencyRes = await api.getEmergencyLeaves();
            let emergencyCount = 0;
            if (emergencyRes.success) {
                emergencyCount = emergencyRes.count || 0;
                setEmergencyLeaves(emergencyRes.data || []);
            }

            // Out Students
            const outRes = await api.getOutStudents();
            let outCount = 0;
            let overstayCount = 0;
            if (outRes.success) {
                outCount = outRes.count || 0;
                overstayCount = outRes.data?.filter(s => s.isOverstayed).length || 0;
            }

            setCounts({
                pending: pendingCount,
                flagged: flaggedCount,
                autoApproved: autoApprovedCount,
                emergency: emergencyCount,
                out: outCount,
                overstay: overstayCount
            });

            // Insights & Restrictions
            const calRes = await api.getCurrentRestrictions();
            const activeRestrictions = calRes.success ? (calRes.data?.length || 0) : 0;
            setInsights({
                approvedToday: stats.approved ?? '-',
                autoApproved: stats.autoApproved ?? '-',
                flaggedCount: flaggedLeaves.length,
                activeRestrictions
            });
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setDashboardLoading(false);
        }
    };

    const loadFlaggedLeaves = async () => {
        try {
            const res = await api.getFlaggedLeaves();
            if (res.success) setFlaggedLeaves(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadPendingLeaves = async () => {
        try {
            const res = await api.getPendingLeaves();
            if (res.success) setPendingLeaves(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAllLeaves = async () => {
        try {
            const filters = { status: filterStatus, leaveType: filterType };
            const res = await api.getAllLeaves(filters);
            if (res.success) setAllLeaves(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAttendanceForDate = async () => {
        if (!attendanceDate) return;
        setAttendanceLoading(true);
        try {
            const res = await api.getAttendanceForDate(attendanceDate);
            if (res.success) {
                let data = res.data || [];
                if (hostelFilter) {
                    data = data.filter(a =>
                        a.student?.hostelBlock?.toLowerCase().includes(hostelFilter.toLowerCase())
                    );
                }
                setAttendanceRecords(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const loadOutStudents = async () => {
        try {
            const res = await api.getOutStudents();
            if (res.success) setOutStudents(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadCalendarEvents = async () => {
        try {
            const res = await api.getCalendarEvents();
            if (res.success) setCalendarEvents(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAnalyticsTab = async (tabName) => {
        setAnalyticsLoading(true);
        try {
            if (tabName === 'risk-distribution') {
                const res = await api.getRiskDistributionAggregation();
                if (res.success) setRiskDistData(res.data || []);
            } else if (tabName === 'leave-statistics') {
                const res = await api.getLeaveStatisticsAggregation();
                if (res.success) setLeaveStatsData(res.data || []);
            } else if (tabName === 'attendance-hostel') {
                const res = await api.getAttendanceByHostelAggregation();
                if (res.success) setAttHostelData(res.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleSwitchAnalyticsTab = (tabName) => {
        setAnalyticsTab(tabName);
        loadAnalyticsTab(tabName);
    };

    const handleQuickApprove = async (leaveId) => {
        try {
            const res = await api.decideLeave(leaveId, 'APPROVE', 'Emergency - Quick Approved');
            if (res.success) {
                showToast('Emergency leave approved!', 'success');
                loadDashboard();
            } else {
                showToast(res.message || 'Approval failed', 'error');
            }
        } catch (err) {
            showToast('Error approving leave', 'error');
        }
    };

    const handleForceReturn = async (leaveId) => {
        if (!window.confirm('Are you sure you want to force-mark this student as returned?')) return;
        try {
            const res = await api.forceReturn(leaveId, 'Force marked as returned by warden');
            if (res.success) {
                showToast('Student marked as returned', 'success');
                loadOutStudents();
                loadDashboard();
            } else {
                showToast(res.message || 'Action failed', 'error');
            }
        } catch (err) {
            showToast('Error processing request', 'error');
        }
    };

    const handleCreateCalendarEvent = async (e) => {
        e.preventDefault();
        setCalMsg({ text: '', type: '' });

        const eventData = { title: calTitle, eventType: calType, startDate: calStart, endDate: calEnd, leavePolicy: calPolicy, description: calDesc };

        try {
            const res = await api.createCalendarEvent(eventData);
            if (res.success) {
                setCalMsg({ text: 'Calendar event added successfully!', type: 'success' });
                setCalTitle('');
                setCalStart('');
                setCalEnd('');
                setCalDesc('');
                loadCalendarEvents();
            } else {
                setCalMsg({ text: res.message || 'Failed to add event', type: 'error' });
            }
        } catch (err) {
            setCalMsg({ text: 'Error adding calendar event', type: 'error' });
        }
    };

    const handleDeleteCalendarEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this calendar event?')) return;
        try {
            const res = await api.deleteCalendarEvent(eventId);
            if (res.success) {
                loadCalendarEvents();
                showToast('Event deleted successfully', 'success');
            } else {
                showToast(res.message || 'Failed to delete event', 'error');
            }
        } catch (err) {
            showToast('Error deleting event', 'error');
        }
    };

    const openDecisionModal = (leaveId, studentName, reason) => {
        setDecisionModal({ show: true, leaveId, studentName, reason, remarks: '' });
    };

    const closeDecisionModal = () => {
        setDecisionModal({ show: false, leaveId: null, studentName: '', reason: '', remarks: '' });
    };

    const submitDecision = async (action) => {
        const { leaveId, remarks } = decisionModal;
        if (!leaveId) return;

        try {
            const res = await api.decideLeave(leaveId, action, remarks);
            if (res.success) {
                showToast(`Leave ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`, 'success');
                closeDecisionModal();
                loadDashboard();
                loadPendingLeaves();
                loadFlaggedLeaves();
                loadAllLeaves();
            } else {
                showToast(res.message || 'Action failed', 'error');
            }
        } catch (err) {
            showToast('Error processing request', 'error');
        }
    };

    const handleAttendanceSelectChange = (studentId, status) => {
        setAttendanceRecords(prev => prev.map(rec => {
            if (rec.student?.id === studentId) {
                return { ...rec, status };
            }
            return rec;
        }));
    };

    const handleSaveAttendance = async () => {
        if (!attendanceDate) {
            showToast('Please select a date', 'error');
            return;
        }

        const records = attendanceRecords
            .filter(r => r.status && r.status !== 'NOT_MARKED')
            .map(r => ({
                studentId: r.student.id,
                status: r.status
            }));

        if (records.length === 0) {
            showToast('No attendance changes to save', 'error');
            return;
        }

        try {
            const res = await api.markBulkAttendance(attendanceDate, records);
            if (res.success) {
                showToast(`Attendance saved for ${records.length} students`, 'success');
                loadAttendanceForDate();
            } else {
                showToast(res.message || 'Failed to save attendance', 'error');
            }
        } catch (err) {
            showToast('Error saving attendance', 'error');
        }
    };

    const handleDownloadReport = (type) => {
        let filters = {};
        if (type === 'leaves') {
            filters.from = reportLeavesFrom;
            filters.to = reportLeavesTo;
        } else if (type === 'attendance') {
            filters.date = reportAttDate;
        } else if (type === 'gate-logs') {
            filters.from = reportGateFrom;
            filters.to = reportGateTo;
        }
        api.downloadCSV(`/reports/${type}`, filters);
    };

    const handleRefreshAnalytics = async () => {
        showToast('Refreshing analytics data...', 'info');
        await loadAnalyticsTab(analyticsTab);
        showToast('Analytics data refreshed!', 'success');
    };

    const formatNumber = (value, decimals = 0, fallback = '0') => {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue.toFixed(decimals) : fallback;
    };

    return (
        <div className="dashboard">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <h2>
                    <img src={logo} alt="Smart Hostel" className="logo" /> Smart Hostel
                </h2>
                <div className="user-info">
                    <div className="name">{user?.name || 'Warden'}</div>
                    <div className="role">{user?.role?.toUpperCase() || 'WARDEN'}</div>
                </div>
                <nav>
                    <a
                        href="#"
                        className={activeSection === 'dashboard' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('dashboard'); setSidebarOpen(false); }}
                    >
                        Dashboard
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'flagged-leaves' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('flagged-leaves'); setSidebarOpen(false); }}
                    >
                        Flagged Leaves
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'pending-leaves' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('pending-leaves'); setSidebarOpen(false); }}
                    >
                        Pending Leaves
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'all-leaves' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('all-leaves'); setSidebarOpen(false); }}
                    >
                        All Leaves
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'attendance' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('attendance'); setSidebarOpen(false); }}
                    >
                        Attendance
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'out-students' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('out-students'); setSidebarOpen(false); }}
                    >
                        Out Students
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'reports' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('reports'); setSidebarOpen(false); }}
                    >
                        Reports
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'calendar' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('calendar'); setSidebarOpen(false); }}
                    >
                        Academic Calendar
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'mongodb-analytics' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('mongodb-analytics'); setSidebarOpen(false); }}
                    >
                        Analytics
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
                {/* Mobile Header Bar */}
                <header className="mobile-header">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="mobile-logo-text">Smart Hostel</span>
                </header>
                {activeSection === 'dashboard' && (
                    <section id="dashboard-section">
                        <h1>Warden Dashboard</h1>

                        <div className="stats-grid">
                            <div className="stat-card" onClick={() => setActiveSection('pending-leaves')} style={{ cursor: 'pointer' }}>
                                <div className="stat-value">{counts.pending}</div>
                                <div className="stat-label">Pending Leaves</div>
                            </div>
                            <div className="stat-card stat-card-warning" onClick={() => setActiveSection('flagged-leaves')} style={{ cursor: 'pointer' }}>
                                <div className="stat-value">{counts.flagged}</div>
                                <div className="stat-label">Flagged Leaves</div>
                            </div>
                            <div className="stat-card stat-card-success">
                                <div className="stat-value">{counts.autoApproved}</div>
                                <div className="stat-label">Auto-Approved</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{counts.emergency}</div>
                                <div className="stat-label">Emergency Leaves</div>
                            </div>
                            <div className="stat-card" onClick={() => setActiveSection('out-students')} style={{ cursor: 'pointer' }}>
                                <div className="stat-value">{counts.out}</div>
                                <div className="stat-label">Students Out</div>
                            </div>
                            <div className="stat-card" onClick={() => setActiveSection('out-students')} style={{ cursor: 'pointer' }}>
                                <div className="stat-value">{counts.overstay}</div>
                                <div className="stat-label">Overstayed</div>
                            </div>
                        </div>

                        {/* Insights Card */}
                        <div className="card insights-card">
                            <h3>Insights</h3>
                            <div className="insights-grid">
                                <div className="insight-item">
                                    <div className="insight-content">
                                        <div className="insight-value">{insights.approvedToday}</div>
                                        <div className="insight-label">Approved Leaves</div>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-content">
                                        <div className="insight-value">{insights.autoApproved}</div>
                                        <div className="insight-label">Auto-Approved</div>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-content">
                                        <div className="insight-value">{insights.flaggedCount}</div>
                                        <div className="insight-label">Flagged Leaves</div>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-content">
                                        <div className="insight-value">{insights.activeRestrictions}</div>
                                        <div className="insight-label">Active Restrictions</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alerts for Flagged Leaves */}
                        {flaggedAlerts.length > 0 && (
                            <div className="card card-warning" id="flaggedAlertCard">
                                <h3>⚠️ High Risk / Flagged Alerts</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Block</th>
                                                <th>Type</th>
                                                <th>Risk</th>
                                                <th>AI Flag Reason</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="flaggedAlertTable">
                                            {flaggedAlerts.map(leave => (
                                                <tr key={leave._id} className="flagged-row">
                                                    <td>{leave.student?.name || 'N/A'}</td>
                                                    <td>{leave.student?.hostelBlock || '-'}</td>
                                                    <td>{leave.leaveType}</td>
                                                    <td>
                                                        <span className={`badge ${getRiskBadgeClass(leave.riskCategory)}`}>
                                                            {leave.riskCategory || 'LOW'} ({leave.riskScore || 0})
                                                        </span>
                                                    </td>
                                                    <td className="ai-reason">{leave.aiDecisionReason || '-'}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openDecisionModal(leave._id, leave.student?.name || 'Student', leave.reason)}
                                                        >
                                                            Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Emergency Leaves Section */}
                        {emergencyLeaves.length > 0 && (
                            <div className="card" id="emergencyCard">
                                <h3>🚨 Emergency Leave Requests</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Block</th>
                                                <th>Room</th>
                                                <th>Reason</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="emergencyTable">
                                            {emergencyLeaves.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.studentId?.name || 'Unknown'}</td>
                                                    <td>{leave.studentId?.hostelBlock || '-'}</td>
                                                    <td>{leave.studentId?.roomNo || '-'}</td>
                                                    <td>{leave.reason?.substring(0, 50)}...</td>
                                                    <td>
                                                        <button className="btn btn-sm btn-success" onClick={() => handleQuickApprove(leave._id)}>
                                                            Quick Approve
                                                        </button>{' '}
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openDecisionModal(leave._id, leave.studentId?.name || 'Student', leave.reason)}
                                                        >
                                                            Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Recent Pending Leaves */}
                        <div className="card">
                            <h3>Recent Pending Leaves</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Risk Level</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="recentPendingTable">
                                        {dashboardLoading ? (
                                            <tr>
                                                <td colSpan="6" className="empty-state">Loading...</td>
                                            </tr>
                                        ) : recentPending.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="empty-state">No pending leaves</td>
                                            </tr>
                                        ) : (
                                            recentPending.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.student?.name || 'N/A'}</td>
                                                    <td>{leave.leaveType}</td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>
                                                        <span className={`badge ${getRiskBadgeClass(leave.riskCategory)}`}>
                                                            {leave.riskCategory || 'LOW'} ({leave.riskScore || 0})
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openDecisionModal(leave._id, leave.student?.name || 'Student', leave.reason)}
                                                        >
                                                            Review
                                                        </button>
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

                {activeSection === 'flagged-leaves' && (
                    <section id="flagged-leaves-section">
                        <h1>Flagged Leaves</h1>
                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Block / Room</th>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Risk Category</th>
                                            <th>AI Flag Reason</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="flaggedLeavesTable">
                                        {flaggedLeaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="empty-state">No flagged leaves</td>
                                            </tr>
                                        ) : (
                                            flaggedLeaves.map(leave => (
                                                <tr key={leave._id} className="flagged-row">
                                                    <td>{leave.student?.name || 'N/A'}</td>
                                                    <td>{leave.student?.hostelBlock || '-'} / {leave.student?.roomNumber || '-'}</td>
                                                    <td>{leave.leaveType}</td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>
                                                        <span className={`badge ${getRiskBadgeClass(leave.riskCategory)}`}>
                                                            {leave.riskCategory || 'LOW'} ({leave.riskScore || 0})
                                                        </span>
                                                    </td>
                                                    <td className="ai-reason">{leave.aiDecisionReason || '-'}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openDecisionModal(leave._id, leave.student?.name || 'Student', leave.reason)}
                                                        >
                                                            Review
                                                        </button>
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

                {activeSection === 'pending-leaves' && (
                    <section id="pending-leaves-section">
                        <h1>Pending Leave Applications</h1>
                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Block / Room</th>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Risk Level</th>
                                            <th>Reason</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="pendingLeavesTable">
                                        {pendingLeaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="empty-state">No pending leaves</td>
                                            </tr>
                                        ) : (
                                            pendingLeaves.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.studentId?.name || leave.student?.name || 'Unknown'}</td>
                                                    <td>{leave.studentId?.hostelBlock || leave.student?.hostelBlock || '-'} / {leave.studentId?.roomNo || leave.student?.roomNumber || '-'}</td>
                                                    <td>
                                                        <span className={`badge badge-${leave.leaveType === 'EMERGENCY' ? 'rejected' : 'pending'}`}>
                                                            {leave.leaveType}
                                                        </span>
                                                    </td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>
                                                        <span className={`badge ${getRiskBadgeClass(leave.riskCategory)}`}>
                                                            {leave.riskCategory || 'LOW'} ({leave.riskScore || 0})
                                                        </span>
                                                    </td>
                                                    <td>{leave.reason ? leave.reason.substring(0, 30) + '...' : '-'}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openDecisionModal(leave._id, leave.studentId?.name || leave.student?.name || 'Student', leave.reason)}
                                                        >
                                                            Review
                                                        </button>
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

                {activeSection === 'all-leaves' && (
                    <section id="all-leaves-section">
                        <h1>All Leave Records</h1>
                        <div className="filters-container card">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="filterStatus">Status</label>
                                    <select id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                        <option value="">All Statuses</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="FLAGGED">Flagged</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filterType">Type</label>
                                    <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                        <option value="">All Types</option>
                                        <option value="REGULAR">Regular</option>
                                        <option value="EMERGENCY">Emergency</option>
                                        <option value="MEDICAL">Medical</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Status</th>
                                            <th>Processed By</th>
                                            <th>Risk / Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="allLeavesTable">
                                        {allLeaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="empty-state">No leaves found</td>
                                            </tr>
                                        ) : (
                                            allLeaves.map(leave => (
                                                <tr key={leave._id}>
                                                    <td>{leave.studentId?.name || 'Unknown'}</td>
                                                    <td>{leave.leaveType}</td>
                                                    <td>{formatDateTime(leave.fromDateTime)}</td>
                                                    <td>{formatDateTime(leave.toDateTime)}</td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                    <td>{leave.approvedBy?.name || (leave.aiDecision ? 'AI System' : '-')}</td>
                                                    <td>
                                                        {leave.status === 'PENDING' || leave.status === 'FLAGGED' ? (
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => openDecisionModal(leave._id, leave.studentId?.name || 'Student', leave.reason)}
                                                            >
                                                                Review
                                                            </button>
                                                        ) : (
                                                            <span className={`badge ${getRiskBadgeClass(leave.riskCategory)}`}>
                                                                {leave.riskCategory || 'LOW'} ({leave.riskScore || 0})
                                                            </span>
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
                        <h1>Attendance Management</h1>
                        <div className="filters-container card">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="attendanceDate">Date</label>
                                    <input
                                        type="date"
                                        id="attendanceDate"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="hostelFilter">Hostel Block Filter</label>
                                    <input
                                        type="text"
                                        id="hostelFilter"
                                        placeholder="e.g., Block A"
                                        value={hostelFilter}
                                        onChange={(e) => setHostelFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3>Student List</h3>
                                <button className="btn btn-primary" onClick={handleSaveAttendance} style={{ width: 'auto' }}>
                                    Save Attendance Changes
                                </button>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Block / Room</th>
                                            <th>Current Status</th>
                                            <th>Mark Attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody id="attendanceMarkTable">
                                        {attendanceLoading ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">Loading...</td>
                                            </tr>
                                        ) : attendanceRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">No students found</td>
                                            </tr>
                                        ) : (
                                            attendanceRecords.map(item => (
                                                <tr key={item.student?.id}>
                                                    <td>{item.student?.name}</td>
                                                    <td>{item.student?.hostelBlock || '-'} / {item.student?.roomNo || '-'}</td>
                                                    <td>
                                                        {item.status === 'NOT_MARKED' ? (
                                                            <span className="badge badge-pending">Not Marked</span>
                                                        ) : (
                                                            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                                {item.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="attendance-select"
                                                            value={item.status === 'NOT_MARKED' ? '' : item.status}
                                                            onChange={(e) => handleAttendanceSelectChange(item.student?.id, e.target.value)}
                                                        >
                                                            <option value="">-- Select --</option>
                                                            <option value="PRESENT">Present</option>
                                                            <option value="ABSENT">Absent</option>
                                                            <option value="ON_LEAVE">On Leave</option>
                                                        </select>
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

                {activeSection === 'out-students' && (
                    <section id="out-students-section">
                        <h1>Students Currently Out of Hostel</h1>
                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Block / Room</th>
                                            <th>Phone</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="outStudentsTable">
                                        {outStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="empty-state">No students currently out</td>
                                            </tr>
                                        ) : (
                                            outStudents.map(item => (
                                                <tr key={item._id}>
                                                    <td>{item.student?.name || 'Unknown'}</td>
                                                    <td>{item.student?.hostelBlock || '-'} / {item.student?.roomNo || '-'}</td>
                                                    <td>{item.student?.phone || '-'}</td>
                                                    <td>{formatDateTime(item.fromDateTime)}</td>
                                                    <td>{formatDateTime(item.toDateTime)}</td>
                                                    <td>
                                                        {item.isOverstayed ? (
                                                            <span className="badge badge-overstay">OVERSTAYED</span>
                                                        ) : (
                                                            <span className="badge badge-out">OUT</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleForceReturn(item._id)}>
                                                            Force Return
                                                        </button>
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

                {activeSection === 'reports' && (
                    <section id="reports-section">
                        <h1>Reports & CSV Exports</h1>
                        <div className="grid grid-3">
                            {/* Leave Reports */}
                            <div className="card">
                                <h3>Leave Reports</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Download CSV containing leave requests within date range</p>
                                <div className="form-group">
                                    <label>From Date</label>
                                    <input type="date" value={reportLeavesFrom} onChange={(e) => setReportLeavesFrom(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>To Date</label>
                                    <input type="date" value={reportLeavesTo} onChange={(e) => setReportLeavesTo(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={() => handleDownloadReport('leaves')}>Export Leaves CSV</button>
                            </div>

                            {/* Attendance Reports */}
                            <div className="card">
                                <h3>Attendance Reports</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Download CSV containing attendance statistics for specific date</p>
                                <div className="form-group">
                                    <label>Attendance Date</label>
                                    <input type="date" value={reportAttDate} onChange={(e) => setReportAttDate(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={() => handleDownloadReport('attendance')} style={{ marginTop: '55px' }}>Export Attendance CSV</button>
                            </div>

                            {/* Gate pass reports */}
                            <div className="card">
                                <h3>Gate Pass / Log Reports</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Download CSV containing student movement gate logs</p>
                                <div className="form-group">
                                    <label>From Date</label>
                                    <input type="date" value={reportGateFrom} onChange={(e) => setReportGateFrom(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>To Date</label>
                                    <input type="date" value={reportGateTo} onChange={(e) => setReportGateTo(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={() => handleDownloadReport('gate-logs')}>Export Gate Logs CSV</button>
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'calendar' && (
                    <section id="calendar-section">
                        <h1>Academic Calendar & Policy Rules</h1>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                            <div className="card">
                                <h3>Add Restriction Rule</h3>
                                <form id="calendarForm" onSubmit={handleCreateCalendarEvent}>
                                    <div className="form-group">
                                        <label htmlFor="eventTitle">Event Title / Holiday</label>
                                        <input
                                            type="text"
                                            id="eventTitle"
                                            required
                                            placeholder="e.g., Diwali Break"
                                            value={calTitle}
                                            onChange={(e) => setCalTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="eventType">Event Type</label>
                                        <select id="eventType" value={calType} onChange={(e) => setCalType(e.target.value)}>
                                            <option value="HOLIDAY">Holiday</option>
                                            <option value="EXAM">Exam Period</option>
                                            <option value="EVENT">College Event</option>
                                            <option value="OTHER">Other Restriction</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="eventStart">Start Date</label>
                                        <input
                                            type="date"
                                            id="eventStart"
                                            required
                                            value={calStart}
                                            onChange={(e) => setCalStart(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="eventEnd">End Date</label>
                                        <input
                                            type="date"
                                            id="eventEnd"
                                            required
                                            value={calEnd}
                                            onChange={(e) => setCalEnd(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="leavePolicy">Auto-Policy Action</label>
                                        <select id="leavePolicy" value={calPolicy} onChange={(e) => setCalPolicy(e.target.value)}>
                                            <option value="RESTRICTED">Flag & Block Regular Leaves</option>
                                            <option value="AUTO_APPROVE">Auto-Approve Requests</option>
                                            <option value="NORMAL">Normal Processing</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="eventDescription">Description</label>
                                        <textarea
                                            id="eventDescription"
                                            placeholder="Description details..."
                                            value={calDesc}
                                            onChange={(e) => setCalDesc(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary">Add Event to Calendar</button>
                                </form>
                                {calMsg.text && (
                                    <div className={`message ${calMsg.type}`} style={{ marginTop: '16px' }}>
                                        {calMsg.text}
                                    </div>
                                )}
                            </div>

                            <div className="card">
                                <h3>Calendar Policies</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Start</th>
                                                <th>End</th>
                                                <th>Policy</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="calendarEventsTable">
                                            {calendarEvents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="empty-state">No calendar events found</td>
                                                </tr>
                                            ) : (
                                                calendarEvents.map(event => (
                                                    <tr key={event._id}>
                                                        <td>{event.title}</td>
                                                        <td>
                                                            <span className={`badge badge-calendar-${event.eventType.toLowerCase()}`}>
                                                                {event.eventType}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(event.startDate)}</td>
                                                        <td>{formatDate(event.endDate)}</td>
                                                        <td>
                                                            <span className={`badge badge-policy-${event.leavePolicy.toLowerCase()}`}>
                                                                {event.leavePolicy}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCalendarEvent(event._id)}>
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'mongodb-analytics' && (
                    <section id="mongodb-analytics-section">
                        <h1>Advanced Database Analytics (MongoDB Aggregation Pipelines)</h1>

                        {/* Navigation Tabs for Analytics */}
                        <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button
                                className={`tab btn ${analyticsTab === 'risk-distribution' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleSwitchAnalyticsTab('risk-distribution')}
                            >
                                Risk Distribution
                            </button>
                            <button
                                className={`tab btn ${analyticsTab === 'leave-statistics' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleSwitchAnalyticsTab('leave-statistics')}
                            >
                                Leave Statistics
                            </button>
                            <button
                                className={`tab btn ${analyticsTab === 'attendance-hostel' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleSwitchAnalyticsTab('attendance-hostel')}
                            >
                                Attendance by Hostel
                            </button>
                        </div>

                        {/* Risk Distribution Tab */}
                        {analyticsTab === 'risk-distribution' && (
                            <div className="card">
                                <h3>Risk Category Distribution Summary</h3>
                                <p className="section-description">Computed aggregations via MongoDB pipeline: $group, $avg, $min, $max</p>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Risk Category</th>
                                                <th>Student Count</th>
                                                <th>Avg Risk Score</th>
                                                <th>Risk Range</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsLoading ? (
                                                <tr><td colSpan="4" className="empty-state">Loading...</td></tr>
                                            ) : riskDistData.length === 0 ? (
                                                <tr><td colSpan="4" className="empty-state">No data available</td></tr>
                                            ) : (
                                                riskDistData.map((item, index) => {
                                                    const riskCategory = item.riskCategory ?? item._id ?? 'N/A';
                                                    const count = item.studentCount ?? item.count ?? 0;
                                                    const avg = item.averageRiskScore ?? item.avgRiskScore;
                                                    const min = item.minRiskScore ?? 0;
                                                    const max = item.maxRiskScore ?? 0;
                                                    return (
                                                        <tr key={index}>
                                                            <td><strong>{riskCategory}</strong></td>
                                                            <td>{count}</td>
                                                            <td>{formatNumber(avg, 2)}</td>
                                                            <td>{formatNumber(min, 2)} - {formatNumber(max, 2)}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Leave Statistics Tab */}
                        {analyticsTab === 'leave-statistics' && (
                            <div className="card">
                                <h3>Leave Statistics by Type & Status</h3>
                                <p className="section-description">Aggregated leave data with computed averages using $divide and $subtract operations</p>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Leave Type</th>
                                                <th>Status</th>
                                                <th>Total Requests</th>
                                                <th>Avg Duration (Days)</th>
                                                <th>Total Days Covered</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsLoading ? (
                                                <tr><td colSpan="5" className="empty-state">Loading...</td></tr>
                                            ) : leaveStatsData.length === 0 ? (
                                                <tr><td colSpan="5" className="empty-state">No data available</td></tr>
                                            ) : (
                                                leaveStatsData.map((item, index) => {
                                                    const averageDurationDays = item.averageDurationDays ?? item.avgDurationDays;
                                                    const totalDaysCovered = item.totalDaysCovered ?? item.totalDays;
                                                    return (
                                                        <tr key={index}>
                                                            <td>{item.leaveType || 'N/A'}</td>
                                                            <td>
                                                                <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                                    {item.status || 'UNKNOWN'}
                                                                </span>
                                                            </td>
                                                            <td>{item.totalRequests ?? 0}</td>
                                                            <td>{formatNumber(averageDurationDays, 2)}</td>
                                                            <td>{formatNumber(totalDaysCovered, 2)}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Attendance by Hostel Tab */}
                        {analyticsTab === 'attendance-hostel' && (
                            <div className="card">
                                <h3>Attendance Summary by Hostel</h3>
                                <p className="section-description">Hostel-wise statistics using $lookup (JOIN) and $cond (conditional counting)</p>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Hostel Block</th>
                                                <th>Total Students</th>
                                                <th>Avg Attendance %</th>
                                                <th>Avg Risk Score</th>
                                                <th>Risk Breakdown (H/M/L)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsLoading ? (
                                                <tr><td colSpan="5" className="empty-state">Loading...</td></tr>
                                            ) : attHostelData.length === 0 ? (
                                                <tr><td colSpan="5" className="empty-state">No data available</td></tr>
                                            ) : (
                                                attHostelData.map((item, index) => {
                                                    const averageAttendancePercentage = item.averageAttendancePercentage ?? item.avgAttendancePercentage;
                                                    const averageRiskScore = item.averageRiskScore ?? item.avgRiskScore;
                                                    const highRisk = item.highRiskStudents ?? item.highRiskCount ?? 0;
                                                    const mediumRisk = item.mediumRiskStudents ?? item.mediumRiskCount ?? 0;
                                                    const lowRisk = item.lowRiskStudents ?? item.lowRiskCount ?? 0;
                                                    return (
                                                        <tr key={index}>
                                                            <td><strong>{item.hostelBlock || 'N/A'}</strong></td>
                                                            <td>{item.totalStudents ?? 0}</td>
                                                            <td>{formatNumber(averageAttendancePercentage, 1)}%</td>
                                                            <td>{formatNumber(averageRiskScore, 2)}</td>
                                                            <td>
                                                                <small>H:{highRisk} M:{mediumRisk} L:{lowRisk}</small>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Refresh Button */}
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button className="btn btn-primary" onClick={handleRefreshAnalytics} style={{ width: 'auto', padding: '12px 30px' }}>
                                Refresh All Analytics
                            </button>
                        </div>
                    </section>
                )}
            </main>

            {/* Decision Modal */}
            {decisionModal.show && (
                <div className="modal-overlay" onClick={closeDecisionModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 id="modalTitle">Leave Request - {decisionModal.studentName}</h3>
                        <div id="modalLeaveInfo">
                            <p><strong>Reason:</strong> {decisionModal.reason}</p>
                        </div>
                        <div className="form-group">
                            <label htmlFor="decisionRemarks">Remarks</label>
                            <textarea
                                id="decisionRemarks"
                                placeholder="Enter remarks (optional)"
                                value={decisionModal.remarks}
                                onChange={(e) => setDecisionModal(prev => ({ ...prev, remarks: e.target.value }))}
                            ></textarea>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-success" onClick={() => submitDecision('APPROVE')}>Approve</button>
                            <button className="btn btn-danger" onClick={() => submitDecision('REJECT')}>Reject</button>
                            <button className="btn btn-secondary" onClick={closeDecisionModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast.text && (
                <div className={`message ${toast.type}`} style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    padding: '16px 24px',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    {toast.text}
                </div>
            )}
        </div>
    );
};

export default WardenDashboard;
