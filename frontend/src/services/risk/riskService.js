import { request } from '../client';

const riskService = {
    async predictLeave(leaveData) {
        return request('/risk/predict', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
    },

    async getPredictionForLeave(leaveId) {
        return request(`/risk/predict/${leaveId}`, {
            method: 'POST'
        });
    },

    async getBatchPredictions() {
        return request('/risk/predict-batch', {
            method: 'POST'
        });
    },

    async getStudentPatterns(studentId) {
        return request(`/risk/patterns/${studentId}`);
    },

    async getRiskDashboard() {
        return request('/risk/dashboard');
    },

    async getModelInfo() {
        return request('/risk/model-info');
    }
};

export default riskService;
