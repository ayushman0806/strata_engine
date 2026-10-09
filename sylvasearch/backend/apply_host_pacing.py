from pathlib import Path
import shutil

crawler = Path("app/crawler/crawler.py")
helper = Path("app/crawler/politeness.py")
backup = Path("app/crawler/crawler.py.pre_host_pacing.bak")

source = crawler.read_text(encoding="utf-8")

target = "response = self.session.get(url, timeout=15)"
if source.count(target) != 1:
    raise SystemExit("Expected page-fetch line not found exactly once; no changes made.")
if helper.exists() or backup.exists():
    raise SystemExit("Helper or backup already exists; no changes made.")

helper_code = '''"""Per-host crawl pacing."""
import threading
import time
from urllib.parse import urlsplit

DEFAULT_HOST_DELAY_SECONDS = 1.0
_locks_guard = threading.Lock()
_host_locks = {}
_next_allowed = {}


def wait_for_host(url, delay=DEFAULT_HOST_DELAY_SECONDS):
    """Serialize requests to each host and enforce a minimum interval."""
    parts = urlsplit(url)
    origin = f"{parts.scheme.lower()}://{parts.netloc.lower()}"

    with _locks_guard:
        host_lock = _host_locks.setdefault(origin, threading.Lock())

    with host_lock:
        with _locks_guard:
            wait = _next_allowed.get(origin, 0.0) - time.monotonic()

        if wait > 0:
            time.sleep(wait)

        with _locks_guard:
            _next_allowed[origin] = time.monotonic() + max(0.0, delay)
'''

# Keep existing imports and crawler structure unchanged.
import_line = "from app.crawler.politeness import wait_for_host\n"
if import_line.strip() in source:
    raise SystemExit("Pacing import already exists; no changes made.")

updated = source.replace(
    target,
    "wait_for_host(url)\n                " + target,
    1,
)

lines = updated.splitlines(keepends=True)
import_positions = [
    i for i, line in enumerate(lines)
    if line.startswith("import ") or line.startswith("from ")
]
if not import_positions:
    raise SystemExit("Could not safely place import; no changes made.")

lines.insert(import_positions[-1] + 1, import_line)
updated = "".join(lines)

compile(helper_code, str(helper), "exec")
compile(updated, str(crawler), "exec")

shutil.copy2(crawler, backup)
helper.write_text(helper_code, encoding="utf-8")
crawler.write_text(updated, encoding="utf-8")

print("Per-host pacing integrated into the real page-fetch path.")
print("Minimum interval: 1 second per host.")
print(f"Backup: {backup}")
