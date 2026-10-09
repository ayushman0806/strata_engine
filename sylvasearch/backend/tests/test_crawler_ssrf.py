import socket
import pytest
import requests

from app.crawler.crawler import validate_outbound_url


@pytest.mark.parametrize("url", [
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://169.254.169.254",
    "http://[::1]",
    "http://localhost",
    "http://service.localhost",
    "ftp://example.com",
    "http://user:pass@example.com",
])
def test_blocks_unsafe_outbound_urls(url):
    with pytest.raises(requests.exceptions.InvalidURL):
        validate_outbound_url(url)


def test_allows_public_ip():
    validate_outbound_url("https://8.8.8.8")


def test_blocks_hostname_resolving_to_private_ip(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "",
             ("192.168.1.10", 80))
        ],
    )

    with pytest.raises(requests.exceptions.InvalidURL):
        validate_outbound_url("http://example.test")


def test_blocks_hostname_with_mixed_public_and_private_addresses(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 80)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 80)),
        ],
    )

    with pytest.raises(requests.exceptions.InvalidURL):
        validate_outbound_url("http://example.test")


@pytest.mark.parametrize("url", [
    "http://127.0.0.1:badport",
    "http://[::]",
    "http://[::ffff:127.0.0.1]",
])
def test_blocks_malformed_or_nonpublic_ip_urls(url):
    with pytest.raises(requests.exceptions.InvalidURL):
        validate_outbound_url(url)

def test_blocks_redirect_to_private_ip(monkeypatch):
    """A public URL must not redirect the crawler to a private IP."""
    import requests
    import socket
    import pytest
    from app.crawler.crawler import SafeSession

    # The initial hostname resolves to a public address.
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                6,
                "",
                ("8.8.8.8", 80),
            )
        ],
    )

    # Simulate a public endpoint redirecting to localhost.
    def fake_adapter_send(self, request, **kwargs):
        response = requests.Response()
        response.status_code = 302
        response.headers["Location"] = "http://127.0.0.1/private"
        response.url = request.url
        response.request = request
        return response

    monkeypatch.setattr(
        requests.adapters.HTTPAdapter,
        "send",
        fake_adapter_send,
    )

    with SafeSession() as session:
        with pytest.raises(requests.exceptions.InvalidURL):
            session.get("http://example.test/start", timeout=2)
