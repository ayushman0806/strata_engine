from collections import defaultdict


class PageRank:
    def __init__(self, damping=0.85, iterations=20):
        if not 0 <= damping < 1:
            raise ValueError("damping must be in the range [0, 1)")
        if iterations < 1:
            raise ValueError("iterations must be at least 1")

        self.damping = damping
        self.iterations = iterations

    def calculate(self, links):
        if not links:
            return {}

        graph = defaultdict(set)
        pages = set()

        for source, target in links:
            graph[source].add(target)
            pages.add(source)
            pages.add(target)

        total_pages = len(pages)
        if not total_pages:
            return {}

        rank = {page: 1.0 / total_pages for page in pages}
        base_rank = (1.0 - self.damping) / total_pages

        for _ in range(self.iterations):
            dangling_rank = sum(
                rank[page] for page in pages if not graph.get(page)
            )
            redistributed = (
                base_rank
                + self.damping * dangling_rank / total_pages
            )
            new_rank = {page: redistributed for page in pages}

            for source in pages:
                targets = graph.get(source)
                if not targets:
                    continue

                contribution = (
                    self.damping * rank[source] / len(targets)
                )
                for target in targets:
                    new_rank[target] += contribution

            rank = new_rank

        # Correct tiny floating-point drift so scores sum to one.
        total_rank = sum(rank.values())
        if total_rank:
            rank = {
                page: score / total_rank
                for page, score in rank.items()
            }

        return rank
