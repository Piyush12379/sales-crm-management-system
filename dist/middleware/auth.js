"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const authenticateToken = (req, res, next) => {
    // 1. Client se 'Authorization' header maangna
    const authHeader = req.header('Authorization');
    // Agar header hi nahi hai, toh wahi se reject kar do
    if (!authHeader) {
        return res.status(401).json({ error: 'Access Denied: Aapke paas token nahi hai!' });
    }
    // Token generally "Bearer <token>" ke format me aata hai, isliye hume sirf token wala hissa chahiye
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access Denied: Token format galat hai!' });
    }
    try {
        // 2. Token ko verify karna ki woh asli hai ya nakli
        const verified = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // 3. Asli hai toh user ka data request me save karke API ko aage badhne (next) dena
        req.user = verified;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid ya Expired Token' });
    }
};
exports.authenticateToken = authenticateToken;
