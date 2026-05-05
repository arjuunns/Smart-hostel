const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.log('📝 Make sure MongoDB is running or update MONGODB_URI in .env file');
        console.log('   You can use MongoDB Atlas (cloud) or install MongoDB locally');
        process.exit(1);
    }
};

module.exports = connectDB;
