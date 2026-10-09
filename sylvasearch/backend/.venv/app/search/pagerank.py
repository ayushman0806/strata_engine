from collections import defaultdict


class PageRank:

    def __init__(self, damping=0.85, iterations=20):

        self.damping = damping
        self.iterations = iterations

    def calculate(self, links):

        if not links:
            return {}

        # --------------------------------
        # Build graph
        # --------------------------------

        graph = defaultdict(set)
        pages = set()

        for source, target in links:

            graph[source].add(target)

            pages.add(source)
            pages.add(target)

        total_pages = len(pages)

        if total_pages == 0:
            return {}

        # --------------------------------
        # Initial PageRank
        # --------------------------------

        rank = {
            page: 1 / total_pages
            for page in pages
        }

        # --------------------------------
        # PageRank iterations
        # --------------------------------

        for _ in range(self.iterations):

            new_rank = {
                page: (1 - self.damping) / total_pages
                for page in pages
            }

            for page in pages:

                outgoing_links = graph.get(page, set())

                if not outgoing_links:
                    continue

                contribution = (
                    self.damping
                    * rank[page]
                    / len(outgoing_links)
                )

                for target in outgoing_links:

                    new_rank[target] += contribution

            rank = new_rank

        return rank