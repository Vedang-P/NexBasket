# DEMO SCRIPT (6-MARK CRITICAL FLOW)

Estimated duration: 8 to 12 minutes

## 0) Pre-Demo Setup (before recording/presentation)

1. Start PostgreSQL.
2. Apply SQL scripts in order:
   - `schema.sql`
   - `triggers.sql`
   - `procedures.sql`
   - `queries.sql`
3. Start backend:
```bash
cd backend
uvicorn app.main:app --reload
```
4. Open frontend:
- `http://127.0.0.1:8000/ui/login.html`

## 1) System Introduction (1 min)

- Show project structure (`backend`, `frontend`, `database`).
- State stack:
  - PostgreSQL
  - FastAPI with raw SQL
  - Vanilla JS frontend
- Mention DBMS focus:
  - constraints
  - procedures
  - triggers
  - transactions

## 2) Create User (1 min)

1. Open `login.html`.
2. Register a new user with email/password.
3. Login using the new credentials.
4. Show that frontend now uses the returned `user_id`.

## 3) Browse Products and Add to Cart (2 min)

1. Navigate to products page.
2. Apply search or in-stock filter.
3. Add 2-3 products with different quantities.
4. Show success messages for API integration.

## 4) Cart View and Checkout (2 min)

1. Open cart page and show line totals + cart total.
2. Open checkout page.
3. Click **Place Order**.
4. Show order ID returned from API.

## 5) Verify Order and Inventory Effects (2 min)

1. Open order history page:
   - show order is stored with item breakdown.
2. In SQL client, verify order persistence:
```sql
SELECT * FROM orders ORDER BY order_id DESC LIMIT 3;
SELECT * FROM order_items ORDER BY order_item_id DESC LIMIT 10;
```
3. Verify inventory reduction:
```sql
SELECT product_id, product_name, stock_qty
FROM products
ORDER BY product_id;
```

## 6) Show Trigger and Procedure Execution (2 min)

1. Demonstrate procedure call:
```sql
SELECT * FROM add_to_cart(<user_id>, <product_id>, 1);
SELECT place_order(<user_id>);
```

2. Demonstrate trigger logs:
```sql
SELECT * FROM inventory_audit ORDER BY changed_at DESC LIMIT 10;
SELECT * FROM order_audit ORDER BY changed_at DESC LIMIT 10;
```

3. Demonstrate negative inventory prevention:
```sql
UPDATE products SET stock_qty = -1 WHERE product_id = 1;
-- Should fail due to trigger
```

## 7) Complex Query Showcase (1-2 min)

Run and explain output for:

1. Top-selling products
2. Total revenue
3. Low-stock products
4. User purchase history
5. Nested subquery (above-average spenders)

All are available in `database/queries.sql`.

## 8) Close with Rubric Alignment

- **Design correctness**: 3NF + keys + constraints.
- **SQL complexity**: joins, nested subqueries, aggregations, procedures, triggers.
- **Data integrity**: validations + trigger safety + transactions.
- **Code quality**: modular backend and clean frontend.
- **UI clarity**: complete user flow pages.
- **Demo readiness**: end-to-end scenario + SQL proof of behavior.
