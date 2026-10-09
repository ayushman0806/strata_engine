import requests

from app.crawler.crawler import Crawler


class FakeResponse:
    def __init__(
        self,
        status_code=200,
        text="User-agent: *\nDisallow: /private",
    ):
        self.status_code = status_code
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


def make_crawler(response=None, error=None):
    if response is None and error is None:
        response = FakeResponse()

    crawler = object.__new__(Crawler)
    crawler.robot_parsers = {}

    class FakeSession:
        def __init__(self):
            self.calls = 0

        def get(self, url, timeout=10):
            self.calls += 1
            if error is not None:
                raise error
            return response

    crawler.session = FakeSession()
    return crawler


def test_missing_robots_file_allows_urls():
    crawler = make_crawler(FakeResponse(status_code=404, text=""))
    assert crawler.allowed_by_robots("https://example.com/page") is True


def test_disallow_rule_blocks_private_path():
    crawler = make_crawler()
    assert crawler.allowed_by_robots("https://example.com/private") is False
    assert crawler.allowed_by_robots("https://example.com/public") is True


def test_robots_fetch_failure_fails_closed():
    crawler = make_crawler(error=requests.Timeout("robots.txt timed out"))
    assert crawler.allowed_by_robots("https://example.com/page") is False


def test_robots_policy_is_cached():
    crawler = make_crawler()
    crawler.allowed_by_robots("https://example.com/private")
    crawler.allowed_by_robots("https://example.com/public")
    assert crawler.session.calls == 1
