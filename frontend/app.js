// Smart Hostel - Main JavaScript

const API_BASE_URL = 'http://localhost:5000/api';

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
