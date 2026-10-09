from app.indexer.index import InvertedIndex


def test_refreshing_document_removes_stale_term_postings():
    index = InvertedIndex()
    index.add_document(1, {
        "title": "Old Topic",
        "text": "obsolete keyword",
        "url": "https://example.test/",
    })

    index.add_document(1, {
        "title": "New Topic",
        "text": "current keyword",
        "url": "https://example.test/",
    })

    assert index.search("obsolete") == []
    results = index.search("current")
    assert len(results) == 1
    assert results[0]["title"] == "New Topic"


def test_refreshing_document_invalidates_search_statistics():
    index = InvertedIndex()
    index.add_document(1, {
        "title": "Short",
        "text": "alpha",
        "url": "https://example.test/1",
    })

    generation_before = index.document_generation

    index.add_document(1, {
        "title": "Long",
        "text": "alpha beta gamma delta epsilon",
        "url": "https://example.test/1",
    })

    assert index.document_generation > generation_before
    assert len(index.documents) == 1
