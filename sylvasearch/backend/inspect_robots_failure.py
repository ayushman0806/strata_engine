from pathlib import Path
import ast

p = Path("app/crawler/crawler.py")
s = p.read_text(encoding="utf-8")
tree = ast.parse(s)

for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef) and node.name == "get_robot_parser":
        print(f"--- get_robot_parser, lines {node.lineno}-{node.end_lineno} ---")
        for i, line in enumerate(
            s.splitlines()[node.lineno - 1:node.end_lineno],
            node.lineno,
        ):
            print(f"{i}: {line}")
