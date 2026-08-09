import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Initialize PG Pool
const connectionString = process.env.DATABASE_URL;
const pgPool = new Pool(
    connectionString
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
          }
);

// Helper to convert queries from MySQL to PostgreSQL format
function convertQuery(sql: string, params: any[] = []): { formattedSql: string, formattedParams: any[] } {
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
    } else {
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
function wrapResult(res: any) {
    const rows = res.rows || [];
    const insertId = res.rows?.[0]?.id || null;
    
    // Attach mysql2-like properties to the rows array
    const resultObj: any = [...rows];
    resultObj.insertId = insertId;
    resultObj.affectedRows = res.rowCount;
    resultObj.rowCount = res.rowCount;

    return [resultObj, rows];
}

class PGConnectionWrapper {
    constructor(private client: PoolClient) {}

    async query(sql: string, params?: any[]): Promise<any> {
        const { formattedSql, formattedParams } = convertQuery(sql, params);
        const res = await this.client.query(formattedSql, formattedParams);
        return wrapResult(res);
    }

    async beginTransaction(): Promise<void> {
        await this.client.query('BEGIN');
    }

    async commit(): Promise<void> {
        await this.client.query('COMMIT');
    }

    async rollback(): Promise<void> {
        await this.client.query('ROLLBACK');
    }

    release(): void {
        this.client.release();
    }
}

class PGPoolWrapper {
    async query(sql: string, params?: any[]): Promise<any> {
        const { formattedSql, formattedParams } = convertQuery(sql, params);
        const res = await pgPool.query(formattedSql, formattedParams);
        return wrapResult(res);
    }

    async getConnection(): Promise<PGConnectionWrapper> {
        const client = await pgPool.connect();
        return new PGConnectionWrapper(client);
    }
}

const poolInstance = new PGPoolWrapper();

// Automatically create all tables if they don't exist
async function initDatabase() {
    try {
        // 1. Users Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Customers Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS Customers (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                mobile_number VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                business_name VARCHAR(255),
                gst_number VARCHAR(50),
                customer_type VARCHAR(50) DEFAULT 'Wholesale',
                address TEXT,
                status VARCHAR(50) DEFAULT 'Lead',
                follow_up_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Products Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS Products (
                id SERIAL PRIMARY KEY,
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

        // 4. StockMovements Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS StockMovements (
                id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
                quantity_changed INT NOT NULL,
                movement_type VARCHAR(50) NOT NULL,
                reason VARCHAR(255),
                user_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. DeliveryNotes Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS DeliveryNotes (
                id SERIAL PRIMARY KEY,
                challan_number VARCHAR(100) NOT NULL UNIQUE,
                customer_id INT NOT NULL REFERENCES Customers(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'Draft',
                total_amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 6. DeliveryNoteItems Table
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS DeliveryNoteItems (
                id SERIAL PRIMARY KEY,
                delivery_note_id INT NOT NULL REFERENCES DeliveryNotes(id) ON DELETE CASCADE,
                product_id INT NOT NULL,
                product_name_snapshot VARCHAR(255) NOT NULL,
                price_at_time DECIMAL(10, 2) NOT NULL,
                quantity INT NOT NULL
            )
        `);

        console.log('Postgres Database initialized (All tables verified/created).');
    } catch (error) {
        console.error('Error during database initialization:', error);
    }
}
initDatabase();

export default {
    createPool: (config?: any) => poolInstance,
    query: (sql: string, params?: any[]) => poolInstance.query(sql, params),
    getConnection: () => poolInstance.getConnection()
};
