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
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
// MySQL Database Connection Pool
const pool = db_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
});
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
// 1. SETUP API (Dummy Admin Banane Ke Liye)
// 1. SETUP API (Test Users Banane Ke Liye)
router.post('/setup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hashedPassword = yield bcrypt_1.default.hash('admin123', 10);
        // Purane test users ko delete kar rahe hain taaki duplicate email ka error na aaye
        yield pool.query('DELETE FROM Users');
        // 4 alag-alag roles ke users bana rahe hain
        const users = [
            ['Admin User', 'admin@test.com', hashedPassword, 'Admin'],
            ['Sales User', 'sales@test.com', hashedPassword, 'Sales'],
            ['Warehouse User', 'warehouse@test.com', hashedPassword, 'Warehouse'],
            ['Accounts User', 'accounts@test.com', hashedPassword, 'Accounts']
        ];
        // Database mein entry daalna
        yield pool.query(`INSERT INTO Users (name, email, password, role) VALUES ?`, [users]);
        return res.status(201).json({
            message: 'All Role-based Users created successfully!',
            users_created: ['Admin', 'Sales', 'Warehouse', 'Accounts'],
            common_password: 'admin123'
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Setup failed. Please check server logs.' });
    }
}));
// 2. LOGIN API (Token Generate Karne Ke Liye)
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email aur password zaroori hai' });
        }
        // Database se user dhundna
        const [rows] = yield pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        const users = rows;
        if (users.length === 0) {
            return res.status(401).json({ error: 'User nahi mila' });
        }
        const user = users[0];
        // Password compare karna
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Galat password' });
        }
        // JWT Token banana (isme id aur role save hota hai)
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        return res.status(200).json({
            message: 'Login successful',
            token: token,
            role: user.role
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
