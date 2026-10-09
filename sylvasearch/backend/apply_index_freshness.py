import ast
import shutil
from pathlib import Path

path = Path("app/main.py")
backup = Path("app/main.py.pre_index_freshness.bak")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

if backup.exists():
    raise SystemExit("Backup already exists; stopping safely.")

functions = {
    node.name: node for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
if "save_crawled_documents" not in functions or "load_index" not in functions:
    raise SystemExit("Expected indexing functions not found; no changes made.")
if "refresh_index_documents" in functions:
    raise SystemExit("Index refresh helper already exists; no changes made.")

helper = '''def refresh_index_documents(documents):
    """Refresh only the persisted documents represented by this crawl batch."""
    urls = {
        item.get("url")
        for item in documents
        if isinstance(item, dict) and item.get("url")
    }
    if not urls:
        return

    # Reuse the existing database accessor and incremental index update logic.
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


'''

lines = source.splitlines(keepends=True)
load_line = functions["load_index"].lineno - 1
lines.insert(load_line, helper)
intermediate = "".join(lines)
tree2 = ast.parse(intermediate)

# Find every statement that persists a crawl batch and refresh after it.
insertions = []
for node in ast.walk(tree2):
    if not isinstance(node, (ast.Assign, ast.AnnAssign, ast.Expr, ast.Return)):
        continue

    calls = [
        n for n in ast.walk(node)
        if isinstance(n, ast.Call)
        and isinstance(n.func, ast.Name)
        and n.func.id == "save_crawled_documents"
    ]
    if not calls:
        continue

    argument = calls[0].args[0] if calls[0].args else None
    if not isinstance(argument, ast.Name):
        raise SystemExit("Unexpected save call argument; no changes made.")

    start = node.lineno - 1
    indent = len(intermediate.splitlines()[start]) - len(
        intermediate.splitlines()[start].lstrip()
    )
    next_line = node.end_lineno
    following = intermediate.splitlines()[next_line:next_line + 1]
    if following and following[0].strip() == f"refresh_index_documents({argument.id})":
        continue

    insertions.append((
        next_line,
        " " * indent + f"refresh_index_documents({argument.id})\n",
    ))

if not insertions:
    raise SystemExit("No crawl-save call sites found; no changes made.")

result_lines = intermediate.splitlines(keepends=True)
for line_number, text in sorted(insertions, reverse=True):
    result_lines.insert(line_number, text)

updated = "".join(result_lines)
compile(updated, str(path), "exec")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")

print("Added incremental index refresh after crawl-save calls.")
print(f"Updated call sites: {len(insertions)}")
print(f"Backup: {backup}")
