const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/gate', require('./routes/gate'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/ml', require('./routes/ml'));

// Health check route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Smart Hostel API is running!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            leaves: '/api/leaves',
            gate: '/api/gate',
            attendance: '/api/attendance',
            reports: '/api/reports',
            stats: '/api/stats',
            calendar: '/api/calendar',
            ml: '/api/ml'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
