const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('PostgreSQL Connected');
    } catch (error) {
        console.error(`PostgreSQL Connection Error: ${error.message}`);
    }
};

module.exports = {
    prisma,
    connectDB
};
