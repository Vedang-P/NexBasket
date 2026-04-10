# TEST PLAN

This checklist is designed for grading-oriented verification of correctness, integrity, and demo readiness.

## 1) Schema & Integrity Tests

1. Unique email:
```sql
INSERT INTO users (full_name, email, password_hash) VALUES ('X', 'alice@example.com', 'h');
-- Expect: UNIQUE violation
```

2. FK enforcement:
```sql
INSERT INTO products (category_id, sku, product_name, price, stock_qty)
VALUES (99999, 'BAD-001', 'Invalid Product', 10, 5);
-- Expect: FK violation
```

3. CHECK validation:
```sql
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (1, 1, 0);
-- Expect: check violation (quantity > 0)
```

## 2) Procedure Tests

1. `add_to_cart` success:
```sql
SELECT * FROM add_to_cart(1, 1, 1);
```

2. `add_to_cart` failure on invalid qty:
```sql
SELECT * FROM add_to_cart(1, 1, 0);
-- Expect: exception
```

3. `place_order` success:
```sql
SELECT place_order(1);
```

4. `place_order` rollback behavior:
- Put an item in cart with quantity higher than stock and run `place_order`.
- Expect: order not created, cart unchanged, no partial stock reduction.

5. `cancel_order` success:
```sql
SELECT cancel_order(<placed_order_id>, 1);
```

## 3) Trigger Tests

1. Prevent negative stock:
```sql
UPDATE products SET stock_qty = -1 WHERE product_id = 1;
-- Expect: trigger exception
```

2. Reduce stock after order:
- Compare stock before and after successful `place_order`.
- Expect: stock decreases by ordered quantity.

3. Audit logging:
```sql
SELECT * FROM inventory_audit ORDER BY changed_at DESC LIMIT 5;
SELECT * FROM order_audit ORDER BY changed_at DESC LIMIT 5;
```
- Expect rows for stock changes and order status transitions.

## 4) API Tests

Use FastAPI docs (`/docs`) or curl:

1. Register:
```bash
curl -X POST http://127.0.0.1:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo.user@example.com","password":"demo1234","phone":"9991112233"}'
```

2. Login:
```bash
curl -X POST http://127.0.0.1:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.user@example.com","password":"demo1234"}'
```

3. Product listing:
```bash
curl "http://127.0.0.1:8000/products?in_stock_only=true"
```

4. Add to cart:
```bash
curl -X POST http://127.0.0.1:8000/cart \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"product_id":1,"quantity":1}'
```

5. Place order:
```bash
curl -X POST http://127.0.0.1:8000/order \
  -H "Content-Type: application/json" \
  -d '{"user_id":1}'
```

6. Order history:
```bash
curl "http://127.0.0.1:8000/orders?user_id=1"
```

## 5) UI Flow Tests

1. Register from `login.html`.
2. Login and verify redirect to products page.
3. Add multiple products with different quantities.
4. Open cart and verify totals.
5. Open checkout and place order.
6. Verify order appears in order history.
7. Cancel a placed order and verify status update.

## 6) Acceptance Criteria

- All mandatory entities exist and are linked with proper constraints.
- Basic + complex SQL queries run and produce meaningful results.
- Procedures and triggers execute with visible business effects.
- API flow is stable and does not leave inconsistent data.
- UI demonstrates complete end-to-end user journey.
