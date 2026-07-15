import { request } from '../client';

const leaveService = {
    async applyLeave(leaveData) {
        return request('/leaves/apply', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
    },

    async getMyLeaves() {
        return request('/leaves/mine');
    },

    async getPendingLeaves() {
        return request('/leaves/pending');
    },

    async getAllLeaves(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return request(`/leaves/all${params ? '?' + params : ''}`);
    },

    async getEmergencyLeaves() {
        return request('/leaves/emergency');
    },

    async decideLeave(leaveId, action, remarks) {
        return request(`/leaves/${leaveId}/decision`, {
            method: 'PATCH',
            body: JSON.stringify({ action, remarks })
        });
    },

    async getOverstayedStudents() {
        return request('/leaves/overstay');
    },

    async getLeave(leaveId) {
        return request(`/leaves/${leaveId}`);
    },

    async getFlaggedLeaves() {
        return request('/leaves/flagged');
    },

    async getAutoApprovedLeaves() {
        return request('/leaves/auto-approved');
    }
};

export default leaveService;
