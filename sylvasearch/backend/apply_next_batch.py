from pathlib import Path
import re
import shutil

root = Path.cwd()
db_path = root / "app" / "database.py"
main_path = root / "app" / "main.py"
benchmark_path = root / "scripts" / "benchmark_search.py"

if not db_path.exists() or not main_path.exists():
    raise SystemExit("Run this from the backend directory. No files changed.")

db = db_path.read_text(encoding="utf-8")
main = main_path.read_text(encoding="utf-8")

# 1. Batch URL enqueueing: one connection and one transaction.
enqueue_pattern = re.compile(
    r"(?ms)^def enqueue_urls\(urls\):\n.*?(?=^def |\Z)"
)
enqueue_match = enqueue_pattern.search(db)
if not enqueue_match:
    raise SystemExit("Could not locate enqueue_urls(); no files changed.")

new_enqueue = '''def enqueue_urls(urls):
    """Enqueue URL dictionaries in one transaction."""
    rows = []
    for item in urls:
        url = item["url"]
        depth = item.get("depth", 0)
        if not url or not url.startswith(("http://", "https://")):
            raise ValueError(f"Invalid URL: {url!r}")
        if not isinstance(depth, int) or depth < 0:
            raise ValueError(f"Invalid crawl depth: {depth!r}")
        rows.append((
            url,
            item.get("source_url"),
            depth,
            item.get("priority", 0),
        ))

    if not rows:
        return 0

    connection = get_connection()
    try:
        cursor = connection.executemany(
            """
            INSERT OR IGNORE INTO crawl_frontier
                (url, source_url, depth, priority, status)
            VALUES (?, ?, ?, ?, 'pending')
            """,
            rows,
        )
        inserted = max(cursor.rowcount, 0)
        connection.commit()
        return inserted
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


'''
db_new = db[:enqueue_match.start()] + new_enqueue + db[enqueue_match.end():]

# 2. Add an index for queries that look up incoming links by target.
init_match = re.search(r"(?ms)^def initialize_database\(\):\n.*?(?=^def |\Z)", db_new)
if not init_match:
    raise SystemExit("Could not locate initialize_database(); no files changed.")

init_body = init_match.group(0)
conn_match = re.search(
    r"\b(\w+)\s*=\s*get_connection\(\)|with get_connection\(\)\s+as\s+(\w+)",
    init_body,
)
commit_match = re.search(r"(?m)^(\s*)\w+\.commit\(\)", init_body)
if not conn_match or not commit_match:
    raise SystemExit("Could not safely add the link index; no files changed.")

conn_name = conn_match.group(1) or conn_match.group(2)
indent = commit_match.group(1)
index_statement = (
    f'{indent}{conn_name}.execute('
    '"CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_url)")\n'
)
if "idx_links_target" not in init_body:
    init_body = (
        init_body[:commit_match.start()]
        + index_statement
        + init_body[commit_match.start():]
    )
    db_new = db_new[:init_match.start()] + init_body + db_new[init_match.end():]

# 3. Add incremental in-memory indexing to main.py.
rebuild_pattern = re.compile(
    r"(?ms)^def rebuild_search_state\b[^\n]*:\n.*?(?=^(?:def |async def )|\Z)"
)
rebuild_match = rebuild_pattern.search(main)
if not rebuild_match:
    raise SystemExit("Could not locate rebuild_search_state(); no files changed.")

new_state_functions = '''def refresh_index_documents(documents):
    """Refresh only the supplied URLs in the in-memory search index."""
    urls = {item.get("url") for item in documents if item.get("url")}
    if not urls:
        return

    # Read persisted rows so the index always reflects committed database data.
    for document in get_all_documents():
        if document["url"] not in urls:
            continue
        index.add_document(
            document["id"],
            {
                "url": document["url"],
                "title": document["title"] or "",
                "text": document["content"] or "",
            },
        )


def rebuild_search_state(documents=None):
    """Refresh search state incrementally, or fully rebuild when requested."""
    if documents is None:
        load_index()
    else:
        refresh_index_documents(documents)
    search_engine.page_ranks = load_page_ranks()


'''
main_new = (
    main[:rebuild_match.start()]
    + new_state_functions
    + main[rebuild_match.end():]
)

