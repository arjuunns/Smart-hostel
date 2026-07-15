import { request, BASE_URL } from '../client';

const reportService = {
    async getLeaveReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/reports/leaves${params ? '?' + params : ''}`);
    },

    async getAttendanceReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/reports/attendance${params ? '?' + params : ''}`);
    },

    async getGateLogsReport(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/reports/gate-logs${params ? '?' + params : ''}`);
    },

    downloadCSV(endpoint, filters = {}) {
        const params = new URLSearchParams({ ...filters, format: 'csv' }).toString();
        const token = localStorage.getItem('token');
        window.open(`${BASE_URL}${endpoint}?${params}&token=${token}`, '_blank');
    }
};

export default reportService;
