# 📚 System Documentation: Mini ERP + CRM Operations Portal

This documentation outlines the architecture, database design, API endpoints, role permissions, and setup of the Mini ERP & CRM Operations Portal.

---

## 🏗️ Architecture & Tech Stack

The application is built using a decoupled **Client-Server Architecture**:

* **Frontend**: React (Vite, TypeScript, Tailwind CSS)
  * Hosted on: **Vercel**
  * Responsibilities: User Authentication wrapper, Dynamic RBAC UI rendering, Table sorting/pagination, PDF Invoice Generation.
* **Backend**: Node.js (Express, TypeScript)
  * Hosted on: **Render**
  * Responsibilities: REST API endpoints, JWT-based security middleware, database pool management, and business logic execution.
* **Database**: Neon (Serverless PostgreSQL)
  * Responsibilities: Structured data storage, foreign key constraints, and transactional stock integrity.
  * **Database Bridge Wrapper**: Implemented in [`src/db.ts`](src/db.ts). It converts standard MySQL queries in real-time to PostgreSQL compatible syntax. This keeps the backend fully database-agnostic.

---

## 📂 Project Directory Structure

Here is a visual map of the project layout, dividing the backend, frontend, and DevOps configurations:

```text
problem-statement-root/
├── api/
│   └── index.ts                 # Serverless entrypoint for Vercel API
├── src/                         # Backend (Express & TypeScript)
│   ├── index.ts                 # Express App definition & routing
│   ├── db.ts                    # PostgreSQL Pool & MySQL compatibility layer
│   ├── middleware/              # Security & JWT authorization layers
│   │   ├── auth.ts              
│   │   └── authMiddleware.ts    
│   └── routes/                  # Express REST Router Controllers
│       ├── auth.ts              # Seeding users & login validation
│       ├── customers.ts         # CRM Customers management APIs
│       ├── products.ts          # Inventory & Stock Movement logs
│       └── delivery.ts          # Sales Challan & Transactional Billing
├── frontend/                    # Frontend (React + Vite + Tailwind CSS)
│   ├── public/                  
│   ├── src/                     
│   │   ├── components/          # Dashboard Module Views
│   │   │   ├── Billing.tsx      # Challans view & PDF export
│   │   │   ├── Customers.tsx    # Customer CRM grid
│   │   │   └── Products.tsx     # Stock edits & Movement logs
│   │   ├── App.tsx              # Base dashboard template & Routing
│   │   ├── config.ts            # Dynamic environment API configs
│   │   ├── main.tsx             
│   │   └── index.css            # Base Tailwind layout
│   ├── package.json             
│   ├── tailwind.config.js       
│   └── vite.config.ts           
├── public/                      # Backend dummy folder for Vercel builds
│   └── index.html               
├── .gitignore                   
├── .vercelignore                
├── vercel.json                  # Backend Vercel router rewrite rules
├── render.yaml                  # Backend Render blueprint configurations
├── Dockerfile                   
├── docker-compose.yml           
├── package.json                 # Backend Node dependencies configuration
├── tsconfig.json                
├── README.md                    # Deployment guide & setup details
└── Documentation.md             # Architecture & system reference doc
```

---

## 📊 Visual System Architecture

This diagram illustrates how the frontend client, network security layers, Express router, and MySQL-to-Postgres bridge communicate with the database:

```mermaid
graph TD
    subgraph Client ["Client Interface (Vercel Frontend)"]
        A[React App / Vite] --> B[Tailwind CSS UI]
        A --> C[PDF Invoice Generation]
    end

    subgraph Network ["Security & Network Layer"]
        C2[HTTP Secure REST API Calls]
        C3[JWT Authentication Token]
    end

    subgraph Backend ["Serverless Execution (Render Backend)"]
        D[Express.js Engine] --> E[JWT Validation Middleware]
        D --> F[Route Handlers]
    end

    subgraph Bridge ["Database Compatibility Bridge"]
        G[MySQL to PostgreSQL Bridge Adapter]
    end

    subgraph Database ["Data Storage (Neon Cloud)"]
        H[(Neon PostgreSQL Database)]
    end

    A ==> Network
    Network ==> D
    F ==> Bridge
    Bridge ==> H

    style Client fill:#e6f7ff,stroke:#1890ff,stroke-width:2px;
    style Network fill:#fff0f6,stroke:#eb2f96,stroke-width:2px;
    style Backend fill:#f6ffed,stroke:#52c41a,stroke-width:2px;
    style Bridge fill:#fff7e6,stroke:#ffa940,stroke-width:2px;
    style Database fill:#f9f0ff,stroke:#722ed1,stroke-width:2px;
```

---

## 👥 Role-Based Access Control (RBAC)

The portal implements role boundaries on both the frontend and backend:

| Role | Access Privileges |
| :--- | :--- |
| **Admin** | Read/Write access to all modules, DB Schema setup/seeding, full control. |
| **Sales** | Add/Edit customers (CRM), view products, generate Sales Challans (Draft or Confirmed). |
| **Warehouse** | Add/Edit products, adjust stock levels, view Stock Movement logs. |
| **Accounts** | View confirmed Sales Challans, export/print PDF invoices. |

---

## 🗄️ Database Schema Design

