"""Per-host crawl pacing."""
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
