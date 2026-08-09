import express, { Request, Response } from 'express';
import mysql from './db';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import { authenticateToken } from './middleware/auth';
import productRoutes from './routes/products';
import deliveryRoutes from './routes/delivery';

// Environment variables load karna
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/customers', authenticateToken, customerRoutes);
app.use('/products', authenticateToken, productRoutes);
app.use('/delivery', authenticateToken, deliveryRoutes);
// MySQL Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Route banayein
app.get('/', async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.status(200).json({ 
            message: 'Server is running & Database is connected successfully!', 
            test_query_result: rows 
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Server start karna
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});