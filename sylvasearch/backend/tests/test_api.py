
import os

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)
TEST_API_KEY = "test-secret"
os.environ["SYLVASEARCH_API_KEY"] = TEST_API_KEY
AUTH_HEADERS = {"X-API-Key": TEST_API_KEY}


def test_health_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == "SylvaSearch is running!"


def test_debug_index_endpoint():
    response = client.get("/debug/index", headers=AUTH_HEADERS)

    assert response.status_code == 200

    data = response.json()

    assert "total_documents" in data
    assert "total_terms" in data


def test_debug_corpus_endpoint():
    response = client.get("/debug/corpus", headers=AUTH_HEADERS)

    assert response.status_code == 200

    data = response.json()

    assert "total_documents" in data


def test_search_endpoint_returns_valid_response():
    response = client.get("/search", params={"q": "python"})

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, dict)
    assert "results" in data


def test_search_endpoint_rejects_empty_query():
    response = client.get("/search", params={"q": ""})

    assert response.status_code == 422


def test_search_endpoint_rejects_oversized_query():
    response = client.get("/search", params={"q": "a" * 301})

    assert response.status_code == 422
