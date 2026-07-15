import { request } from '../client';

const attendanceService = {
    async markAttendance(studentId, date, status) {
        return request('/attendance/mark', { method: 'POST', body: JSON.stringify({ studentId, date, status }) });
    },
    async markBulkAttendance(date, records) {
        return request('/attendance/mark-bulk', { method: 'POST', body: JSON.stringify({ date, records }) });
    },
    async getMyAttendance(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/attendance/mine${params ? '?' + params : ''}`);
    },
    async getAllAttendance(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/attendance/all${params ? '?' + params : ''}`);
    },
    async getStudentsForAttendance(hostelBlock = '') {
        const params = hostelBlock ? `?hostelBlock=${hostelBlock}` : '';
        return request(`/attendance/students${params}`);
    },
    async getAttendanceForDate(date) { return request(`/attendance/date/${date}`); }
};

export default attendanceService;
