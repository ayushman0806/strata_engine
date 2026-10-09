from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
HEADERS = {"X-API-Key": "test-secret"}


def test_crawl_seeds_rejects_more_than_20_seeds(monkeypatch):
    monkeypatch.setenv("SYLVASEARCH_API_KEY", "test-secret")
    seeds = ",".join(f"https://example{i}.com" for i in range(21))

    response = client.get(
        "/crawl-seeds",
        params={"seeds": seeds},
        headers=HEADERS,
    )

    assert response.status_code == 400
    assert "20 seed URLs" in response.json()["detail"]


def test_crawl_queue_rejects_more_than_20_seeds(monkeypatch):
    monkeypatch.setenv("SYLVASEARCH_API_KEY", "test-secret")
    seeds = ",".join(f"https://example{i}.com" for i in range(21))

    response = client.post(
        "/crawl-queue",
        params={"seeds": seeds},
        headers=HEADERS,
    )

    assert response.status_code == 400
    assert "20 seed URLs" in response.json()["detail"]


def test_crawl_seeds_rejects_oversized_input(monkeypatch):
    monkeypatch.setenv("SYLVASEARCH_API_KEY", "test-secret")
    response = client.get(
        "/crawl-seeds",
        params={"seeds": "a" * 5001},
        headers=HEADERS,
    )

    assert response.status_code == 422
