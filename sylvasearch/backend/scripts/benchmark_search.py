import statistics
import time

from app.indexer.index import InvertedIndex
from app.search.engine import SearchEngine


def run_benchmark(size, repeats=3):
    index = InvertedIndex()

    for doc_id in range(1, size + 1):
        rare_term = "needleterm" if doc_id % 100 == 0 else "generalterm"
        index.add_document(
            doc_id,
            {
                "url": f"https://benchmark.invalid/{doc_id}",
                "title": f"Python search document {doc_id}",
                "text": (
                    f"python search engine indexing retrieval ranking "
                    f"document {doc_id} {rare_term} performance"
                ),
            },
        )

    engine = SearchEngine(index, {})
    engine.search("needleterm")  # Warm-up
    timings = []

    for _ in range(repeats):
        start = time.perf_counter()
        engine.search("needleterm")
        timings.append((time.perf_counter() - start) * 1000)

    print(
        f"{size:>6,} docs | selective query median: "
        f"{statistics.median(timings):.2f} ms"
    )


if __name__ == "__main__":
    print("Synthetic search benchmark (selective query; median of 3 runs)")
    run_benchmark(1_000)
    run_benchmark(10_000)
