from fastapi import HTTPException
import pytest

from app.main import validate_http_url


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1",
        "http://127.0.0.1:8000/debug",
        "http://10.0.0.1",
        "http://192.168.1.1",
        "http://169.254.169.254",
        "http://[::1]",
        "http://localhost",
        "http://service.localhost",
        "ftp://example.com",
        "http://user:password@example.com",
    ],
)
def test_rejects_unsafe_seed_urls(url):
    with pytest.raises(HTTPException) as exc:
        validate_http_url(url)

    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    "url, expected_host",
    [
        ("https://8.8.8.8", "8.8.8.8"),
        ("http://1.1.1.1/path", "1.1.1.1"),
    ],
)
def test_accepts_public_ip_seed_urls(url, expected_host):
    assert validate_http_url(url) == expected_host


def test_rejects_empty_url():
    with pytest.raises(HTTPException) as exc:
        validate_http_url("")

    assert exc.value.status_code == 400
