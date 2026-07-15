import { request } from '../client';

const calendarService = {
    async getCurrentRestrictions() {
        return request('/calendar/current-restrictions');
    },

    async getUpcomingRestrictions(days = 14) {
        return request(`/calendar/upcoming-restrictions?days=${days}`);
    },

    async analyzeDates(fromDate, toDate) {
        return request('/calendar/analyze-dates', {
            method: 'POST',
            body: JSON.stringify({ fromDate, toDate })
        });
    },

    async getCalendarEvents() {
        return request('/calendar/all');
    },

    async createCalendarEvent(eventData) {
        return request('/calendar/event', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    },

    async deleteCalendarEvent(eventId) {
        return request(`/calendar/event/${eventId}`, {
            method: 'DELETE'
        });
    }
};

export default calendarService;
