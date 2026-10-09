from pathlib import Path
import shutil

path = Path("app/crawler/crawler.py")
backup = Path("app/crawler/crawler.py.pre_robots_fail_closed.bak")
source = path.read_text(encoding="utf-8")

old_fetch = '''            response = self.session.get(robots_url, timeout=10)
            response.raise_for_status()
            parser.parse(response.text.splitlines())
            self.robot_parsers[origin] = parser
            return parser
'''

new_fetch = '''            response = self.session.get(robots_url, timeout=10)

            # An explicit missing robots.txt means no published rules.
            if response.status_code in (404, 410):
                parser.parse([])
                self.robot_parsers[origin] = parser
                return parser

            response.raise_for_status()
            parser.parse(response.text.splitlines())
            self.robot_parsers[origin] = parser
            return parser
'''

old_policy = '''        # Retrieval failures are handled as unavailable robots.txt.
        if parser is None:
            return True
'''

new_policy = '''        # Fail closed on retrieval errors or invalid URLs.
        if parser is None:
            return False
'''

if backup.exists():
    raise SystemExit("Backup already exists; no changes made.")
if source.count(old_fetch) != 1 or source.count(old_policy) != 1:
    raise SystemExit("Expected code differs; no changes made.")

updated = source.replace(old_fetch, new_fetch, 1)
updated = updated.replace(old_policy, new_policy, 1)
compile(updated, str(path), "exec")

shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print("Robots handling fixed: 404/410 allows; retrieval failures block.")
print(f"Backup: {backup}")
