import { request } from '../client';

const authService = {
    async login(email, password) {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            window.dispatchEvent(new Event('auth-change'));
        }
        return data;
    },

    async register(userData) {
        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            window.dispatchEvent(new Event('auth-change'));
        }
        return data;
    },

    async getMe() {
        return request('/auth/me');
    }
};

export default authService;
