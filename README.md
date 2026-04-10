# NexBasket

NexBasket is a DBMS-first e-commerce mini project built for academic evaluation, with PostgreSQL as the core execution engine for integrity, transaction safety, and realistic commerce behavior.

This project is intentionally designed to prove **database concepts in production-style flows**, not just CRUD pages.

## 1. Problem Statement

Typical DBMS mini-project carts are weak in three areas:

1. Business rules are enforced in app code only, so direct DB writes can corrupt data.
2. Checkout is not atomic, causing partial orders, stale stock, or broken totals.
3. Demos show basic SQL but not real integrity controls like triggers, procedures, and audits.

NexBasket solves this by putting the database in charge of invariants and letting the API/UI orchestrate those rules safely.

## 2. Novelty and Differentiation

NexBasket differs from common student e-commerce projects in these ways:

1. **Database-enforced commerce invariants**:
   - No negative stock
   - No invalid order state transitions
   - Stock movement always auditable
2. **Procedure-centric write path**:
   - Cart add, checkout, inventory adjustments, and cancellation are encapsulated in SQL functions with validation.
3. **Trigger-backed side effects**:
   - Order item creation automatically reduces stock.
   - Inventory and order status changes are logged automatically.
4. **Dual audience demo model**:
   - Shopper UI for end-to-end flow.
   - Admin insights page exposing low stock, top sellers, and audit trails as evidence of DB behavior.

## 3. Stack and Runtime

- Database: PostgreSQL
- Backend: FastAPI + psycopg (raw SQL)
- Frontend: Vanilla HTML/CSS/JS modules
- Deployment: Vercel Services (frontend + backend) + Neon Postgres

## 4. Repository Structure

```text
project/
│── api/
│   └── index.py
│── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
│── frontend/
│   ├── assets/products/real/      # local real image pack
│   ├── assets/products/*.svg      # fallback images
│   └── *.html, *.js, styles.css
│── database/
│   ├── schema.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   ├── queries.sql
│   └── SQL_VALIDATION_NOTES.md
│── scripts/
│   └── init_db.sh
│── DEMO_SCRIPT.md
│── TEST_PLAN.md
│── vercel.json
```

## 5. Database Design (3NF Rationale)

### Core entities (mandatory)

- `users`
- `categories`
- `products`
- `carts`
- `cart_items`
- `orders`
- `order_items`

### Supporting entities

- `inventory_audit`
- `order_audit`
- `user_sessions`

### Why this is in 3NF

1. **Entity separation**:
   - `categories` are independent and referenced by `products`.
   - `carts` and `orders` are separate transactional contexts.
2. **No repeating groups / no multi-valued columns**:
   - Line items live in `cart_items` and `order_items`.
3. **No transitive dependency in transactional facts**:
   - `order_items.unit_price` snapshots price at purchase time.
   - Historical order totals remain correct even if product price later changes.

## 6. Integrity Controls

### Primary and foreign keys

- PK on every table (`BIGSERIAL` IDs)
- FK chains for ownership and referential integrity
- `ON DELETE CASCADE` where relationship semantics require dependent cleanup

### Constraints

- `UNIQUE`: user email, category name, product SKU, `(cart_id, product_id)`, `(order_id, product_id)`, session token hash
- `CHECK`:
  - positive `price`, `unit_price`, `quantity`
  - non-negative `stock_qty`, `reorder_level`, `total_amount`
  - order status domain (`PLACED`, `CANCELLED`, `COMPLETED`)
  - timestamp consistency for cancelled/completed orders
- Defaults:
  - timestamps
  - activation flags
  - order status and totals

### Indexing strategy

Key indexes were added for realistic query paths:

- Product browsing: `idx_products_category_id`, `idx_products_name_lower`, `idx_products_active`
- Stock risk scans: `idx_products_low_stock`
- Cart and order retrieval: `idx_carts_user_id`, `idx_cart_items_cart_id`, `idx_orders_user_placed_at`
- Operational filtering: `idx_orders_status`
- Analytics/audit reads: `idx_order_items_product_id`, audit-time indexes
- Session checks: `idx_user_sessions_user_id`, `idx_user_sessions_expires_at`, `idx_user_sessions_revoked_at`

## 7. Stored Procedures / Functions

Defined in [`database/procedures.sql`](database/procedures.sql):

1. `add_to_cart(p_user_id, p_product_id, p_qty)`
   - validates user/activity, product/activity, positive qty
   - locks product row and enforces stock-aware cart merge
2. `place_order(p_user_id)`
   - validates cart existence + non-empty cart
   - locks product rows and validates stock for all lines
   - inserts order + order_items and clears cart atomically
3. `set_cart_item_quantity(p_user_id, p_cart_item_id, p_quantity)`
   - validates ownership, qty, and stock bounds
4. `remove_cart_item(p_user_id, p_cart_item_id)`
   - ownership-safe cart deletion
5. `update_inventory(p_product_id, p_delta, p_reason)`
   - controlled inventory adjustment with reason tagging for audit
6. `cancel_order(p_order_id, p_user_id)`
   - owner-only cancel for `PLACED` orders
   - restores stock and updates status with audit context

