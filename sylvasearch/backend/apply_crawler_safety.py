from pathlib import Path
import shutil

crawler = Path("app/crawler/crawler.py")
policy = Path("app/crawler/politeness.py")
backup = Path("app/crawler/crawler.py.pre_robots_politeness.bak")

if not crawler.exists():
    raise SystemExit("Crawler file not found; no changes made.")
if policy.exists() or backup.exists():
    raise SystemExit("Policy or backup already exists; preserving existing files.")

source = crawler.read_text(encoding="utf-8")
if "requests.get(" not in source:
    raise SystemExit(
        "No requests.get fetch call found. No changes made; "
        "the crawler may use a different fetch method."
    )
if "safe_get(" in source:
    raise SystemExit("Crawler already uses safe_get; no changes made.")

policy_source = '''"""Robots policy and per-host politeness controls for SylvaSearch."""
import threading
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

USER_AGENT = "SylvaSearchBot"
DEFAULT_DELAY_SECONDS = 1.0
ROBOTS_TIMEOUT_SECONDS = 5
PAGE_TIMEOUT_SECONDS = 15

_cache = {}
_cache_lock = threading.Lock()
_host_locks = {}
_next_allowed = {}


def _robots_policy(url):
    parts = urlsplit(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    robots_url = f"{origin}/robots.txt"

    with _cache_lock:
        cached = _cache.get(origin)
        if cached is not None:
            return cached

    response = requests.get(
        robots_url,
        headers={"User-Agent": USER_AGENT},
        timeout=ROBOTS_TIMEOUT_SECONDS,
        allow_redirects=True,
    )

    parser = RobotFileParser()
    parser.set_url(robots_url)

    if response.status_code in (404, 410):
        parser.parse([])
    else:
        response.raise_for_status()
        parser.parse(response.text.splitlines())

    with _cache_lock:
        _cache[origin] = parser

    return parser


def _host_delay(parser):
    delay = parser.crawl_delay(USER_AGENT)
    if delay is None:
        delay = DEFAULT_DELAY_SECONDS

    rate = parser.request_rate(USER_AGENT)
    if rate and rate.requests > 0:
        delay = max(delay, rate.seconds / rate.requests)

    return max(0.0, float(delay))


def _wait_for_host(origin, delay):
    with _cache_lock:
        lock = _host_locks.setdefault(origin, threading.Lock())

    with lock:
        now = time.monotonic()
        with _cache_lock:
            next_time = _next_allowed.get(origin, now)

        if next_time > now:
            time.sleep(next_time - now)

        with _cache_lock:
            _next_allowed[origin] = time.monotonic() + delay


def safe_get(url, **kwargs):
    """Fetch a page only when allowed by robots.txt and host pacing."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Only absolute HTTP(S) URLs may be fetched.")

    parser = _robots_policy(url)
    if not parser.can_fetch(USER_AGENT, url):
        raise PermissionError(f"Robots policy disallows crawling: {url}")

    origin = f"{parts.scheme}://{parts.netloc}"
    _wait_for_host(origin, _host_delay(parser))

    kwargs.setdefault("timeout", PAGE_TIMEOUT_SECONDS)
    headers = dict(kwargs.pop("headers", {}) or {})
    headers.setdefault("User-Agent", USER_AGENT)
    kwargs["headers"] = headers

    return requests.get(url, **kwargs)
'''

# Add the wrapper import and route page fetches through it.
updated = source.replace(
    "requests.get(",
    "safe_get(",
)
import_line = "from app.crawler.politeness import safe_get\n"

lines = updated.splitlines(keepends=True)
insert_at = 0
for i, line in enumerate(lines):
    if line.startswith("import ") or line.startswith("from "):
        insert_at = i + 1

lines.insert(insert_at, import_line)
updated = "".join(lines)

compile(policy_source, str(policy), "exec")
compile(updated, str(crawler), "exec")

shutil.copy2(crawler, backup)
policy.write_text(policy_source, encoding="utf-8")
crawler.write_text(updated, encoding="utf-8")

print("Crawler fetch path now uses safe_get.")
print("Added robots.txt checks, host throttling, and timeouts.")
print(f"Backup: {backup}")
