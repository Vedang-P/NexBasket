import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/dbs_mini_project",
)
API_TITLE = "Database-Driven Shopping Cart API"
