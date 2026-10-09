import ast
import shutil
from pathlib import Path

path = Path("app/main.py")
backup = Path("app/main.py.pre_link_canonicalization.bak")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

fn = next(
    (n for n in tree.body
     if isinstance(n, ast.FunctionDef)
     and n.name == "save_crawled_documents"),
    None,
)
if fn is None:
    raise SystemExit("save_crawled_documents not found; no changes made.")

body = fn.body
insert_after = body[0].end_lineno if (
    body
    and isinstance(body[0], ast.Expr)
    and isinstance(body[0].value, ast.Constant)
    and isinstance(body[0].value.value, str)
) else fn.lineno

function_source = "\n".join(
    source.splitlines()[fn.lineno - 1:fn.end_lineno]
)
if "canonicalize_url" in function_source:
    raise SystemExit("Canonicalization already present in save function.")

block = '''    from app.url_utils import canonicalize_url

    # Normalize page URLs and outgoing links before persistence.
    normalized_documents = []
    for document in documents:
        try:
            document["url"] = canonicalize_url(document["url"])
        except (ValueError, KeyError, TypeError):
            continue

        normalized_links = []
        seen_links = set()
        for raw_link in document.get("links", []) or []:
            if not isinstance(raw_link, str):
                continue
            try:
                target = canonicalize_url(raw_link)
            except (ValueError, TypeError):
                continue
            if target not in seen_links:
                seen_links.add(target)
                normalized_links.append(target)

        document["links"] = normalized_links
        normalized_documents.append(document)

    documents[:] = normalized_documents
'''

lines = source.splitlines(keepends=True)
lines.insert(insert_after, block)
updated = "".join(lines)

compile(updated, str(path), "exec")
if backup.exists():
    raise SystemExit(f"{backup} already exists; no changes made.")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print("Canonicalized document URLs and outgoing links before persistence.")
print(f"Backup: {backup}")