The PostgreSQL database consists of 6 tables. Relationships are defined below:

### 1. `Users`
Stores authentication credentials and roles.
* `id` (SERIAL PRIMARY KEY)
* `name` (VARCHAR)
* `email` (VARCHAR, UNIQUE)
* `password` (VARCHAR, hashed with bcrypt)
* `role` (VARCHAR) - *Admin, Sales, Warehouse, Accounts*
* `created_at` (TIMESTAMP)

### 2. `Customers`
Stores CRM customer profiles.
* `id` (SERIAL PRIMARY KEY)
* `customer_name` (VARCHAR)
* `mobile_number` (VARCHAR)
* `email` (VARCHAR)
* `business_name` (VARCHAR)
* `gst_number` (VARCHAR, optional)
* `customer_type` (VARCHAR) - *Retail, Wholesale, Distributor*
* `address` (TEXT)
* `status` (VARCHAR) - *Lead, Active, Inactive*
* `follow_up_date` (DATE)
* `notes` (TEXT)
* `created_at` (TIMESTAMP)

### 3. `Products`
Stores stock levels and minimum threshold alert flags.
* `id` (SERIAL PRIMARY KEY)
* `product_name` (VARCHAR)
* `sku_code` (VARCHAR, UNIQUE)
* `category` (VARCHAR)
* `price` (DECIMAL)
* `stock_quantity` (INT)
* `warehouse_location` (VARCHAR)
* `min_stock_alert` (INT) - *Defaults to 5*
* `created_at` (TIMESTAMP)

### 4. `StockMovements`
Tracks inventory changes (`IN` or `OUT`).
* `id` (SERIAL PRIMARY KEY)
* `product_id` (INT, FOREIGN KEY to `Products.id`)
* `quantity_changed` (INT)
* `movement_type` (VARCHAR) - *IN, OUT*
* `reason` (VARCHAR)
* `user_email` (VARCHAR) - *Email of the user who logged the change*
* `created_at` (TIMESTAMP)

### 5. `DeliveryNotes` (Sales Challans)
Main order summary tracking.
* `id` (SERIAL PRIMARY KEY)
* `challan_number` (VARCHAR, UNIQUE) - *E.g. CHN-2026-XXXX*
* `customer_id` (INT, FOREIGN KEY to `Customers.id`)
* `status` (VARCHAR) - *Draft, Confirmed, Cancelled*
* `total_amount` (DECIMAL)
* `total_quantity` (INT) - *Sum of all items*
* `created_by` (VARCHAR) - *Email of the sales user*
* `created_at` (TIMESTAMP)

### 6. `DeliveryNoteItems`
Snapshot table storing pricing and product details at the exact moment of order confirmation.
* `id` (SERIAL PRIMARY KEY)
* `delivery_note_id` (INT, FOREIGN KEY to `DeliveryNotes.id` ON DELETE CASCADE)
* `product_id` (INT)
* `product_name_snapshot` (VARCHAR) - *Protects against future product name edits*
* `price_at_time` (DECIMAL) - *Protects against future price changes*
* `quantity` (INT)

---

## 📡 API Reference

All requests must include a JWT token in the headers for authenticated routes:
`Authorization: Bearer <JWT_TOKEN>`

### Authentication
* `POST /auth/login`
  * Body: `{ "email": "...", "password": "..." }`
  * Returns: `{ "token": "...", "role": "..." }`
* `POST /auth/setup`
  * Clears `Users` table and seeds default test users.

### Customers (CRM)
* `GET /customers` (Sales, Admin) - Retrieve list of all customers.
* `POST /customers` (Sales, Admin) - Add a new customer.
* `PUT /customers/:id` (Sales, Admin) - Update an existing customer profile.
* `GET /customers/setup-table` (Admin) - Recreate Customers table.

### Products & Inventory
* `GET /products` (Warehouse, Admin, Sales, Accounts) - Retrieve products.
* `POST /products` (Warehouse, Admin) - Add product and log initial stock as `IN`.
* `GET /products/movements` (Warehouse, Admin) - Fetch stock logs.
* `GET /products/setup-table` (Admin) - Recreate Products & StockMovements tables.

### Sales Challans (Billing)
* `GET /delivery` (Admin, Sales, Accounts) - Fetch all Sales Challans.
* `POST /delivery` (Admin, Sales, Accounts) - Generate a Challan.
  * Body: `{ "customer_id": 1, "status": "Confirmed", "products": [{ "product_id": 2, "quantity": 10 }] }`
  * Business Logic: 
    * If `status` is `Confirmed`, checks stock levels. If insufficient, throws `400 Bad Request`. Otherwise, reduces product stock levels.
    * If `status` is `Draft`, saves the order details without adjusting stock.
* `GET /delivery/setup-table` (Admin) - Recreate DeliveryNotes and Items tables.

---

## 💻 Local Development Setup

To run the application locally:

1. Clone the repository and install dependencies in both backend and frontend:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
2. Set up local Postgres database and add a `.env` file in the root:
   ```env
   PORT=5005
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   JWT_SECRET=super_secret_key_123
   ```
3. Start the backend developer environment:
   ```bash
   npm run dev
   ```
4. Start the frontend developer environment:
   ```bash
   cd frontend
   npm run dev
   ```
