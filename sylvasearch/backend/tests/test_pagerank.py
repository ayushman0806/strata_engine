import pytest

from app.search.pagerank import PageRank


def test_empty_graph_returns_empty_ranks():
    assert PageRank().calculate([]) == {}


def test_pagerank_sums_to_one_with_dangling_pages():
    links = [
        ("https://a.test/", "https://b.test/"),
        ("https://c.test/", "https://b.test/"),
    ]

    ranks = PageRank().calculate(links)

    assert set(ranks) == {
        "https://a.test/",
        "https://b.test/",
        "https://c.test/",
    }
    assert sum(ranks.values()) == pytest.approx(1.0)
    assert all(score >= 0 for score in ranks.values())


def test_linked_to_page_receives_rank():
    links = [
        ("A", "B"),
        ("C", "B"),
    ]

    ranks = PageRank().calculate(links)

    assert ranks["B"] > ranks["A"]
    assert ranks["B"] > ranks["C"]
