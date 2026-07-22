import authService from './auth/authService';
import leaveService from './leaves/leaveService';
import gateService from './gate/gateService';
import attendanceService from './attendance/attendanceService';
import reportService from './reports/reportService';
import statsService from './stats/statsService';
import riskService from './risk/riskService';
import calendarService from './calendar/calendarService';

const api = {
    ...authService,
    ...leaveService,
    ...gateService,
    ...attendanceService,
    ...reportService,
    ...statsService,
    ...riskService,
    ...calendarService
};

export default api;
