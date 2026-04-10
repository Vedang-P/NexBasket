from pathlib import Path

import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .config import API_TITLE
from .db import get_connection
from .repositories import (
    add_to_cart,
    cancel_order,
    create_user,
    get_cart,
    get_orders,
    get_products,
    get_user_by_email,
    place_order,
)
from .schemas import (
    AddToCartRequest,
    CancelOrderRequest,
    LoginRequest,
    PlaceOrderRequest,
    RegisterRequest,
)
from .security import hash_password, verify_password

app = FastAPI(title=API_TITLE, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/ui", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="ui")


@app.get("/")
def root() -> RedirectResponse | dict[str, str]:
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/ui/login.html")
    return {"message": "Shopping Cart API is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/users/register")
def register_user(payload: RegisterRequest) -> dict:
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    with get_connection() as conn:
        try:
            with conn.transaction():
                user = create_user(
                    conn,
                    name=payload.name,
                    email=payload.email,
                    password_hash=hash_password(payload.password),
                    phone=payload.phone,
                )
                return {
                    "message": "User registered successfully",
                    "user": user,
                }
        except psycopg.errors.UniqueViolation:
            raise HTTPException(status_code=409, detail="Email already registered.") from None
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/users/login")
def login_user(payload: LoginRequest) -> dict:
    with get_connection() as conn:
        user = get_user_by_email(conn, email=payload.email)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="User account is inactive.")

        return {
            "message": "Login successful",
            "user_id": user["user_id"],
            "name": user["full_name"],
            "email": user["email"],
        }


@app.get("/products")
def list_products(
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    in_stock_only: bool = Query(default=False),
) -> dict:
    with get_connection() as conn:
        products = get_products(
            conn,
            category_id=category_id,
            search=search,
            in_stock_only=in_stock_only,
        )
        return {"count": len(products), "products": products}


@app.post("/cart")
def add_item_to_cart(payload: AddToCartRequest) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                result = add_to_cart(
                    conn,
                    user_id=payload.user_id,
                    product_id=payload.product_id,
                    quantity=payload.quantity,
                )
                return {"message": "Item added to cart", "result": result}
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/cart")
def view_cart(user_id: int = Query(..., gt=0)) -> dict:
    with get_connection() as conn:
        return get_cart(conn, user_id=user_id)


@app.post("/order")
def create_order(payload: PlaceOrderRequest) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                order_id = place_order(conn, user_id=payload.user_id)
                return {"message": "Order placed successfully", "order_id": order_id}
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/orders")
def list_user_orders(user_id: int = Query(..., gt=0)) -> dict:
    with get_connection() as conn:
        orders = get_orders(conn, user_id=user_id)
        return {"count": len(orders), "orders": orders}


@app.post("/orders/{order_id}/cancel")
def cancel_user_order(order_id: int, payload: CancelOrderRequest) -> dict:
    with get_connection() as conn:
        try:
            with conn.transaction():
                cancelled = cancel_order(
                    conn,
                    order_id=order_id,
                    user_id=payload.user_id,
                )
                if not cancelled:
                    raise HTTPException(status_code=400, detail="Order cancellation failed.")
                return {"message": "Order cancelled successfully", "order_id": order_id}
        except psycopg.Error as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
