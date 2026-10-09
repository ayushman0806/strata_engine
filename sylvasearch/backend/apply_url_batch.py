from pathlib import Path

utils = Path("app/url_utils.py")
tests = Path("tests/test_url_utils.py")

if utils.exists() or tests.exists():
    raise SystemExit(
        "A target file already exists. Stopping to preserve existing work."
    )

utils.parent.mkdir(parents=True, exist_ok=True)
tests.parent.mkdir(parents=True, exist_ok=True)

utils.write_text('''"""URL normalization and deduplication helpers."""
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
''', encoding="utf-8")

tests.write_text('''import pytest

from app.url_utils import canonicalize_url, deduplicate_urls


def test_normalizes_host_scheme_default_port_and_fragment():
    assert canonicalize_url(
        "HTTP://Example.COM:80/path/#section"
    ) == "http://example.com/path"


def test_removes_tracking_parameters_and_sorts_query():
    assert canonicalize_url(
        "https://example.com/?utm_source=x&b=2&a=1&fbclid=abc"
    ) == "https://example.com/?a=1&b=2"


def test_preserves_non_tracking_query_parameters():
    assert canonicalize_url(
        "https://example.com/search?q=python&page=2"
    ) == "https://example.com/search?page=2&q=python"


def test_deduplicates_in_first_seen_order():
    urls = [
        "https://EXAMPLE.com/page#top",
        "https://example.com/page/",
        "https://example.com/other",
    ]
    assert deduplicate_urls(urls) == [
        "https://example.com/page",
        "https://example.com/other",
    ]


@pytest.mark.parametrize("url", [
    "",
    "/relative/path",
    "javascript:alert(1)",
    "ftp://example.com/file",
    "https://user:password@example.com/",
])
def test_rejects_unsupported_or_unsafe_urls(url):
    with pytest.raises(ValueError):
        canonicalize_url(url)
''', encoding="utf-8")

print("Created app/url_utils.py")
print("Created tests/test_url_utils.py")
print("Existing crawler, database, and index files were left untouched.")
