import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import WardenDashboard from './pages/WardenDashboard';
import GuardDashboard from './pages/GuardDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, token } = useAuth();

    if (!token) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        if (user?.role === 'student') return <Navigate to="/student" replace />;
        if (user?.role === 'warden' || user?.role === 'admin') return <Navigate to="/warden" replace />;
        if (user?.role === 'guard') return <Navigate to="/guard" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { user, token } = useAuth();

    if (token && user) {
        if (user.role === 'student') return <Navigate to="/student" replace />;
        if (user.role === 'warden' || user.role === 'admin') return <Navigate to="/warden" replace />;
        if (user.role === 'guard') return <Navigate to="/guard" replace />;
    }

    return children;
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* Public Route for Login / Register */}
                        <Route path="/" element={
                            <PublicRoute>
                                <Auth />
                            </PublicRoute>
                        } />

                        {/* Student Routes */}
                        <Route path="/student" element={
                            <ProtectedRoute allowedRoles={['student']}>
                                <StudentDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Warden & Admin Routes */}
                        <Route path="/warden" element={
                            <ProtectedRoute allowedRoles={['warden', 'admin']}>
                                <WardenDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Guard Routes */}
                        <Route path="/guard" element={
                            <ProtectedRoute allowedRoles={['guard']}>
                                <GuardDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
