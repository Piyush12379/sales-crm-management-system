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
// 1. SETUP TABLES API (Advanced Challan tables with status, snapshot, and challan number)
router.get('/setup-table', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield pool.query('SET FOREIGN_KEY_CHECKS = 0');
        yield pool.query('DROP TABLE IF EXISTS DeliveryNoteItems');
        yield pool.query('DROP TABLE IF EXISTS DeliveryNotes');
        yield pool.query('SET FOREIGN_KEY_CHECKS = 1');
        // Main Delivery Notes Table with Challan Number and Status
        yield pool.query(`
            CREATE TABLE DeliveryNotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                challan_number VARCHAR(100) NOT NULL UNIQUE,
                customer_id INT NOT NULL,
                status ENUM('Draft', 'Confirmed') DEFAULT 'Draft',
                total_amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES Customers(id)
            )
        `);
        // Items Table with Data Snapshots (Price and Name saved at the exact time)
        yield pool.query(`
            CREATE TABLE DeliveryNoteItems (
                id INT AUTO_INCREMENT PRIMARY KEY,
                delivery_note_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name_snapshot VARCHAR(255) NOT NULL,
                price_at_time DECIMAL(10, 2) NOT NULL,
                quantity INT NOT NULL,
                FOREIGN KEY (delivery_note_id) REFERENCES DeliveryNotes(id)
            )
        `);
        return res.status(200).json({ message: 'Advanced Challan tables created successfully!' });
    }
    catch (error) {
        console.error('Database Setup Error:', error);
        return res.status(500).json({ error: 'Failed to create challan tables' });
    }
}));
// 2. CREATE / GENERATE CHALLAN API
router.post('/', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin', 'Sales', 'Accounts'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const connection = yield pool.getConnection();
    try {
        const { customer_id, products, status } = req.body;
        const challanStatus = status === 'Confirmed' ? 'Confirmed' : 'Draft';
        if (!customer_id || !products || products.length === 0) {
            return res.status(400).json({ error: 'Customer ID and at least one product are required' });
        }
        yield connection.beginTransaction();
        // Automatically generate unique Challan Number (e.g., CHN-2026-XXXX)
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const challan_number = `CHN-${new Date().getFullYear()}-${randomNum}`;
        let total_amount = 0;
        let total_quantity = 0;
        const processedItems = [];
        // Step A: Validate stock and capture snapshot data
        for (const item of products) {
            const [productData] = yield connection.query('SELECT product_name, price, stock_quantity FROM Products WHERE id = ?', [item.product_id]);
            if (productData.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found`);
            }
            const currentStock = productData[0].stock_quantity;
            // Strict Stock Validation if challan is Confirmed
            if (challanStatus === 'Confirmed' && currentStock < item.quantity) {
                throw new Error(`Stock insufficient for product: ${productData[0].product_name}. Available: ${currentStock}`);
            }
            const price_at_time = productData[0].price;
            const product_name_snapshot = productData[0].product_name;
            total_amount += (price_at_time * item.quantity);
            total_quantity += item.quantity;
            processedItems.push({
                product_id: item.product_id,
                product_name_snapshot,
                price_at_time,
                quantity: item.quantity
            });
        }
        // Step B: Insert into DeliveryNotes
        const [noteResult] = yield connection.query('INSERT INTO DeliveryNotes (challan_number, customer_id, status, total_amount, total_quantity, created_by) VALUES (?, ?, ?, ?, ?, ?)', [challan_number, customer_id, challanStatus, total_amount, total_quantity, ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || 'system']);
        const deliveryNoteId = noteResult.insertId;
        // Step C: Insert items with snapshot and update stock ONLY if Confirmed
        for (const item of processedItems) {
            yield connection.query(`INSERT INTO DeliveryNoteItems (delivery_note_id, product_id, product_name_snapshot, price_at_time, quantity) 
                 VALUES (?, ?, ?, ?, ?)`, [deliveryNoteId, item.product_id, item.product_name_snapshot, item.price_at_time, item.quantity]);
            if (challanStatus === 'Confirmed') {
                yield connection.query('UPDATE Products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        }
        yield connection.commit();
        return res.status(201).json({
            message: `Challan generated successfully as ${challanStatus}`,
            challan_number,
            deliveryNoteId,
            totalAmount: total_amount
        });
    }
    catch (error) {
        yield connection.rollback();
        console.error('Challan Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate challan' });
    }
    finally {
        connection.release();
    }
}));
// 3. GET ALL CHALLANS API
router.get('/', authMiddleware_1.verifyToken, (0, authMiddleware_1.authorizeRoles)('Admin', 'Sales', 'Accounts'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield pool.query(`
            SELECT dn.*, c.customer_name 
            FROM DeliveryNotes dn 
            JOIN Customers c ON dn.customer_id = c.id 
            ORDER BY dn.created_at DESC
        `);
        return res.status(200).json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch challans' });
    }
}));
exports.default = router;
