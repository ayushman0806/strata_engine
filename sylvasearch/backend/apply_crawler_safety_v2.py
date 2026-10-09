from pathlib import Path
import re
import shutil

crawler = Path("app/crawler/crawler.py")
policy = Path("app/crawler/politeness.py")
backup = Path("app/crawler/crawler.py.pre_robots_politeness.bak")

if not crawler.exists():
    raise SystemExit("Crawler file not found.")
if policy.exists() or backup.exists():
    raise SystemExit("Policy or backup exists; stopping safely.")

source = crawler.read_text(encoding="utf-8")

policy_code = '''"""Robots checks and per-host request pacing."""
import threading
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

USER_AGENT = "SylvaSearchBot"
DEFAULT_DELAY = 1.0
_cache = {}
_guard = threading.Lock()
_host_locks = {}
_next_request = {}


def safe_get(url, session=None, **kwargs):
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Only absolute HTTP(S) URLs are allowed.")

    origin = f"{parts.scheme}://{parts.netloc}"
    with _guard:
        parser = _cache.get(origin)

    if parser is None:
        response = requests.get(
            origin + "/robots.txt",
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        parser = RobotFileParser()
        parser.set_url(origin + "/robots.txt")
        if response.status_code in (404, 410):
            parser.parse([])
        else:
            response.raise_for_status()
            parser.parse(response.text.splitlines())
        with _guard:
            _cache[origin] = parser

    if not parser.can_fetch(USER_AGENT, url):
        raise PermissionError(f"Robots.txt disallows: {url}")

    delay = parser.crawl_delay(USER_AGENT)
    delay = max(DEFAULT_DELAY, float(delay or 0))

    with _guard:
        host_lock = _host_locks.setdefault(origin, threading.Lock())

    with host_lock:
        with _guard:
            wait = _next_request.get(origin, 0) - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        with _guard:
            _next_request[origin] = time.monotonic() + delay

    kwargs.setdefault("timeout", 15)
    headers = dict(kwargs.pop("headers", {}) or {})
    headers.setdefault("User-Agent", USER_AGENT)
    kwargs["headers"] = headers

    getter = session.get if session is not None else requests.get
    return getter(url, **kwargs)
'''

# Match common real fetch forms, preserving session-based requests.
patterns = [
    (r'(?P<receiver>self\\.session|self\\.http|session)\\.get\\(\\s*(?P<url>[A-Za-z_]\\w*)',
     lambda m: f'safe_get({m.group("url")}, session={m.group("receiver")}'),
    (r'requests\\.get\\(\\s*(?P<url>url|target_url|page_url|current_url)',
     lambda m: f'safe_get({m.group("url")}'),
]

updated = source
replacements = 0
for pattern, repl in patterns:
    updated, count = re.subn(pattern, repl, updated)
    replacements += count

if replacements == 0:
    print("No supported fetch pattern found; no files changed.")
    print("Next patch must target the crawler's actual fetch method.")
    raise SystemExit(2)

# Ensure the helper import is present.
if "from app.crawler.politeness import safe_get" not in updated:
    lines = updated.splitlines(keepends=True)
    positions = [
        i for i, line in enumerate(lines)
        if line.startswith("import ") or line.startswith("from ")
    ]
    if not positions:
        raise SystemExit("Could not place helper import; no files changed.")
    lines.insert(positions[-1] + 1,
                 "from app.crawler.politeness import safe_get\n")
    updated = "".join(lines)

try:
    compile(policy_code, str(policy), "exec")
    compile(updated, str(crawler), "exec")
except SyntaxError as exc:
    raise SystemExit(f"Syntax check failed; no files changed: {exc}")

shutil.copy2(crawler, backup)
policy.write_text(policy_code, encoding="utf-8")
crawler.write_text(updated, encoding="utf-8")

print(f"Integrated safe_get at {replacements} fetch call(s).")
print(f"Backup: {backup}")
