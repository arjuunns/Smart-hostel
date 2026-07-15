import { request } from '../client';

const mlService = {
    async predictLeave(leaveData) {
        return request('/ml/predict', { method: 'POST', body: JSON.stringify(leaveData) });
    },
    async getPredictionForLeave(leaveId) {
        return request(`/ml/predict/${leaveId}`, { method: 'POST' });
    },
    async getBatchPredictions() {
        return request('/ml/predict-batch', { method: 'POST' });
    },
    async getStudentPatterns(studentId) { return request(`/ml/patterns/${studentId}`); },
    async getMLDashboard() { return request('/ml/dashboard'); },
    async getModelInfo() { return request('/ml/model-info'); }
};

export default mlService;