# Change only rebuild calls immediately following the matching save operation.
main_new, count_documents = re.subn(
    r"(save_crawled_documents\(documents\)\s*\n)([ \t]*)rebuild_search_state\(\)",
    r"\1\2rebuild_search_state(documents)",
    main_new,
)
main_new, count_all = re.subn(
    r"(save_crawled_documents\(all_documents\)\s*\n)([ \t]*)rebuild_search_state\(\)",
    r"\1\2rebuild_search_state(all_documents)",
    main_new,
)

# Keep crawl-queue documents searchable as soon as they are persisted.
queue_marker = "added_docs, added_links = save_crawled_documents(documents)"
if queue_marker in main_new:
    queue_pattern = re.compile(
        r"(?m)^([ \t]*)added_docs, added_links = "
        r"save_crawled_documents\(documents\)$"
    )
    main_new, queue_count = queue_pattern.subn(
        r"\1added_docs, added_links = save_crawled_documents(documents)\n"
        r"\1refresh_index_documents(documents)",
        main_new,
        count=1,
    )
else:
    queue_count = 0

# Refuse ambiguous patches before creating backups or changing source files.
if count_documents + count_all < 1:
    raise SystemExit("No save/rebuild call matched; no files changed.")
if queue_count != 1:
    raise SystemExit("Could not safely patch crawl-queue; no files changed.")

# Make one-time backups, never overwrite an existing backup.
db_backup = db_path.with_name("database.py.pre_next_batch.bak")
main_backup = main_path.with_name("main.py.pre_next_batch.bak")
if db_backup.exists() or main_backup.exists():
    raise SystemExit("A next-batch backup already exists; no files changed.")

# Syntax-check proposed Python source before writing it.
compile(db_new, str(db_path), "exec")
compile(main_new, str(main_path), "exec")

shutil.copy2(db_path, db_backup)
shutil.copy2(main_path, main_backup)
db_path.write_text(db_new, encoding="utf-8")
main_path.write_text(main_new, encoding="utf-8")

# 4. Create a repeatable synthetic search benchmark.
benchmark_path.parent.mkdir(parents=True, exist_ok=True)
benchmark = r'''import statistics
import time

from app.indexer.index import InvertedIndex
from app.search.engine import SearchEngine


def run_benchmark(size, repeats=3):
    index = InvertedIndex()

    for doc_id in range(1, size + 1):
        rare_term = "needleterm" if doc_id % 100 == 0 else "generalterm"
        index.add_document(
            doc_id,
            {
                "url": f"https://benchmark.invalid/{doc_id}",
                "title": f"Python search document {doc_id}",
                "text": (
                    f"python search engine indexing retrieval ranking "
                    f"document {doc_id} {rare_term} performance"
                ),
            },
        )

    engine = SearchEngine(index, {})
    engine.search("needleterm")  # Warm-up
    timings = []

    for _ in range(repeats):
        start = time.perf_counter()
        engine.search("needleterm")
        timings.append((time.perf_counter() - start) * 1000)

    print(
        f"{size:>6,} docs | selective query median: "
        f"{statistics.median(timings):.2f} ms"
    )


if __name__ == "__main__":
    print("Synthetic search benchmark (selective query; median of 3 runs)")
    run_benchmark(1_000)
    run_benchmark(10_000)
'''
benchmark_path.write_text(benchmark, encoding="utf-8")

print("Next batch applied.")
print(f"Batch enqueueing: {db_path}")
print("Added idx_links_target.")
print(f"Incremental refresh calls updated: {count_documents + count_all}")
print("Crawl queue now refreshes the in-memory index after saving.")
print(f"Benchmark created: {benchmark_path}")
print(f"Backups: {db_backup.name}, {main_backup.name}")