## 8. Trigger System

Defined in [`database/triggers.sql`](database/triggers.sql):

1. `trg_products_prevent_negative_stock` (BEFORE UPDATE on `products.stock_qty`)
   - hard blocks negative inventory at DB level
2. `trg_order_items_reduce_stock` (BEFORE INSERT on `order_items`)
   - reduces inventory when checkout writes order lines
3. `trg_products_inventory_audit` (AFTER UPDATE on `products.stock_qty`)
   - records old/new stock, delta, reason, related order
4. `trg_orders_status_audit` (AFTER INSERT/UPDATE on `orders.order_status`)
   - records lifecycle transitions

## 9. ACID and Concurrency Model

The backend uses explicit transaction blocks (`with conn.transaction():`) for all critical writes.  
SQL functions also use row locks (`FOR UPDATE`) for contention-sensitive operations.

### Guarantees

1. Checkout succeeds fully or rolls back fully.
2. Stock checks happen under lock before write.
3. Cancelling and restocking are consistent under the same transaction.
4. Trigger side effects (stock deduction and audits) are in the same commit boundary.

## 10. API Contracts

### Auth/session

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Legacy aliases:
- `POST /users/register`
- `POST /users/login`

### Catalog

- `GET /categories`
- `GET /products?category_id=&search=&in_stock_only=&sort=&min_price=&max_price=`

### Cart

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{cart_item_id}`
- `DELETE /cart/items/{cart_item_id}`

Legacy:
- `POST /cart` with `{ user_id, product_id, quantity }`

### Orders

- `POST /orders`
- `GET /orders`
- `GET /orders/{order_id}`
- `POST /orders/{order_id}/cancel`

Legacy:
- `POST /order`

### Admin (read-only)

- `GET /admin/summary`
- `GET /admin/low-stock`
- `GET /admin/top-products`
- `GET /admin/audit`

## 11. Frontend Experience

NexBasket includes:

1. Login-first flow with separate signup.
2. Rich landing and catalog pages.
3. Cart quantity steppers + remove operations.
4. Checkout and order timeline with cancellation.
5. Wishlist hearts with local persistence.
6. Theme toggle (light/dark) with persistence.
7. Real local product images with fallback chain:
   - real local image → SVG fallback → safe placeholder
8. Sticky footer/layout contract for short pages.

## 12. Request Lifecycle (UI → API → DB)

Example: **Add to cart**

1. Frontend calls `POST /cart/items`.
2. Backend opens transaction and calls SQL function `add_to_cart`.
3. Function validates user/product/qty and stock.
4. Cart line inserted/merged.
5. Transaction commits; API responds.
6. UI refreshes cart badge and status.

Example: **Place order**

1. Frontend calls `POST /orders`.
2. Backend calls `place_order` in transaction.
3. Function inserts `orders` and `order_items`, clears cart.
4. Trigger on `order_items` reduces stock and writes inventory audit.
5. Order trigger writes status audit.
6. Commit makes all writes visible together.

## 13. Local Setup

### 1) Create database

```bash
createdb dbs_mini_project
```

### 2) Install backend dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `SESSION_TTL_HOURS` (default `24`)

### 3) Initialize schema/procedures/triggers (+ optional seed)

```bash
cd ..
DATABASE_URL='postgresql://...' ./scripts/init_db.sh --seed
```

### 4) Run backend

```bash
cd backend
uvicorn app.main:app --reload
```

### 5) Open frontend

- Open `frontend/login.html` locally, or deploy with Vercel services.

## 14. Deployment (Vercel Services)

- Frontend service entry: `frontend/main.py` at `/`
- Backend service entry: `api/index.py` at `/_/backend`
- Multi-service routing is defined in `vercel.json`

Set production env vars in Vercel:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `SESSION_TTL_HOURS`

## 15. Evaluation and Demo Readiness

Use these files during viva/demo:

- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)
- [`TEST_PLAN.md`](TEST_PLAN.md)
- [`database/queries.sql`](database/queries.sql)
- [`database/SQL_VALIDATION_NOTES.md`](database/SQL_VALIDATION_NOTES.md)

### Recommended live demo flow

1. Register/login with a new shopper user.
2. Browse products, apply filters, add items.
3. Show cart updates and badge sync.
4. Place order and open order details.
5. Cancel a `PLACED` order and verify restock.
6. Run SQL showcase:
   - basic queries
   - top sellers, revenue, low stock
   - audit table outputs
7. Open admin insights and correlate with SQL evidence.

## 16. Failure Modes Handled

1. Duplicate email registration → rejected (`UNIQUE` + API handling)
2. Invalid cart quantity → rejected in API/function checks
3. Insufficient stock on add/update/checkout → rejected atomically
4. Unauthorized access to protected routes → token guard
5. Non-admin access to admin endpoints → blocked by dependency checks
6. Session expiry/revocation → enforced server-side via `user_sessions`

---

NexBasket is intentionally built to demonstrate that **good DBMS design is not just schema drawing**; it is enforcing correctness under real user behavior, concurrent writes, and failure conditions.
