import importlib.util
from pathlib import Path

MODULE_PATH = Path("scripts/evaluate_ranking.py")
spec = importlib.util.spec_from_file_location("evaluate_ranking", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_precision_at_k_counts_relevant_results():
    results = [{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]
    assert module.precision_at_k(results, {2, 4}, k=4) == 0.5


def test_precision_at_k_uses_k_as_denominator():
    results = [{"id": 1}, {"id": 2}]
    assert module.precision_at_k(results, {1}, k=10) == 0.1


def test_reciprocal_rank_rewards_first_relevant_result():
    results = [{"id": 1}, {"id": 2}, {"id": 3}]
    assert module.reciprocal_rank(results, {3}) == 1 / 3


def test_reciprocal_rank_returns_zero_when_none_relevant():
    assert module.reciprocal_rank([{"id": 1}], {9}) == 0.0
