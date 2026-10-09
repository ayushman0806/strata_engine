import requests

import app.crawler.crawler as crawler_module
from app.crawler.crawler import Crawler


class FakeResponse:
    status_code = 200
    headers = {"Content-Type": "text/html"}
    text = "<html><title>Example</title><body>Test</body></html>"

    def raise_for_status(self):
        pass


class FlakySession:
    def __init__(self, failures):
        self.failures = failures
        self.calls = 0

    def get(self, url, timeout=15):
        self.calls += 1
        if self.calls <= self.failures:
            raise requests.Timeout("simulated timeout")
        return FakeResponse()


def make_crawler(monkeypatch, failures):
    crawler = Crawler(
        max_pages=1,
        allowed_domain="example.com",
        max_depth=0,
        delay=0,
    )
    crawler.session = FlakySession(failures)
    monkeypatch.setattr(crawler_module, "wait_for_host", lambda url: None)
    monkeypatch.setattr(crawler, "allowed_by_robots", lambda url: True)
    monkeypatch.setattr(crawler, "extract_links", lambda soup, url: set())
    monkeypatch.setattr(crawler, "extract_content", lambda soup: "Test content")
    return crawler


def test_transient_failure_retries_and_succeeds(monkeypatch):
    crawler = make_crawler(monkeypatch, failures=1)

    result = crawler.crawl("https://example.com/")

    assert crawler.session.calls == 2
    assert len(result["documents"]) == 1
    assert result["documents"][0]["url"] == "https://example.com/"


def test_retries_stop_after_two_retries(monkeypatch):
    crawler = make_crawler(monkeypatch, failures=99)

    result = crawler.crawl("https://example.com/")

    assert crawler.session.calls == 3
    assert result["documents"] == []
    assert result["request_errors"] == 3
