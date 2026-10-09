import ast
from pathlib import Path

path = Path("app/crawler/crawler.py")
source = path.read_text(encoding="utf-8")
tree = ast.parse(source)

for node in ast.walk(tree):
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        continue

    calls = [
        child for child in ast.walk(node)
        if isinstance(child, ast.Call)
        and isinstance(child.func, ast.Attribute)
        and child.func.attr == "can_fetch"
    ]
    fetches = [
        child for child in ast.walk(node)
        if isinstance(child, ast.Call)
        and isinstance(child.func, ast.Attribute)
        and child.func.attr == "get"
    ]

    if calls or (node.name and "crawl" in node.name.lower()):
        print(f"\nFunction: {node.name}, lines {node.lineno}-{node.end_lineno}")
        print("Robots can_fetch checks:", len(calls))
        print("HTTP get calls:", len(fetches))
        for child in calls + fetches:
            print(f"  line {child.lineno}: {ast.unparse(child)}")
