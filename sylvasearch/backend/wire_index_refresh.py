import ast
import shutil
from pathlib import Path

path = Path("app/main.py")
backup = Path("app/main.py.pre_refresh_wiring.bak")
source = path.read_text(encoding="utf-8")

if backup.exists():
    raise SystemExit("Backup already exists; no changes made.")

tree = ast.parse(source)
if not any(
    isinstance(n, ast.FunctionDef) and n.name == "refresh_index_documents"
    for n in tree.body
):
    raise SystemExit("Existing refresh helper not found; no changes made.")

lines = source.splitlines(keepends=True)
parent = {}
for node in ast.walk(tree):
    for child in ast.iter_child_nodes(node):
        parent[child] = node

statements = {}
for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    if not isinstance(node.func, ast.Name):
        continue
    if node.func.id != "save_crawled_documents":
        continue
    if not node.args or not isinstance(node.args[0], ast.Name):
        raise SystemExit("Unexpected save-call argument; no changes made.")

    statement = node
    while statement in parent and not isinstance(statement, ast.stmt):
        statement = parent[statement]

    if not isinstance(statement, ast.stmt):
        raise SystemExit("Could not locate save statement; no changes made.")

    statements[(statement.lineno, statement.end_lineno)] = (
        statement.args[0].id
        if isinstance(statement, ast.Expr)
        and isinstance(statement.value, ast.Call)
        and statement.value.args
        and isinstance(statement.value.args[0], ast.Name)
        else node.args[0].id
    )

insertions = []
source_lines = source.splitlines()
for (start, end), variable in statements.items():
    following = end
    while following < len(source_lines) and not source_lines[following].strip():
        following += 1

    next_text = source_lines[following].strip() if following < len(source_lines) else ""
    if (
        next_text.startswith(f"refresh_index_documents({variable})")
        or next_text.startswith("rebuild_search_state(")
    ):
        continue

    original_line = source_lines[start - 1]
    indent = original_line[:len(original_line) - len(original_line.lstrip())]
    insertions.append((end, f"{indent}refresh_index_documents({variable})\n"))

if not insertions:
    print("All crawl-save paths already refresh or rebuild the index.")
    raise SystemExit(0)

for line_number, new_line in sorted(insertions, reverse=True):
    lines.insert(line_number, new_line)

updated = "".join(lines)
compile(updated, str(path), "exec")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")

print(f"Added index refresh to {len(insertions)} crawl-save path(s).")
print(f"Backup: {backup}")
