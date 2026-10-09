from pathlib import Path
import ast

path = Path("app/crawler/crawler.py")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

for node in ast.walk(tree):
    if not isinstance(node, (ast.Call,)):
        continue

    func = node.func
    method = func.attr if isinstance(func, ast.Attribute) else ""
    if method in {"get", "request", "send", "fetch", "urlopen"}:
        start = max(1, node.lineno - 5)
        end = min(len(source.splitlines()), node.end_lineno + 5)
        print(f"\n--- Fetch call at lines {node.lineno}-{node.end_lineno} ---")
        for number in range(start, end + 1):
            print(f"{number}: {source.splitlines()[number - 1]}")
