# Mini ERP & CRM System (Full-Stack Business Management Solution)

A comprehensive, production-ready Mini ERP & CRM system built with Node.js, Express, MySQL, and React (Tailwind CSS) featuring Role-Based Access Control (RBAC), deep inventory tracking, advanced sales challan/billing logic with data snapshots, and Docker support.

---

## 🚀 Key Features & Modules

1. **Authentication & RBAC (Role-Based Access Control):**
   - Secure JWT-based authentication.
   - Distinct roles: **Admin**, **Sales**, **Warehouse**, and **Accounts** with strict permission boundaries.

2. **Customer Relationship Management (CRM):**
   - Add/Edit Customer Profiles (Name, Mobile, Email, Business Name, Optional GST, Type, Address, and Status: Lead/Active/Inactive).
   - Search & Filter mechanism by name, phone, or business.
   - Follow-up date and notes management.

3. **Product & Inventory Management:**
   - Detailed product tracking: SKU/Code, Category, Unit Price, Current Stock, Warehouse Location, and Minimum Stock Alert Quantity.
   - **Stock Movement Log:** Tracks every inventory change (IN/OUT, quantity, reason, timestamp, and user).

4. **Advanced Sales Challan / Billing Logic:**
   - Automatic unique Challan Number generation (`CHN-YYYY-XXXX`).
   - Flexible status handling: **Draft** (save for later, no stock deduction) vs. **Confirmed** (final bill, strict stock deduction).
   - **Stock Validation:** Prevents negative stock and throws descriptive error messages if insufficient.
   - **Data Snapshot:** Captures product name and price at the exact moment of billing to protect against future price changes.

5. **UI Polish, Pagination & Bonus Features:**
   - Responsive, mobile-friendly Tailwind CSS layout with pagination on data tables.
   - **PDF Export:** Clean printable tax invoice/challan export view.
   - **Docker Support:** Fully containerized with `Dockerfile` and `docker-compose.yml`.

---

## 🔑 Test Login Credentials

| Role | Email | Access Level |
| :--- | :--- | :--- |
| **Admin** | `admin@test.com` | Full System & Setup Access |
| **Sales** | `sales@test.com` | CRM & Challan Generation |
| **Warehouse** | `warehouse@test.com` | Inventory & Stock Logs |
| **Accounts** | `accounts@test.com` | Billing & Invoices |

---

## 🛠️ Local Installation & Setup Instructions

### Prerequisites
- Node.js (v18 or v20+)
- MySQL Server installed and running

### 1. Database Setup
Create a MySQL database named `mini_erp_crm`:
```sql
CREATE DATABASE mini_erp_crm;