import psycopg


def create_user(
    conn: psycopg.Connection,
    *,
    name: str,
    email: str,
    password_hash: str,
    phone: str | None,
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (full_name, email, password_hash, phone)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id, full_name, email, phone, created_at
            """,
            (name, email.lower(), password_hash, phone),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to create user")
        return row


def get_user_by_email(conn: psycopg.Connection, *, email: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, full_name, email, password_hash, is_active
            FROM users
            WHERE email = %s
            """,
            (email.lower(),),
        )
        return cur.fetchone()


def get_products(
    conn: psycopg.Connection,
    *,
    category_id: int | None,
    search: str | None,
    in_stock_only: bool,
) -> list[dict]:
    filters: list[str] = ["p.is_active = TRUE"]
    params: list[object] = []

    if category_id is not None:
        filters.append("p.category_id = %s")
        params.append(category_id)

    if search:
        filters.append("LOWER(p.product_name) LIKE %s")
        params.append(f"%{search.lower()}%")

    if in_stock_only:
        filters.append("p.stock_qty > 0")

    where_clause = " AND ".join(filters)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                p.product_id,
                p.sku,
                p.product_name,
                p.description,
                p.price,
                p.stock_qty,
                p.reorder_level,
                c.category_id,
                c.category_name
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            WHERE {where_clause}
            ORDER BY p.product_name
            """,
            tuple(params),
        )
        return list(cur.fetchall())


def add_to_cart(
    conn: psycopg.Connection,
    *,
    user_id: int,
    product_id: int,
    quantity: int,
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT cart_id, cart_item_id, final_quantity
            FROM add_to_cart(%s, %s, %s)
            """,
            (user_id, product_id, quantity),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Unable to add item to cart")
        return row


def get_cart(conn: psycopg.Connection, *, user_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.cart_id, c.user_id
            FROM carts c
            WHERE c.user_id = %s
            """,
            (user_id,),
        )
        cart = cur.fetchone()
        if cart is None:
            return {"cart_id": None, "user_id": user_id, "items": [], "total_amount": 0}

        cur.execute(
            """
            SELECT
                ci.cart_item_id,
                ci.product_id,
                p.sku,
                p.product_name,
                p.price,
                ci.quantity,
                (p.price * ci.quantity) AS line_total
            FROM cart_items ci
            JOIN products p ON p.product_id = ci.product_id
            WHERE ci.cart_id = %s
            ORDER BY p.product_name
            """,
            (cart["cart_id"],),
        )
        items = list(cur.fetchall())

    total_amount = float(sum(item["line_total"] for item in items))
    return {
        "cart_id": cart["cart_id"],
        "user_id": user_id,
        "items": items,
        "total_amount": total_amount,
    }


def place_order(conn: psycopg.Connection, *, user_id: int) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT place_order(%s) AS order_id", (user_id,))
        row = cur.fetchone()
        if row is None:
            raise ValueError("Order creation failed")
        return int(row["order_id"])


def get_orders(conn: psycopg.Connection, *, user_id: int) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                o.order_id,
                o.order_status,
                o.total_amount,
                o.placed_at,
                o.cancelled_at,
                o.completed_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'order_item_id', oi.order_item_id,
                            'product_id', oi.product_id,
                            'product_name', p.product_name,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'line_total', oi.line_total
                        )
                        ORDER BY oi.order_item_id
                    ) FILTER (WHERE oi.order_item_id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            LEFT JOIN products p ON p.product_id = oi.product_id
            WHERE o.user_id = %s
            GROUP BY o.order_id
            ORDER BY o.placed_at DESC
            """,
            (user_id,),
        )
        return list(cur.fetchall())


def cancel_order(conn: psycopg.Connection, *, order_id: int, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT cancel_order(%s, %s) AS cancelled",
            (order_id, user_id),
        )
        row = cur.fetchone()
        return bool(row and row["cancelled"])
