import authService from './auth/authService';
import leaveService from './leaves/leaveService';
import gateService from './gate/gateService';
import attendanceService from './attendance/attendanceService';
import reportService from './reports/reportService';
import statsService from './stats/statsService';
import mlService from './ml/mlService';
import calendarService from './calendar/calendarService';

const api = {
    ...authService,
    ...leaveService,
    ...gateService,
    ...attendanceService,
    ...reportService,
    ...statsService,
    ...mlService,
    ...calendarService
};

export default api;
