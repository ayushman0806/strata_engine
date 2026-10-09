from pathlib import Path
import ast
import shutil

path = Path("app/database.py")
backup = Path("app/database.py.pre_targeted_lookup.bak")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

if backup.exists():
    raise SystemExit("Backup already exists; no changes made.")

if any(
    isinstance(n, ast.FunctionDef) and n.name == "get_documents_by_urls"
    for n in tree.body
):
    raise SystemExit("Targeted lookup already exists; no changes made.")

function = '''def get_documents_by_urls(urls):
    """Fetch only documents matching the supplied URLs."""
    unique_urls = list(dict.fromkeys(url for url in urls if url))
    if not unique_urls:
        return []

    results = []
    connection = get_connection()
    try:
        # Stay below SQLite's common bound-variable limit.
        for start in range(0, len(unique_urls), 500):
            batch = unique_urls[start:start + 500]
            placeholders = ",".join("?" for _ in batch)
            rows = connection.execute(
                f"SELECT id, url, title, content FROM documents "
                f"WHERE url IN ({placeholders})",
                batch,
            ).fetchall()
            results.extend(dict(row) for row in rows)
        return results
    finally:
        connection.close()


'''

marker = "def get_all_documents("
if marker not in source:
    raise SystemExit("Could not locate get_all_documents; no changes made.")

updated = source.replace(marker, function + marker, 1)
compile(updated, str(path), "exec")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print("Added targeted document lookup.")
print(f"Backup: {backup}")
