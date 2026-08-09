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
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const auth_2 = require("./middleware/auth");
const products_1 = __importDefault(require("./routes/products"));
const delivery_1 = __importDefault(require("./routes/delivery"));
// Environment variables load karna
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware setup
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_1.default);
app.use('/customers', auth_2.authenticateToken, customers_1.default);
app.use('/products', auth_2.authenticateToken, products_1.default);
app.use('/delivery', auth_2.authenticateToken, delivery_1.default);
// MySQL Database Connection Pool
const pool = db_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mini_erp_crm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Test Route banayein
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield pool.query('SELECT 1 + 1 AS solution');
        res.status(200).json({
            message: 'Server is running & Database is connected successfully!',
            test_query_result: rows
        });
    }
    catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
// Server start karna
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
