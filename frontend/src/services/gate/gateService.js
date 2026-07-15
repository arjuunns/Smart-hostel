import { request, BASE_URL } from '../client';

const gateService = {
    async logExit(gatePassId) {
        return request('/gate/exit', { method: 'POST', body: JSON.stringify({ gatePassId }) });
    },
    async logEntry(gatePassId) {
        return request('/gate/entry', { method: 'POST', body: JSON.stringify({ gatePassId }) });
    },
    async getOutStudents() { return request('/gate/out'); },
    async forceReturn(leaveId, remarks) {
        return request(`/gate/force-return/${leaveId}`, { method: 'PATCH', body: JSON.stringify({ remarks }) });
    },
    async getGateLogs(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/gate/logs${params ? '?' + params : ''}`);
    }
};

export default gateService;
