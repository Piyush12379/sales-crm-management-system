import { Router } from 'express';
import mysql from '../db';
import dotenv from 'dotenv';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware'; 

dotenv.config();
const router = Router();

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
});


// SETUP TABLE API (Run this once to create/reset Customers table with CRM fields)
router.get('/setup-table', verifyToken, authorizeRoles('Admin'), async (req: any, res: any): Promise<any> => {
    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('DROP TABLE IF EXISTS Customers');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        await pool.query(`
            CREATE TABLE Customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                mobile_number VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                business_name VARCHAR(255),
                gst_number VARCHAR(50),
                customer_type ENUM('Retail', 'Wholesale', 'Distributor') DEFAULT 'Wholesale',
                address TEXT,
                status ENUM('Lead', 'Active', 'Inactive') DEFAULT 'Lead',
                follow_up_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        return res.status(200).json({ message: 'Customers table recreated successfully with all CRM fields!' });
    } catch (error) {
        console.error('Setup error:', error);
        return res.status(500).json({ error: 'Failed to setup customers table' });
    }
});

// EDIT CUSTOMER API (Existing customer ko update karne ke liye)
router.put('/:id', verifyToken, authorizeRoles('Admin', 'Sales'), async (req: any, res: any): Promise<any> => {
    try {
        const customerId = req.params.id;
        const { 
            customer_name, mobile_number, email, business_name, 
            gst_number, customer_type, address, status, follow_up_date, notes 
        } = req.body;

        if (!customer_name || !mobile_number) {
            return res.status(400).json({ error: 'Customer Name aur Mobile Number dena zaroori hai' });
        }

        await pool.query(
            `UPDATE Customers SET 
                customer_name = ?, mobile_number = ?, email = ?, business_name = ?, 
                gst_number = ?, customer_type = ?, address = ?, status = ?, follow_up_date = ?, notes = ? 
             WHERE id = ?`,
            [
                customer_name, mobile_number, email || null, business_name || null, 
                gst_number || null, customer_type || 'Wholesale', address || null, 
                status || 'Lead', follow_up_date || null, notes || null, customerId
            ]
        );

        return res.status(200).json({ message: 'Customer successfully update ho gaya!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Customer update karne mein error aaya' });
    }
});


// 1. ADD CUSTOMER API (Naya customer banayein)
router.post('/', verifyToken, authorizeRoles('Admin', 'Sales'), async (req: any, res: any): Promise<any> => {
    try {
        const { customer_name, mobile_number, email, customer_type } = req.body;

        // Validation check
        if (!customer_name || !mobile_number || !customer_type) {
            return res.status(400).json({ error: 'Name, Mobile, aur Type dena zaroori hai' });
        }

        const [result]: any = await pool.query(
            `INSERT INTO Customers (customer_name, mobile_number, email, customer_type) VALUES (?, ?, ?, ?)`,
            [customer_name, mobile_number, email, customer_type]
        );

        return res.status(201).json({ 
            message: 'Customer successfully add ho gaya!', 
            customerId: result.insertId 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Customer add karne mein dikkat aayi' });
    }
});

// 2. GET CUSTOMERS API (Saare customers ki list dekhein)
router.get('/', verifyToken, authorizeRoles('Admin', 'Sales'), async (req: any, res: any): Promise<any> => {
    try {
        // Naye customers ko pehle dikhane ke liye humne 'ORDER BY created_at DESC' lagaya hai
        const [rows] = await pool.query('SELECT * FROM Customers ORDER BY created_at DESC');
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Customers fetch karne mein dikkat aayi' });
    }
});

export default router;