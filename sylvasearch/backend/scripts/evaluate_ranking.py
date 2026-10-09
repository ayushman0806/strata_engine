"""Evaluate search ranking against manually labeled relevant document IDs."""
import argparse
import json
from pathlib import Path
from statistics import mean


def precision_at_k(results, relevant_ids, k=10):
    top = results[:k]
    if not top:
        return 0.0
    return sum(item["id"] in relevant_ids for item in top) / k


def reciprocal_rank(results, relevant_ids):
    for rank, item in enumerate(results, start=1):
        if item["id"] in relevant_ids:
            return 1.0 / rank
    return 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--labels",
        default="data/ranking_eval.json",
        help="JSON list of {query, relevant_ids} records",
    )
    args = parser.parse_args()

    labels_path = Path(args.labels)
    if not labels_path.exists():
        print(f"No evaluation labels found at {labels_path}.")
        print("Create a JSON list of query/relevant_ids records first.")
        print('Example: [{"query":"python","relevant_ids":[1,4]}]')
        return

    import sys

    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from app.main import search

    cases = json.loads(labels_path.read_text(encoding="utf-8-sig"))
    precisions, reciprocal_ranks = [], []

    for case in cases:
        response = search(q=case["query"])
        results = response.get("results", [])
        relevant = set(case["relevant_ids"])
        p10 = precision_at_k(results, relevant, 10)
        rr = reciprocal_rank(results, relevant)
        precisions.append(p10)
        reciprocal_ranks.append(rr)
        print(
            f"{case['query']!r}: P@10={p10:.3f}, "
            f"RR={rr:.3f}, returned={len(results)}"
        )

    if cases:
        print(f"Mean P@10: {mean(precisions):.3f}")
        print(f"Mean reciprocal rank: {mean(reciprocal_ranks):.3f}")


if __name__ == "__main__":
    main()

