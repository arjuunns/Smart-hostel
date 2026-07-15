import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import logo from '../assets/image.png';
import { formatDateTime } from '../utils/helpers';

const GuardDashboard = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, accent, setAccent } = useTheme();
    const [activeSection, setActiveSection] = useState('scan');

    // Stats
    const [stats, setStats] = useState({ outCount: 0, exitsToday: 0, entriesToday: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    
    // Scanner Form
    const [gatePassInput, setGatePassInput] = useState('');
    const [scanResult, setScanResult] = useState({ text: '', type: '', student: '', isOverstayed: false });

    // Out List & Overstayed States
    const [outStudents, setOutStudents] = useState([]);
    const [overstayedStudents, setOverstayedStudents] = useState([]);

    // Sidebar Responsive Toggle
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Logs States
    const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [logAction, setLogAction] = useState('');
    const [gateLogs, setGateLogs] = useState([]);

    useEffect(() => {
        if (activeSection === 'scan') {
            loadDashboardStats();
            loadRecentActivity();
        } else if (activeSection === 'out-list') {
            loadOutStudents();
        } else if (activeSection === 'logs') {
            loadGateLogs();
        }
    }, [activeSection, logDate, logAction]);

    // Auto-refresh stats/activity every 30 seconds when on scan screen
    useEffect(() => {
        if (activeSection !== 'scan') return;
        const interval = setInterval(() => {
            loadDashboardStats();
            loadRecentActivity();
        }, 30000);
        return () => clearInterval(interval);
    }, [activeSection]);

    const loadDashboardStats = async () => {
        try {
            const outRes = await api.getOutStudents();
            let outCount = 0;
            if (outRes.success) {
                outCount = outRes.count;
            }

            const today = new Date().toISOString().split('T')[0];
            const logsRes = await api.getGateLogs({ date: today });
            let exitsToday = 0;
            let entriesToday = 0;
            if (logsRes.success) {
                exitsToday = logsRes.data.filter(l => l.action === 'EXIT').length;
                entriesToday = logsRes.data.filter(l => l.action === 'ENTRY').length;
            }

            setStats({ outCount, exitsToday, entriesToday });
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    const loadRecentActivity = async () => {
        try {
            const res = await api.getGateLogs({});
            if (res.success) {
                setRecentActivity(res.data.slice(0, 10));
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    };

    const loadOutStudents = async () => {
        try {
            const res = await api.getOutStudents();
            if (res.success) {
                setOutStudents(res.data || []);
                const overstayed = res.data.filter(s => s.isOverstayed) || [];
                setOverstayedStudents(overstayed);
            }
        } catch (error) {
            console.error('Error loading out students:', error);
        }
    };

    const loadGateLogs = async () => {
        try {
            const filters = {};
            if (logDate) filters.date = logDate;
            if (logAction) filters.action = logAction;

            const res = await api.getGateLogs(filters);
            if (res.success) {
                setGateLogs(res.data || []);
            }
        } catch (error) {
            console.error('Error loading gate logs:', error);
        }
    };

    const processGatePass = async (actionType) => {
        setScanResult({ text: '', type: '', student: '', isOverstayed: false });
        const gpId = gatePassInput.trim().toUpperCase();
        if (!gpId) {
            setScanResult({ text: 'Please enter a Gate Pass ID', type: 'error', student: '', isOverstayed: false });
            return;
        }

        try {
            let res;
            if (actionType === 'exit') {
                res = await api.logExit(gpId);
            } else {
                res = await api.logEntry(gpId);
            }

            if (res.success) {
                setScanResult({
                    text: `${actionType === 'exit' ? 'EXIT' : 'ENTRY'} Recorded!`,
                    type: 'success',
                    student: res.data.student,
                    isOverstayed: res.data.isOverstayed
                });
                setGatePassInput('');
                loadDashboardStats();
                loadRecentActivity();
            } else {
                setScanResult({ text: res.message || 'Operation failed', type: 'error', student: '', isOverstayed: false });
            }
        } catch (error) {
            setScanResult({ text: 'Error processing gate pass', type: 'error', student: '', isOverstayed: false });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            processGatePass('exit');
        }
    };

    const getOverstayDuration = (toDateTime) => {
        const now = new Date();
        const expected = new Date(toDateTime);
        const diffMs = now - expected;
        if (diffMs <= 0) return '0h 0m';
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}m`;
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
                    <div className="name">{user?.name || 'Guard'}</div>
                    <div className="role">{user?.role?.toUpperCase() || 'GUARD'}</div>
                </div>
                <nav>
                    <a
                        href="#"
                        className={activeSection === 'scan' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('scan'); setSidebarOpen(false); }}
                    >
                        Scan Gate Pass
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'out-list' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('out-list'); setSidebarOpen(false); }}
                    >
                        Out Students
                    </a>
                    <a
                        href="#"
                        className={activeSection === 'logs' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setActiveSection('logs'); setSidebarOpen(false); }}
                    >
                        Gate Logs
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
                {activeSection === 'scan' && (
                    <section id="scan-section">
                        <h1>Gate Pass Scanner</h1>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value" id="outCount">{stats.outCount}</div>
                                <div className="stat-label">Students Currently Out</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="todayExits">{stats.exitsToday}</div>
                                <div className="stat-label">Today's Exits</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" id="todayEntries">{stats.entriesToday}</div>
                                <div className="stat-label">Today's Entries</div>
                            </div>
                        </div>

                        <div className="card">
                            <h3>Manual Gate Pass Entry</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Enter the Gate Pass ID shown on the student's QR code
                            </p>

                            <div className="manual-entry">
                                <div className="form-group">
                                    <label htmlFor="gatePassInput">Gate Pass ID</label>
                                    <input
                                        type="text"
                                        id="gatePassInput"
                                        placeholder="GP-XXXXX-XXXXX"
                                        style={{ fontSize: '18px', textTransform: 'uppercase' }}
                                        value={gatePassInput}
                                        onChange={(e) => setGatePassInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                </div>

                                <div className="action-buttons" style={{ justifyContent: 'center', marginTop: '20px', display: 'flex', gap: '16px' }}>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => processGatePass('exit')}
                                        style={{ padding: '16px 40px', fontSize: '16px', width: 'auto' }}
                                    >
                                        EXIT
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => processGatePass('entry')}
                                        style={{ padding: '16px 40px', fontSize: '16px', width: 'auto' }}
                                    >
                                        ENTRY
                                    </button>
                                </div>
                            </div>

                            {scanResult.text && (
                                <div id="scanResult" className={`message ${scanResult.type}`} style={{ marginTop: '20px' }}>
                                    <strong>{scanResult.text}</strong>
                                    {scanResult.student && (
                                        <>
                                            <br />
                                            Student: {scanResult.student}
                                        </>
                                    )}
                                    {scanResult.isOverstayed && (
                                        <>
                                            <br />
                                            <strong style={{ color: 'var(--danger-color)' }}>
                                                Note: Student has overstayed!
                                            </strong>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <div className="card">
                            <h3>Recent Activity</h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Student</th>
                                            <th>Action</th>
                                            <th>Gate Pass</th>
                                        </tr>
                                    </thead>
                                    <tbody id="recentActivityTable">
                                        {recentActivity.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">No recent activity</td>
                                            </tr>
                                        ) : (
                                            recentActivity.map((log) => (
                                                <tr key={log._id}>
                                                    <td>{formatDateTime(log.timestamp)}</td>
                                                    <td>{log.studentId?.name || 'Unknown'}</td>
                                                    <td>
                                                        <span className={`badge badge-${log.action === 'EXIT' ? 'out' : 'in'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td><code>{log.gatePassId}</code></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'out-list' && (
                    <section id="out-list-section">
                        <h1>Students Currently Out</h1>

                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <span id="outListCount"><strong>{outStudents.length}</strong></span> students currently out
                                </div>
                                <button className="btn btn-secondary" onClick={loadOutStudents} style={{ width: 'auto' }}>
                                    Refresh
                                </button>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Hostel / Room</th>
                                            <th>Phone</th>
                                            <th>Left At</th>
                                            <th>Expected Return</th>
                                            <th>Status</th>
                                            <th>Gate Pass</th>
                                        </tr>
                                    </thead>
                                    <tbody id="outStudentsTable">
                                        {outStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="empty-state">No students currently out</td>
                                            </tr>
                                        ) : (
                                            outStudents.map((item) => (
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
                                                    <td><code>{item.gatePassId}</code></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Overstayed Alert */}
                        {overstayedStudents.length > 0 && (
                            <div className="card" id="overstayedCard" style={{ borderLeft: '4px solid var(--danger-color)' }}>
                                <h3>Overstayed Students Alert</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                                    These students have exceeded their leave period
                                </p>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Phone</th>
                                                <th>Expected Return</th>
                                                <th>Overdue By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overstayedStudents.map((item) => (
                                                <tr key={item._id}>
                                                    <td>{item.student?.name || 'Unknown'}</td>
                                                    <td>{item.student?.phone || '-'}</td>
                                                    <td>{formatDateTime(item.toDateTime)}</td>
                                                    <td>
                                                        <strong style={{ color: 'var(--danger-color)' }}>
                                                            {getOverstayDuration(item.toDateTime)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {activeSection === 'logs' && (
                    <section id="logs-section">
                        <h1>Gate Logs</h1>

                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="logDate">Date</label>
                                    <input
                                        type="date"
                                        id="logDate"
                                        value={logDate}
                                        onChange={(e) => setLogDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="logAction">Action</label>
                                    <select
                                        id="logAction"
                                        value={logAction}
                                        onChange={(e) => setLogAction(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="EXIT">Exit Only</option>
                                        <option value="ENTRY">Entry Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Student</th>
                                            <th>Hostel / Room</th>
                                            <th>Action</th>
                                            <th>Gate Pass ID</th>
                                        </tr>
                                    </thead>
                                    <tbody id="gateLogsTable">
                                        {gateLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="empty-state">No logs found</td>
                                            </tr>
                                        ) : (
                                            gateLogs.map((log) => (
                                                <tr key={log._id}>
                                                    <td>{formatDateTime(log.timestamp)}</td>
                                                    <td>{log.studentId?.name || 'Unknown'}</td>
                                                    <td>{log.studentId?.hostelBlock || '-'} / {log.studentId?.roomNo || '-'}</td>
                                                    <td>
                                                        <span className={`badge badge-${log.action === 'EXIT' ? 'out' : 'in'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td><code>{log.gatePassId}</code></td>
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
        </div>
    );
};

export default GuardDashboard;
