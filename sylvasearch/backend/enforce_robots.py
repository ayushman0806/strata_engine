import ast
import shutil
from pathlib import Path

path = Path("app/crawler/crawler.py")
backup = Path("app/crawler/crawler.py.pre_robots_enforcement.bak")
source = path.read_text(encoding="utf-8")

if backup.exists():
    raise SystemExit("Backup already exists; no changes made.")

tree = ast.parse(source)
lines = source.splitlines(keepends=True)

crawl = next(
    (n for n in tree.body
     if isinstance(n, ast.FunctionDef) and n.name == "crawl"),
    None,
)
allowed = next(
    (n for n in tree.body
     if isinstance(n, ast.FunctionDef) and n.name == "allowed_by_robots"),
    None,
)

if crawl is None or allowed is None:
    raise SystemExit("Expected crawl/allowed_by_robots methods not found.")

crawl_source = "\n".join(lines[crawl.lineno - 1:crawl.end_lineno])
if "allowed_by_robots(url)" in crawl_source:
    raise SystemExit("Robots enforcement already exists in crawl().")

# Locate the page fetch, not the robots.txt fetch.
fetch = next(
    (n for n in ast.walk(crawl)
     if isinstance(n, ast.Call)
     and isinstance(n.func, ast.Attribute)
     and n.func.attr == "get"
     and isinstance(n.func.value, ast.Attribute)
     and n.func.value.attr == "session"
     and n.args
     and isinstance(n.args[0], ast.Name)
     and n.args[0].id == "url"),
    None,
)
if fetch is None:
    raise SystemExit("Page fetch call not found; no changes made.")

# Find the try statement containing the page fetch.
tries = [
    n for n in ast.walk(crawl)
    if isinstance(n, ast.Try)
    and n.lineno <= fetch.lineno <= n.end_lineno
]
if not tries:
    raise SystemExit("Could not locate fetch error-handling block.")

try_node = min(tries, key=lambda n: n.end_lineno - n.lineno)
line_index = try_node.lineno - 1
original_line = lines[line_index]
indent = original_line[:len(original_line) - len(original_line.lstrip())]

guard = (
    f"{indent}if not self.allowed_by_robots(url):\n"
    f"{indent}    print(f\"Robots.txt disallows: {{url}}\")\n"
    f"{indent}    continue\n"
)

lines.insert(line_index, guard)
updated = "".join(lines)
compile(updated, str(path), "exec")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")

print("Robots policy is now checked before page fetches.")
print(f"Backup: {backup}")
