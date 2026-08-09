"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const dotenv_1 = __importDefault(require("dotenv"));
const authMiddleware_1 = require("../middleware/authMiddleware");
dotenv_1.default.config();
const router = (0, express_1.Router)();
// Database Connection Setup
const pool = db_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
});
// 1. SETUP TABLE API (Run this to reset and create the Products table)
// Isko hum bina guard ke rakh rahe hain taaki setup ke waqt error na aaye
// SETUP TABLE API (Products aur StockMovements tables banane ke liye)
router.get('/setup-table', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield pool.query('SET FOREIGN_KEY_CHECKS = 0');
        yield pool.query('DROP TABLE IF EXISTS StockMovements');
        yield pool.query('DROP TABLE IF EXISTS Products');
        yield pool.query('SET FOREIGN_KEY_CHECKS = 1');
        // 1. Products Table with inventory fields
        yield pool.query(`
            CREATE TABLE Products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_name VARCHAR(255) NOT NULL,
                sku_code VARCHAR(100) NOT NULL UNIQUE,
                category VARCHAR(100),
                price DECIMAL(10, 2) NOT NULL,
                stock_quantity INT NOT NULL,
                warehouse_location VARCHAR(100),
                min_stock_alert INT DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // 2. Stock Movements Log Table
        yield pool.query(`
            CREATE TABLE StockMovements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                quantity_changed INT NOT NULL,
                movement_type ENUM('IN', 'OUT') NOT NULL,
                reason VARCHAR(255),
                user_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES Products(id)
            )
        `);
        return res.status(200).json({ message: 'Products and StockMovements tables created successfully!' });
    }
    catch (error) {
        console.error('Database Setup Error:', error);
        return res.status(500).json({ error: 'Failed to setup inventory tables' });
    }
}));
// 2. ADD PRODUCT API (Create a new product)
// Yahan Guard lagaya gaya hai: Sirf Admin aur Warehouse products add kar sakte hain
// ADD PRODUCT API
router.post('/', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin', 'Warehouse'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield pool.getConnection();
    try {
        const { product_name, sku_code, category, price, stock_quantity, warehouse_location, min_stock_alert } = req.body;
        if (!product_name || !sku_code || price === undefined || stock_quantity === undefined) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }
        yield connection.beginTransaction();
        const [result] = yield connection.query(`INSERT INTO Products (product_name, sku_code, category, price, stock_quantity, warehouse_location, min_stock_alert) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [product_name, sku_code, category || 'General', price, stock_quantity, warehouse_location || 'Main Warehouse', min_stock_alert || 5]);
        const productId = result.insertId;
        // Log initial stock as 'IN' movement
        if (stock_quantity > 0) {
            yield connection.query(`INSERT INTO StockMovements (product_id, quantity_changed, movement_type, reason, user_email) 
                 VALUES (?, ?, 'IN', 'Initial Stock Added', ?)`, [productId, stock_quantity, req.user.email]);
        }
        yield connection.commit();
        return res.status(201).json({ message: 'Product added successfully', productId });
    }
    catch (error) {
        yield connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'SKU code already exists.' });
        }
        return res.status(500).json({ error: 'Failed to add product' });
    }
    finally {
        connection.release();
    }
}));
// GET STOCK MOVEMENTS LOG API
router.get('/movements', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin', 'Warehouse'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield pool.query(`
            SELECT sm.*, p.product_name, p.sku_code 
            FROM StockMovements sm 
            JOIN Products p ON sm.product_id = p.id 
            ORDER BY sm.created_at DESC
        `);
        return res.status(200).json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
}));
// 3. GET PRODUCTS API (Fetch all products)
// Yahan Guard lagaya gaya hai: Sirf Admin aur Warehouse products dekh sakte hain
router.get('/', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin', 'Warehouse'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield pool.query('SELECT * FROM Products ORDER BY created_at DESC');
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
}));
exports.default = router;
