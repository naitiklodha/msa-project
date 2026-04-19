import psycopg

from .config import POSTGRES_URL, VECTOR_DIM


def get_connection() -> psycopg.Connection:
    return psycopg.connect(POSTGRES_URL)


def init_db() -> None:
    # init.sql in the root directory manages the schema automatically on startup.
    # We keep this as a no-op or fallback.
    pass
