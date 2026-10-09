
from app.indexer.index import InvertedIndex
from app.search.engine import SearchEngine


def test_tokenize_lowercases_text():
    index = InvertedIndex()

    tokens = index.tokenize("Python MACHINE Learning")

    assert "python" in tokens
    assert "machine" in tokens
    assert "learning" in tokens


def test_tokenize_handles_empty_text():
    index = InvertedIndex()

    tokens = index.tokenize("")

    assert tokens == []


def test_add_document_and_search():
    index = InvertedIndex()

    index.add_document(
        1,
        {
            "title": "Python Machine Learning",
            "url": "https://example.com/python",
            "text": "Python is useful for machine learning projects.",
        },
    )

    results = index.search("python")

    assert results
    assert any(
        "python" in str(result).lower()
        for result in results
    )


def test_search_engine_initializes():
    index = InvertedIndex()

    engine = SearchEngine(index)

    assert engine is not None
    assert callable(engine.search)


def test_search_engine_returns_results_for_indexed_document():
    index = InvertedIndex()

    index.add_document(
        1,
        {
            "title": "Python Programming",
            "url": "https://example.com/python",
            "text": "Python programming is useful for developers.",
        },
    )

    engine = SearchEngine(index)

    results = engine.search("python")

    assert results


def test_search_ranks_relevant_title_first():
    index = InvertedIndex()

    index.add_document(
        1,
        {
            "title": "Machine Learning with Python",
            "url": "https://example.com/machine-learning",
            "text": "A detailed guide to machine learning using Python.",
        },
    )

    index.add_document(
        2,
        {
            "title": "Gardening Tips",
            "url": "https://example.com/gardening",
            "text": "Learn about plants, soil, and gardening.",
        },
    )

    engine = SearchEngine(index)
    results = engine.search("machine learning")

    assert results, "Search should return relevant results"
    assert "machine-learning" in results[0]["url"]
