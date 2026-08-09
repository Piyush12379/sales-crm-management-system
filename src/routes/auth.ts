import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mysql from '../db';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();

// MySQL Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

// 1. SETUP API (Dummy Admin Banane Ke Liye)
// 1. SETUP API (Test Users Banane Ke Liye)
router.post('/setup', async (req: Request, res: Response): Promise<any> => {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Purane test users ko delete kar rahe hain taaki duplicate email ka error na aaye
        await pool.query('DELETE FROM Users');

        // 4 alag-alag roles ke users bana rahe hain
        const users = [
            ['Admin User', 'admin@test.com', hashedPassword, 'Admin'],
            ['Sales User', 'sales@test.com', hashedPassword, 'Sales'],
            ['Warehouse User', 'warehouse@test.com', hashedPassword, 'Warehouse'],
            ['Accounts User', 'accounts@test.com', hashedPassword, 'Accounts']
        ];

        // Database mein entry daalna
        await pool.query(
            `INSERT INTO Users (name, email, password, role) VALUES ?`,
            [users]
        );
        
        return res.status(201).json({ 
            message: 'All Role-based Users created successfully!',
            users_created: ['Admin', 'Sales', 'Warehouse', 'Accounts'],
            common_password: 'admin123'
        });
    } catch (error) {
        return res.status(500).json({ error: 'Setup failed. Please check server logs.' });
    }
});

// 2. LOGIN API (Token Generate Karne Ke Liye)
router.post('/login', async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email aur password zaroori hai' });
        }

        // Database se user dhundna
        const [rows]: any = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        const users = rows as any[];

        if (users.length === 0) {
            return res.status(401).json({ error: 'User nahi mila' });
        }

        const user = users[0];

        // Password compare karna
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Galat password' });
        }

        // JWT Token banana (isme id aur role save hota hai)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        return res.status(200).json({ 
            message: 'Login successful', 
            token: token, 
            role: user.role 
        });

    } catch (error) {
        return res.status(500).json({ error: 'Server Error' });
    }
});

export default router;