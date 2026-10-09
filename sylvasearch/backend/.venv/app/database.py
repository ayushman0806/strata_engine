import sqlite3
from pathlib import Path

# backend/app/database.py -> backend/data/sylvasearch.db
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE = DATA_DIR / "sylvasearch.db"

def get_connection():
    connection = sqlite3.connect(DATABASE, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 30000")
    return connection

def initialize_database():
    """Create missing tables and indexes without deleting existing data."""
    connection = get_connection()
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_url TEXT NOT NULL,
                target_url TEXT NOT NULL,
                UNIQUE(source_url, target_url)
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS crawl_frontier (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                source_url TEXT,
                depth INTEGER NOT NULL DEFAULT 0,
                priority INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'crawled', 'failed')),
                attempts INTEGER NOT NULL DEFAULT 0,
                discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                next_attempt_at TIMESTAMP,
                last_error TEXT
            )
        """)
        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_frontier_status_priority
            ON crawl_frontier(status, priority DESC, id ASC)
        """)
        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_frontier_retry
            ON crawl_frontier(status, next_attempt_at)
        """)
                # Recover unfinished jobs left behind by a previous process.
        # Retry jobs that still have attempts available.
        connection.execute("""
            UPDATE crawl_frontier
            SET status = 'pending',
                updated_at = CURRENT_TIMESTAMP,
                next_attempt_at = NULL,
                last_error = 'Recovered after interrupted crawl'
            WHERE status = 'processing'
              AND attempts < 3
        """)

        # Stop jobs that have exhausted their retry budget.
        connection.execute("""
            UPDATE crawl_frontier
            SET status = 'failed',
                updated_at = CURRENT_TIMESTAMP,
                last_error = 'Interrupted crawl; retry limit exhausted'
            WHERE status = 'processing'
              AND attempts >= 3
        """)

        
        # Recover interrupted crawl jobs on startup.
        connection.execute("""
            UPDATE crawl_frontier
            SET status = 'pending',
                updated_at = CURRENT_TIMESTAMP,
                next_attempt_at = NULL,
                last_error = 'Recovered after interrupted crawl'
            WHERE status = 'processing'
              AND attempts < 3
        """)

        connection.execute("""
            UPDATE crawl_frontier
            SET status = 'failed',
                updated_at = CURRENT_TIMESTAMP,
                last_error = 'Interrupted crawl; retry limit exhausted'
            WHERE status = 'processing'
              AND attempts >= 3
        """)

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def get_all_documents():
    """Return stored documents for rebuilding the in-memory index."""
    connection = get_connection()
    try:
        return connection.execute("""
            SELECT id, url, title, content
            FROM documents
            ORDER BY id
        """).fetchall()
    finally:
        connection.close()

def enqueue_url(url, source_url=None, depth=0, priority=0):
    """Add a URL once; do not overwrite an existing frontier record."""
    if not url or not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")
    if depth < 0:
        raise ValueError("Depth cannot be negative")

    connection = get_connection()
    try:
        cursor = connection.execute("""
            INSERT OR IGNORE INTO crawl_frontier
                (url, source_url, depth, priority)
            VALUES (?, ?, ?, ?)
        """, (url, source_url, depth, priority))
        connection.commit()
        return cursor.rowcount == 1
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def enqueue_urls(urls):
    """Enqueue a list of dictionaries containing URL metadata."""
    added = 0
    for item in urls:
        if enqueue_url(
            url=item["url"],
            source_url=item.get("source_url"),
            depth=item.get("depth", 0),
            priority=item.get("priority", 0),
        ):
            added += 1
    return added

def claim_next_url(max_attempts=3):
    """Atomically claim the next eligible URL for a crawler worker."""
    connection = get_connection()
    try:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute("""
            SELECT id, url, source_url, depth, priority, attempts
            FROM crawl_frontier
            WHERE status = 'pending'
              AND attempts < ?
              AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
            ORDER BY priority DESC, id ASC
            LIMIT 1
        """, (max_attempts,)).fetchone()

        if row is None:
            connection.commit()
            return None

        cursor = connection.execute("""
            UPDATE crawl_frontier
            SET status = 'processing',
                attempts = attempts + 1,
                updated_at = CURRENT_TIMESTAMP,
                last_error = NULL
            WHERE id = ? AND status = 'pending'
        """, (row["id"],))

        if cursor.rowcount != 1:
            connection.rollback()
            return None

        claimed = dict(row)
        claimed["attempts"] += 1
        connection.commit()
        return claimed
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def mark_url_crawled(url):
    """Mark a currently processing URL as successfully crawled."""
    connection = get_connection()
    try:
        cursor = connection.execute("""
            UPDATE crawl_frontier
            SET status = 'crawled',
                updated_at = CURRENT_TIMESTAMP,
                next_attempt_at = NULL,
                last_error = NULL
            WHERE url = ? AND status = 'processing'
        """, (url,))
        connection.commit()
        return cursor.rowcount == 1
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def mark_url_failed(url, error, max_attempts=3, retry_delay_seconds=60):
    """Retry a temporary failure, or mark it failed when attempts are exhausted."""
    connection = get_connection()
    try:
        row = connection.execute("""
            SELECT attempts FROM crawl_frontier
            WHERE url = ? AND status = 'processing'
        """, (url,)).fetchone()
        if row is None:
            return False

        error_text = str(error)[:2000]
        if row["attempts"] >= max_attempts:
            connection.execute("""
                UPDATE crawl_frontier
                SET status = 'failed', updated_at = CURRENT_TIMESTAMP,
                    next_attempt_at = NULL, last_error = ?
                WHERE url = ? AND status = 'processing'
            """, (error_text, url))
        else:
            connection.execute("""
                UPDATE crawl_frontier
                SET status = 'pending', updated_at = CURRENT_TIMESTAMP,
                    next_attempt_at = datetime('now', '+' || ? || ' seconds'),
                    last_error = ?
                WHERE url = ? AND status = 'processing'
            """, (max(0, retry_delay_seconds), error_text, url))
        connection.commit()
        return True
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def mark_url_permanently_failed(url, error):
    """Mark a non-retryable URL as failed immediately."""
    connection = get_connection()
    try:
        cursor = connection.execute("""
            UPDATE crawl_frontier
            SET status = 'failed', updated_at = CURRENT_TIMESTAMP,
                next_attempt_at = NULL, last_error = ?
            WHERE url = ? AND status = 'processing'
        """, (str(error)[:2000], url))
        connection.commit()
        return cursor.rowcount == 1
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def mark_url_permanently_failed(url: str, error: str) -> None:
    """Mark a URL as permanently failed so it will not be retried."""
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE crawl_frontier
            SET status = 'failed',
                next_attempt_at = NULL,
                last_error = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE url = ?
            """,
            (error[:2000], url),
        )

def get_frontier_stats():
    """Return counts for each crawl frontier status."""
    connection = get_connection()
    try:
        rows = connection.execute("""
            SELECT status, COUNT(*) AS count
            FROM crawl_frontier
            GROUP BY status
        """).fetchall()
        stats = {"pending": 0, "processing": 0, "crawled": 0, "failed": 0}
        for row in rows:
            stats[row["status"]] = row["count"]
        stats["total"] = sum(stats.values())
        return stats
    finally:
        connection.close()
