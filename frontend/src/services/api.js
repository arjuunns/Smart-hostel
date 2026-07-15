const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://smart-hostel-rm2c.vercel.app/api';

const api = {
    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: this.getHeaders(),
                ...options
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('auth-change'));
                return { success: false, message: 'Session expired' };
            }

            const data = await response.json();
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
            window.dispatchEvent(new Event('auth-change'));
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
            window.dispatchEvent(new Event('auth-change'));
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

    downloadCSV(endpoint, filters = {}) {
        const params = new URLSearchParams({ ...filters, format: 'csv' }).toString();
        const token = localStorage.getItem('token');
        window.open(`${API_BASE_URL}${endpoint}?${params}&token=${token}`, '_blank');
    },

    // ===== ML PREDICTION ENDPOINTS =====
    async predictLeave(leaveData) {
        return this.request('/ml/predict', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
    },

    async getPredictionForLeave(leaveId) {
        return this.request(`/ml/predict/${leaveId}`, {
            method: 'POST'
        });
    },

    async getBatchPredictions() {
        return this.request('/ml/predict-batch', {
            method: 'POST'
        });
    },

    async getStudentPatterns(studentId) {
        return this.request(`/ml/patterns/${studentId}`);
    },

    async getMLDashboard() {
        return this.request('/ml/dashboard');
    },

    async getModelInfo() {
        return this.request('/ml/model-info');
    },

    // ===== STATS ENDPOINTS =====
    async getMyStats() {
        return this.request('/stats/my-stats');
    },

    async getMyRisk() {
        return this.request('/stats/my-risk');
    },

    async getStudentStats(studentId) {
        return this.request(`/stats/student/${studentId}`);
    },

    async getHighRiskStudents() {
        return this.request('/stats/high-risk');
    },

    async getRiskDistribution() {
        return this.request('/stats/distribution');
    },

    // ===== CALENDAR ENDPOINTS =====
    async getCurrentRestrictions() {
        return this.request('/calendar/current-restrictions');
    },

    async getUpcomingRestrictions(days = 14) {
        return this.request(`/calendar/upcoming-restrictions?days=${days}`);
    },

    async analyzeDates(fromDate, toDate) {
        return this.request('/calendar/analyze-dates', {
            method: 'POST',
            body: JSON.stringify({ fromDate, toDate })
        });
    },

    async getCalendarEvents() {
        return this.request('/calendar/all');
    },

    async createCalendarEvent(eventData) {
        return this.request('/calendar/event', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    },

    async deleteCalendarEvent(eventId) {
        return this.request(`/calendar/event/${eventId}`, {
            method: 'DELETE'
        });
    },

    async getFlaggedLeaves() {
        return this.request('/leaves/flagged');
    },

    async getAutoApprovedLeaves() {
        return this.request('/leaves/auto-approved');
    },

    // ===== MONGODB AGGREGATION ENDPOINTS =====
    async getRiskDistributionAggregation() {
        return this.request('/stats/aggregation/risk-distribution');
    },

    async getLeaveStatisticsAggregation() {
        return this.request('/stats/aggregation/leave-statistics');
    },

    async getAttendanceByHostelAggregation() {
        return this.request('/stats/aggregation/attendance-by-hostel');
    },

    async getTopReliableStudentsAggregation(limit = 10) {
        return this.request(`/stats/aggregation/top-reliable-students?limit=${limit}`);
    }
};

export default api;
