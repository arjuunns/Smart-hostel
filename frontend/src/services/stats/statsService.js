import { request } from '../client';

const statsService = {
    async getMyStats() { return request('/stats/my-stats'); },
    async getMyRisk() { return request('/stats/my-risk'); },
    async getStudentStats(studentId) { return request(`/stats/student/${studentId}`); },
    async getHighRiskStudents() { return request('/stats/high-risk'); },
    async getRiskDistribution() { return request('/stats/distribution'); },
    async getRiskDistributionAggregation() { return request('/stats/aggregation/risk-distribution'); },
    async getLeaveStatisticsAggregation() { return request('/stats/aggregation/leave-statistics'); },
    async getAttendanceByHostelAggregation() { return request('/stats/aggregation/attendance-by-hostel'); },
    async getTopReliableStudentsAggregation(limit = 10) {
        return request(`/stats/aggregation/top-reliable-students?limit=${limit}`);
    }
};

export default statsService;
