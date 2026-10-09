from app import database


def test_initialize_database_recovers_interrupted_jobs(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database, "DATABASE", tmp_path / "test_sylvasearch.db"
    )

    database.initialize_database()

    connection = database.get_connection()
    try:
        connection.execute("""
            INSERT INTO crawl_frontier (url, status, attempts)
            VALUES
                ('https://example.com/retry', 'processing', 1),
                ('https://example.com/exhausted', 'processing', 3)
        """)
        connection.commit()
    finally:
        connection.close()

    database.initialize_database()

    connection = database.get_connection()
    try:
        rows = {
            row["url"]: dict(row)
            for row in connection.execute("""
                SELECT url, status, attempts, last_error
                FROM crawl_frontier
            """).fetchall()
        }

        assert rows["https://example.com/retry"]["status"] == "pending"
        assert rows["https://example.com/retry"]["attempts"] == 1
        assert rows["https://example.com/exhausted"]["status"] == "failed"
        assert rows["https://example.com/exhausted"]["attempts"] == 3
    finally:
        connection.close()
