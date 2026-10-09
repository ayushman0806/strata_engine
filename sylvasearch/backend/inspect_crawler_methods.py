import ast
from pathlib import Path

path = Path("app/crawler/crawler.py")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

for cls in (n for n in tree.body if isinstance(n, ast.ClassDef)):
    methods = {
        n.name: n for n in cls.body
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    print(f"Class: {cls.name}")
    print("Methods:", ", ".join(methods.keys()))

    for name in ("crawl", "allowed_by_robots"):
        if name in methods:
            node = methods[name]
            print(f"\n--- {cls.name}.{name}, lines {node.lineno}-{node.end_lineno} ---")
            for number, line in enumerate(
                source.splitlines()[node.lineno - 1:node.end_lineno],
                node.lineno,
            ):
                print(f"{number}: {line}")
