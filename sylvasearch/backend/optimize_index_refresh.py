import ast
import shutil
from pathlib import Path

path = Path("app/main.py")
backup = Path("app/main.py.pre_targeted_refresh.bak")
source = path.read_text(encoding="utf-8")

if backup.exists():
    raise SystemExit("Backup already exists; no changes made.")

tree = ast.parse(source)
refresh = next(
    (n for n in tree.body
     if isinstance(n, ast.FunctionDef)
     and n.name == "refresh_index_documents"),
    None,
)
if refresh is None:
    raise SystemExit("Existing refresh helper not found; no changes made.")

replacement = '''def refresh_index_documents(documents):
    """Refresh only persisted documents belonging to this crawl batch."""
    urls = {
        item.get("url")
        for item in documents
        if isinstance(item, dict) and item.get("url")
    }
    if not urls:
        return

    rows = get_documents_by_urls(urls)
    for document in rows:
        index.add_document(
            document["id"],
            {
                "url": document["url"],
                "title": document["title"] or "",
                "text": document["content"] or "",
            },
        )
'''

lines = source.splitlines(keepends=True)
lines[refresh.lineno - 1:refresh.end_lineno] = [replacement + "\n"]
updated = "".join(lines)

if "from app.database import get_documents_by_urls" not in updated:
    updated_lines = updated.splitlines(keepends=True)
    imports = [
        i for i, line in enumerate(updated_lines)
        if line.startswith("import ") or line.startswith("from ")
    ]
    if not imports:
        raise SystemExit("Could not safely place import; no changes made.")
    updated_lines.insert(
        imports[-1] + 1,
        "from app.database import get_documents_by_urls\n",
    )
    updated = "".join(updated_lines)

compile(updated, str(path), "exec")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")

print("Index refresh now uses targeted database lookups.")
print(f"Backup: {backup}")
