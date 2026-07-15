import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/image.png';
import thaparBg from '../assets/1.jpg';

const Auth = () => {
    const { user, login, register } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Login Form State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register Form State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState('student');
    const [regHostel, setRegHostel] = useState('');
    const [regRoom, setRegRoom] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regParentPhone, setRegParentPhone] = useState('');

    // Password Checks
    const [pwChecks, setPwChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false
    });

    useEffect(() => {
        if (user) {
            redirectToDashboard(user.role);
        }
    }, [user]);

    const redirectToDashboard = (role) => {
        if (role === 'student') navigate('/student');
        else if (role === 'warden' || role === 'admin') navigate('/warden');
        else if (role === 'guard') navigate('/guard');
    };

    const handlePasswordChange = (val) => {
        setRegPassword(val);
        setPwChecks({
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            lower: /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(val)
        });
    };

    const getPasswordScore = () => {
        return Object.values(pwChecks).filter(Boolean).length;
    };

    const isPasswordStrong = () => {
        return getPasswordScore() >= 4;
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await login(loginEmail, loginPassword);
            if (res.success) {
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => redirectToDashboard(res.data.user.role), 1000);
            } else {
                showMessage(res.message || 'Login failed', 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Login failed', 'error');
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordStrong()) {
            showMessage('Password does not meet requirements!', 'error');
            return;
        }

        const userData = {
            name: regName,
            email: regEmail,
            password: regPassword,
            role: regRole,
            hostelBlock: regHostel,
            roomNo: regRoom,
            phone: regPhone,
            parentPhone: regParentPhone
        };

        try {
            const res = await register(userData);
            if (res.success) {
                showMessage('Registration successful! Redirecting...', 'success');
                setTimeout(() => redirectToDashboard(res.data.user.role), 1000);
            } else {
                showMessage(res.message || 'Registration failed', 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Registration failed', 'error');
        }
    };

    const toggleForms = () => {
        setIsLogin(!isLogin);
        setMessage({ text: '', type: '' });
    };

    const score = getPasswordScore();
    let strengthClass = '';
    if (score <= 2) strengthClass = 'weak';
    else if (score <= 3) strengthClass = 'fair';
    else if (score <= 4) strengthClass = 'good';
    else strengthClass = 'strong';

    return (
        <div className="auth-page-container" style={{ backgroundImage: `url(${thaparBg})` }}>
            <div className="auth-card" style={{ zIndex: 2 }}>
                <div className="theme-toggle" onClick={toggleTheme} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 3 }}>
                    <svg className="theme-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {theme === 'dark' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        )}
                    </svg>
                </div>
                <h1>
                    <img src={logo} alt="Smart Hostel" className="logo" /> Smart Hostel
                </h1>
                <p className="subtitle">Leave & Attendance Management System</p>

                {isLogin ? (
                    <div id="loginForm" className="form-container">
                        <h2>Login</h2>
                        <form onSubmit={handleLoginSubmit}>
                            <div className="form-group">
                                <label htmlFor="loginEmail">Email</label>
                                <input
                                    type="email"
                                    id="loginEmail"
                                    required
                                    placeholder="Enter your email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="loginPassword">Password</label>
                                <input
                                    type="password"
                                    id="loginPassword"
                                    required
                                    placeholder="Enter your password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" id="login">Login</button>
                        </form>
                        <p className="toggle-text">
                            Don't have an account? <a href="#" onClick={toggleForms} id="register">Register</a>
                        </p>
                    </div>
                ) : (
                    <div id="registerForm" className="form-container">
                        <h2>Register</h2>
                        <form onSubmit={handleRegisterSubmit}>
                            <div className="form-group">
                                <label htmlFor="regName">Full Name</label>
                                <input
                                    type="text"
                                    id="regName"
                                    required
                                    placeholder="Enter your full name"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="regEmail">Email</label>
                                <input
                                    type="email"
                                    id="regEmail"
                                    required
                                    placeholder="Enter your email"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="regPassword">Password</label>
                                <input
                                    type="password"
                                    id="regPassword"
                                    required
                                    placeholder="Enter your password"
                                    minLength="8"
                                    value={regPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                />
                                <div className="password-strength" id="passwordStrength">
                                    <div className="strength-bar">
                                        <div
                                            className={`strength-fill ${strengthClass}`}
                                            id="strengthFill"
                                            style={{ width: `${(score / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="strength-requirements">
                                        <div className={`requirement ${pwChecks.length ? 'met' : 'unmet'}`} id="req-length">
                                            <span className="req-icon"></span> At least 8 characters
                                        </div>
                                        <div className={`requirement ${pwChecks.upper ? 'met' : 'unmet'}`} id="req-upper">
                                            <span className="req-icon"></span> One uppercase letter
                                        </div>
                                        <div className={`requirement ${pwChecks.lower ? 'met' : 'unmet'}`} id="req-lower">
                                            <span className="req-icon"></span> One lowercase letter
                                        </div>
                                        <div className={`requirement ${pwChecks.number ? 'met' : 'unmet'}`} id="req-number">
                                            <span className="req-icon"></span> One number
                                        </div>
                                        <div className={`requirement ${pwChecks.special ? 'met' : 'unmet'}`} id="req-special">
                                            <span className="req-icon"></span> One special character
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="regRole">Role</label>
                                <select id="regRole" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                                    <option value="student">Student</option>
                                    <option value="warden">Warden</option>
                                    <option value="guard">Guard</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="regHostel">Hostel Block</label>
                                <input
                                    type="text"
                                    id="regHostel"
                                    placeholder="e.g., Block A"
                                    value={regHostel}
                                    onChange={(e) => setRegHostel(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="regRoom">Room Number</label>
                                <input
                                    type="text"
                                    id="regRoom"
                                    placeholder="e.g., 101"
                                    value={regRoom}
                                    onChange={(e) => setRegRoom(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="regPhone">Phone</label>
                                <input
                                    type="tel"
                                    id="regPhone"
                                    placeholder="Your phone number"
                                    value={regPhone}
                                    onChange={(e) => setRegPhone(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="regParentPhone">Parent Phone</label>
                                <input
                                    type="tel"
                                    id="regParentPhone"
                                    placeholder="Parent's phone number"
                                    value={regParentPhone}
                                    onChange={(e) => setRegParentPhone(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" name="register">Register</button>
                        </form>
                        <p className="toggle-text">
                            Already have an account? <a href="#" onClick={toggleForms}>Login</a>
                        </p>
                    </div>
                )}

                {message.text && (
                    <div id="message" className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;
