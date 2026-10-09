import pytest

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
