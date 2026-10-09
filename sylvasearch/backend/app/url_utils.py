"""URL normalization and deduplication helpers."""
from urllib.parse import (
    parse_qsl,
    urlencode,
    urlsplit,
    urlunsplit,
)


TRACKING_PARAMS = {
    "fbclid", "gclid", "dclid", "msclkid",
    "ref_src", "igshid",
}


def canonicalize_url(url: str) -> str:
    """Normalize an HTTP(S) URL for consistent crawl deduplication."""
    if not isinstance(url, str) or not url.strip():
        raise ValueError("URL must be a non-empty string")

    parts = urlsplit(url.strip())
    scheme = parts.scheme.lower()

    if scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("Only absolute HTTP(S) URLs are supported")

    if parts.username is not None or parts.password is not None:
        raise ValueError("URLs containing credentials are not allowed")

    host = parts.hostname.lower()
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"

    try:
        port = parts.port
    except ValueError as exc:
        raise ValueError("Invalid URL port") from exc

    if port is not None and not (
        (scheme == "http" and port == 80)
        or (scheme == "https" and port == 443)
    ):
        host = f"{host}:{port}"

    path = parts.path or "/"
    if path != "/":
        path = path.rstrip("/") or "/"

    query_items = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        lower_key = key.lower()
        if lower_key.startswith("utm_") or lower_key in TRACKING_PARAMS:
            continue
        query_items.append((key, value))

    query_items.sort()
    query = urlencode(query_items, doseq=True)

    # Fragments are browser-side locations, not separate server resources.
    return urlunsplit((scheme, host, path, query, ""))


def deduplicate_urls(urls):
    """Return canonical URLs in first-seen order."""
    seen = set()
    result = []

    for url in urls:
        normalized = canonicalize_url(url)
        if normalized not in seen:
            seen.add(normalized)
            result.append(normalized)

    return result
