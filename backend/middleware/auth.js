const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await prisma.user.findUnique({
                where: { id: parseInt(decoded.id) }
            });

            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            if (!user.isActive) {
                return res.status(401).json({ success: false, message: 'User account is deactivated' });
            }

            // Exclude passwordHash
            const { passwordHash, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;

            return next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

// Role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Role '${req.user.role}' is not authorized to access this route` 
                
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
