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
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Initialize PG Pool
const connectionString = process.env.DATABASE_URL;
const pgPool = new pg_1.Pool(connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'mini_erp_crm',
        port: parseInt(process.env.DB_PORT || '5432'),
    });
// Helper to convert queries from MySQL to PostgreSQL format
function convertQuery(sql, params = []) {
    let formattedSql = sql;
    let formattedParams = [...params];
    // 1. Remove/Mock MySQL FOREIGN_KEY_CHECKS
    if (/SET FOREIGN_KEY_CHECKS/i.test(formattedSql)) {
        return { formattedSql: 'SELECT 1', formattedParams: [] };
    }
    // 2. Convert drop table to CASCADE
    if (/DROP TABLE IF EXISTS/i.test(formattedSql)) {
        formattedSql = formattedSql.replace(/DROP TABLE IF EXISTS\s+(\w+)/i, 'DROP TABLE IF EXISTS $1 CASCADE');
    }
    // 3. Convert MySQL CREATE TABLE syntax to Postgres
    if (/CREATE TABLE/i.test(formattedSql)) {
        // INT AUTO_INCREMENT PRIMARY KEY -> SERIAL PRIMARY KEY
        formattedSql = formattedSql.replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
        // ENUM(...) -> VARCHAR(50)
        formattedSql = formattedSql.replace(/ENUM\([^)]+\)/gi, 'VARCHAR(50)');
    }
    // 4. Handle bulk insert syntax `VALUES ?`
    if (formattedParams.length === 1 && Array.isArray(formattedParams[0]) && Array.isArray(formattedParams[0][0])) {
        const rows = formattedParams[0];
        const numCols = rows[0].length;
        const placeholders = rows.map((_, rowIndex) => {
            const colPlaceholders = Array.from({ length: numCols }, (_, colIndex) => {
                return `$${rowIndex * numCols + colIndex + 1}`;
            }).join(', ');
            return `(${colPlaceholders})`;
        }).join(', ');
        formattedSql = formattedSql.replace(/VALUES\s*\?/i, `VALUES ${placeholders}`);
        formattedParams = rows.flat();
    }
    else {
        // Replace '?' placeholders with '$1', '$2', ...
        let paramIndex = 1;
        formattedSql = formattedSql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    // 5. Append RETURNING id to INSERT statement if not present
    if (/^\s*INSERT\s+INTO/i.test(formattedSql) && !/RETURNING/i.test(formattedSql)) {
        formattedSql += ' RETURNING id';
    }
    return { formattedSql, formattedParams };
}
// Wrapper for Query Results to mimic mysql2
function wrapResult(res) {
    var _a, _b;
    const rows = res.rows || [];
    const insertId = ((_b = (_a = res.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) || null;
    // Attach mysql2-like properties to the rows array
    const resultObj = [...rows];
    resultObj.insertId = insertId;
    resultObj.affectedRows = res.rowCount;
    resultObj.rowCount = res.rowCount;
    return [resultObj, rows];
}
class PGConnectionWrapper {
    constructor(client) {
        this.client = client;
    }
    query(sql, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { formattedSql, formattedParams } = convertQuery(sql, params);
            const res = yield this.client.query(formattedSql, formattedParams);
            return wrapResult(res);
        });
    }
    beginTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.query('BEGIN');
        });
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.query('COMMIT');
        });
    }
    rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.query('ROLLBACK');
        });
    }
    release() {
        this.client.release();
    }
}
class PGPoolWrapper {
    query(sql, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { formattedSql, formattedParams } = convertQuery(sql, params);
            const res = yield pgPool.query(formattedSql, formattedParams);
            return wrapResult(res);
        });
    }
    getConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield pgPool.connect();
            return new PGConnectionWrapper(client);
        });
    }
}
const poolInstance = new PGPoolWrapper();
// Automatically create Users table if it doesn't exist
function initDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield pgPool.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
            console.log('Postgres Database initialized (Users table verified/created).');
        }
        catch (error) {
            console.error('Error during database initialization:', error);
        }
    });
}
initDatabase();
exports.default = {
    createPool: (config) => poolInstance,
    query: (sql, params) => poolInstance.query(sql, params),
    getConnection: () => poolInstance.getConnection()
};
