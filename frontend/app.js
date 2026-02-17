// Smart Hostel - Main JavaScript

const API_BASE_URL = 'https://smart-hostel-rm2c.vercel.app/api';

// Theme Management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Initialize theme on page load
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
})();

// API Helper
const api = {
    // Get headers with auth token
    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: this.getHeaders(),
                ...options
            });
            const data = await response.json();
            
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return;
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        return data;
    },

    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        return data;
    },

    async getMe() {
        return this.request('/auth/me');
    },

    // Leave endpoints
    async applyLeave(leaveData) {
        return this.request('/leaves/apply', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
    },

    async getMyLeaves() {
        return this.request('/leaves/mine');
    },

    async getPendingLeaves() {
        return this.request('/leaves/pending');
    },

    async getAllLeaves(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/leaves/all${params ? '?' + params : ''}`);
    },

    async getEmergencyLeaves() {
        return this.request('/leaves/emergency');
    },

    async decideLeave(leaveId, action, remarks) {
        return this.request(`/leaves/${leaveId}/decision`, {
            method: 'PATCH',
            body: JSON.stringify({ action, remarks })
        });
    },

    async getOverstayedStudents() {
        return this.request('/leaves/overstay');
    },

    async getLeave(leaveId) {
        return this.request(`/leaves/${leaveId}`);
    },

    // Gate endpoints
    async logExit(gatePassId) {
        return this.request('/gate/exit', {
            method: 'POST',
            body: JSON.stringify({ gatePassId })
        });
    },

    async logEntry(gatePassId) {
        return this.request('/gate/entry', {
            method: 'POST',
            body: JSON.stringify({ gatePassId })
        });
    },

    async getOutStudents() {
        return this.request('/gate/out');
    },

    async forceReturn(leaveId, remarks) {
        return this.request(`/gate/force-return/${leaveId}`, {
            method: 'PATCH',
            body: JSON.stringify({ remarks })
        });
    },

    async getGateLogs(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/gate/logs${params ? '?' + params : ''}`);
    },

    // Attendance endpoints
    async markAttendance(studentId, date, status) {
        return this.request('/attendance/mark', {
            method: 'POST',
            body: JSON.stringify({ studentId, date, status })
        });
    },

    async markBulkAttendance(date, records) {
        return this.request('/attendance/mark-bulk', {
            method: 'POST',
            body: JSON.stringify({ date, records })
        });
    },

    async getMyAttendance(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/attendance/mine${params ? '?' + params : ''}`);
    },

    async getAllAttendance(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/attendance/all${params ? '?' + params : ''}`);
    },

    async getStudentsForAttendance(hostelBlock = '') {
        const params = hostelBlock ? `?hostelBlock=${hostelBlock}` : '';
        return this.request(`/attendance/students${params}`);
    },

    async getAttendanceForDate(date) {
        return this.request(`/attendance/date/${date}`);
    },

    // Reports endpoints
    async getLeaveReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/reports/leaves${params ? '?' + params : ''}`);
    },

    async getAttendanceReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/reports/attendance${params ? '?' + params : ''}`);
    },

    async getGateLogsReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/reports/gate-logs${params ? '?' + params : ''}`);
    },

    // Download CSV
    downloadCSV(endpoint, filters = {}) {
        const params = new URLSearchParams({ ...filters, format: 'csv' }).toString();
        const token = localStorage.getItem('token');
        window.open(`${API_BASE_URL}${endpoint}?${params}&token=${token}`, '_blank');
    },

    // ===== PREDICTION ENDPOINTS =====

    // Get prediction before applying leave
    async predictLeave(leaveData) {
        return this.request('/ml/predict', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
    },

    // Get prediction for existing leave
    async getPredictionForLeave(leaveId) {
        return this.request(`/ml/predict/${leaveId}`, {
            method: 'POST'
        });
    },

    // Get batch predictions for all pending leaves
    async getBatchPredictions() {
        return this.request('/ml/predict-batch', {
            method: 'POST'
        });
    },

    // Get student patterns
    async getStudentPatterns(studentId) {
        return this.request(`/ml/patterns/${studentId}`);
    },

    // Get system dashboard
    async getPredictionDashboard() {
        return this.request('/ml/dashboard');
    },

    // Get model info
    async getModelInfo() {
        return this.request('/ml/model-info');
    },

    // ===== STATS ENDPOINTS =====

    // Get my stats
    async getMyStats() {
        return this.request('/stats/my-stats');
    },

    // Get my risk assessment
    async getMyRisk() {
        return this.request('/stats/my-risk');
    },

    // Get student stats (warden)
    async getStudentStats(studentId) {
        return this.request(`/stats/student/${studentId}`);
    },

    // Get high risk students
    async getHighRiskStudents() {
        return this.request('/stats/high-risk');
    },

    // Get risk distribution
    async getRiskDistribution() {
        return this.request('/stats/distribution');
    },

    // ===== CALENDAR ENDPOINTS =====

    // Get current restrictions
    async getCurrentRestrictions() {
        return this.request('/calendar/current-restrictions');
    },

    // Get upcoming restrictions
    async getUpcomingRestrictions(days = 14) {
        return this.request(`/calendar/upcoming-restrictions?days=${days}`);
    },

    // Analyze dates
    async analyzeDates(fromDate, toDate) {
        return this.request('/calendar/analyze-dates', {
            method: 'POST',
            body: JSON.stringify({ fromDate, toDate })
        });
    },

    // Get all calendar events
    async getCalendarEvents() {
        return this.request('/calendar/all');
    },

    // Create calendar event
    async createCalendarEvent(eventData) {
        return this.request('/calendar/event', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    },

    // Delete calendar event
    async deleteCalendarEvent(eventId) {
        return this.request(`/calendar/event/${eventId}`, {
            method: 'DELETE'
        });
    },

    // Get flagged leaves
    async getFlaggedLeaves() {
        return this.request('/leaves/flagged');
    },

    // Get auto-approved leaves
    async getAutoApprovedLeaves() {
        return this.request('/leaves/auto-approved');
    }
};

// Utility functions
const utils = {
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getStatusBadge(status) {
        const statusLower = status.toLowerCase().replace('_', '');
        return `<span class="badge badge-${statusLower}">${status}</span>`;
    },

    getRiskBadge(riskCategory, riskScore) {
        const categoryLower = riskCategory?.toLowerCase() || 'low';
        return `<span class="badge badge-risk-${categoryLower}">${riskCategory || 'LOW'} (${riskScore || 0})</span>`;
    },

    getRiskColor(riskScore) {
        if (riskScore <= 30) return '#10b981'; // Green
        if (riskScore <= 60) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    },

    getRiskLabel(riskScore) {
        if (riskScore <= 20) return { text: 'Excellent', class: 'low' };
        if (riskScore <= 40) return { text: 'Good', class: 'low' };
        if (riskScore <= 60) return { text: 'Moderate', class: 'medium' };
        if (riskScore <= 80) return { text: 'High Risk', class: 'high' };
        return { text: 'Very High Risk', class: 'high' };
    },

    getApprovalLikelihood(riskScore) {
        if (riskScore <= 20) return { text: 'Very Likely', percent: '95%', class: 'high' };
        if (riskScore <= 40) return { text: 'Likely', percent: '80%', class: 'high' };
        if (riskScore <= 60) return { text: 'Moderate', percent: '60%', class: 'medium' };
        if (riskScore <= 80) return { text: 'Unlikely', percent: '30%', class: 'low' };
        return { text: 'Very Unlikely', percent: '10%', class: 'low' };
    },

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    },

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Generate QR Code URL (using external API for MVP)
    generateQRUrl(data) {
        const qrData = encodeURIComponent(JSON.stringify(data));
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
    },

    showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `message ${type}`;
        toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 16px 24px; border-radius: 8px; animation: slideIn 0.3s ease;';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// Initialize user info in sidebar
function initSidebar() {
    const user = utils.getCurrentUser();
    if (user) {
        const nameEl = document.querySelector('.sidebar .user-info .name');
        const roleEl = document.querySelector('.sidebar .user-info .role');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role;
    }
}

// Export for global use
window.api = api;
window.utils = utils;
window.initSidebar = initSidebar;
