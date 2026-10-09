import ast
import shutil
from pathlib import Path

path = Path("app/database.py")
backup = Path("app/database.py.pre_url_integration.bak")
source = path.read_text(encoding="utf-8")

tree = ast.parse(source)
function = next(
    (node for node in tree.body
     if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
     and node.name == "enqueue_url"),
    None,
)

if function is None:
    raise SystemExit("enqueue_url not found; no changes made.")

if "source_url" not in {
    arg.arg for arg in function.args.args
}:
    raise SystemExit("enqueue_url signature differs; no changes made.")

lines = source.splitlines(keepends=True)
function_source = "".join(lines[function.lineno - 1:function.end_lineno])

if "canonicalize_url" in function_source:
    raise SystemExit("URL canonicalization already integrated; no changes made.")

insert_line = function.lineno
if (
    function.body
    and isinstance(function.body[0], ast.Expr)
    and isinstance(function.body[0].value, (ast.Constant, ast.Str))
    and isinstance(getattr(function.body[0].value, "value", None), str)
):
    insert_line = function.body[0].end_lineno

snippet = [
    "    from app.url_utils import canonicalize_url\n",
    "    url = canonicalize_url(url)\n",
    "    if source_url:\n",
    "        source_url = canonicalize_url(source_url)\n",
]

lines[insert_line:insert_line] = snippet
updated = "".join(lines)
compile(updated, str(path), "exec")

if backup.exists():
    raise SystemExit(f"{backup} already exists; no changes made.")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print("URL canonicalization integrated into enqueue_url.")
print("Backup created:", backup)
