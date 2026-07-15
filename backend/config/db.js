const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Create a PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Create the Prisma Pg adapter
const adapter = new PrismaPg(pool);

// Instantiate the Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('✅ PostgreSQL Database Connected (via Prisma Client & Driver Adapter)');
    } catch (error) {
        console.error(`❌ PostgreSQL Connection Error: ${error.message}`);
        console.log('📝 Make sure your DATABASE_URL in the .env file is correct');
    }
};

module.exports = {
    prisma,
    connectDB
};
