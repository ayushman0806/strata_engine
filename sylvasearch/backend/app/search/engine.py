
import math
import re
from collections import Counter


class SearchEngine:
    def __init__(self, index, page_ranks=None):
        self.index = index

        # BM25 parameters
        self.k1 = 1.5
        self.b = 0.75

        # PageRank data
        self.page_ranks = page_ranks or {}

        # Common English stop words
        self.stop_words = {
            "a", "an", "the", "is", "are", "was", "were",
            "of", "to", "in", "on", "for", "and", "or",
            "with", "by", "from", "as", "at", "be", "this",
            "that", "it", "its", "into", "about", "over",
            "under", "after", "before", "than", "then",
            "also", "can", "could", "would", "should",
            "will", "just", "not",
        }

    # ---------------------------------------------------------
    # TOKENIZATION
    # ---------------------------------------------------------

    def tokenize(self, text):
        if not text:
            return []

        words = re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())
        return [word for word in words if word not in self.stop_words]

    # ---------------------------------------------------------
    # IDF
    # ---------------------------------------------------------

    def calculate_idf(self, word):
        total_documents = len(self.index.documents)

        if total_documents == 0:
            return 0.0

        document_frequency = len(self.index.index.get(word, set()))

        if document_frequency == 0:
            return 0.0

        return math.log(
            1 + (
                total_documents - document_frequency + 0.5
            ) / (
                document_frequency + 0.5
            )
        )

    # ---------------------------------------------------------
    # AVERAGE DOCUMENT LENGTH AND TOKEN CACHE
    # ---------------------------------------------------------

    def _ensure_corpus_cache(self):
        generation = getattr(self.index, "document_generation", None)
        if (
            generation is not None
            and generation == getattr(self, "_cached_generation", None)
        ):
            return

        token_cache = {}
        length_cache = {}
        total_length = 0

        for document_id, document in self.index.documents.items():
            words = self.tokenize(document.get("text", ""))
            token_cache[document_id] = words
            length = len(words)
            length_cache[document_id] = length
            total_length += length

        self._document_tokens = token_cache
        self._document_lengths = length_cache
        count = len(self.index.documents)
        self._average_length = total_length / count if count else 0.0
        self._cached_generation = generation

    def calculate_average_length(self):
        self._ensure_corpus_cache()
        return self._average_length

    # ---------------------------------------------------------
    # BM25
    # ---------------------------------------------------------

    def bm25_score(
        self, document_id, query_words, average_length=None, idf_cache=None
    ):
        self._ensure_corpus_cache()
        words = self._document_tokens.get(document_id, [])

        if not words:
            return 0.0

        if average_length is None:
            average_length = self._average_length

        if average_length <= 0:
            return 0.0

        word_counts = Counter(words)
        document_length = self._document_lengths.get(document_id, len(words))
        score = 0.0

        for word in query_words:
            term_frequency = word_counts[word]
            if term_frequency == 0:
                continue

            if idf_cache is not None and word in idf_cache:
                idf = idf_cache[word]
            else:
                idf = self.calculate_idf(word)

            numerator = term_frequency * (self.k1 + 1)
            denominator = term_frequency + self.k1 * (
                1 - self.b + self.b * (document_length / average_length)
            )
            score += idf * numerator / denominator

        return score

    # SCORE TRANSFORMATIONS
    # ---------------------------------------------------------

    def normalize_bm25(self, score):
        """
        Map non-negative BM25 scores to [0, 1].
        Higher scores approach 1 without depending on
        the other documents in the current result set.
        """
        score = max(0.0, score)
        return score / (score + 2.0)

    def normalize_pagerank(self, score):
        """
        Smoothly scale PageRank values for the combined score.
        The reference scale is fixed rather than calculated
        from the current search candidates.
        """
        score = max(0.0, score)
        reference = 0.0001
        return score / (score + reference)

    # ---------------------------------------------------------
    # TITLE SCORE
    # ---------------------------------------------------------

    def title_score(self, document, query_words):
        title_words = self.tokenize(document.get("title", ""))

        if not title_words or not query_words:
            return 0.0

        matches = sum(
            1 for word in query_words if word in title_words
        )

        return matches / len(query_words)

    # ---------------------------------------------------------
    # PHRASE SCORE
    # ---------------------------------------------------------

    def phrase_score(self, document, query):
        if not query or not query.strip():
            return 0.0

        def normalize_phrase(text):
            words = re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())
            return " ".join(words)

        # Normalize whitespace and case for phrase comparison.
        normalized_query = normalize_phrase(query)

        if  not normalized_query:
            return 0.0

        title = normalize_phrase(document.get("title", ""))
        text = normalize_phrase(document.get("text", ""))

        if f" {normalized_query} " in f" {title} ":
            return 1.0

        if f" {normalized_query} " in f" {text} ":
            return 0.7

        return 0.0

    # ---------------------------------------------------------
    # CANDIDATE RETRIEVAL
    # ---------------------------------------------------------

    def get_candidate_documents(self, query_words):
        if not query_words:
            return set()

        unique_words = list(dict.fromkeys(query_words))
        matching_documents = None

        # First, find documents containing every query term.
        for word in unique_words:
            documents = self.index.index.get(word, set())

            if matching_documents is None:
                matching_documents = set(documents)
            else:
                matching_documents &= documents

        if matching_documents:
            return matching_documents

        # If AND search finds nothing, use OR search.
        candidate_documents  = set()

        for word in unique_words:
            candidate_documents.update(self.index.index.get(word, set()))

        return candidate_documents

    # ---------------------------------------------------------
    # SNIPPET GENERATION
    # ---------------------------------------------------------

    def generate_snippet(self, document, query_words):
        text = document.get("text", "").strip()

        if not text:
            return ""

        if not query_words:
            return text[:300]

        lower_text = text.lower()
        positions = []

        for word in query_words:
            position = lower_text.find(word)

            if position != -1:
                positions.append(position)

        if not positions:
            return text[:300]

        position = min(positions)
        start = max(0, position - 120)
        end = min(len(text), position + 220)

        snippet = text[start:end].strip()

        if start > 0:
            snippet = "..." + snippet

        if end < len(text):
            snippet += "..."

        return snippet

    # ---------------------------------------------------------
    # MAIN SEARCH
    # ---------------------------------------------------------

    def search(self, query):
        if not query or not query.strip():
            return []

        query = query.strip()
        query_words = list(dict.fromkeys(self.tokenize(query)))
        if not query_words:
            return []

        candidate_documents = self.get_candidate_documents(query_words)
        if not candidate_documents:
            return []

        self._ensure_corpus_cache()
        average_length = self._average_length
        idf_cache = {
            word: self.calculate_idf(word)
            for word in query_words
        }

        results = []
        for document_id in candidate_documents:
            document = self.index.documents.get(document_id)
            if document is None:
                continue

            bm25 = self.bm25_score(
                document_id, query_words, average_length, idf_cache
            )
            title = self.title_score(document, query_words)
            phrase = self.phrase_score(document, query)
            pagerank = max(
                0.0, self.page_ranks.get(document.get("url", ""), 0.0)
            )

            bm25_normalized = self.normalize_bm25(bm25)
            pagerank_normalized = self.normalize_pagerank(pagerank)
            final_score = (
                0.55 * bm25_normalized
                + 0.25 * title
                + 0.15 * phrase
                + 0.05 * pagerank_normalized
            )

            snippet = self.generate_snippet(document, query_words)
            results.append({
                "id": document_id,
                "title": document.get("title", ""),
                "url": document.get("url", ""),
                "score": round(final_score, 4),
                "bm25": round(bm25, 4),
                "bm25_normalized": round(bm25_normalized, 4),
                "title_score": round(title, 4),
                "phrase_score": round(phrase, 4),
                "pagerank": round(pagerank, 6),
                "pagerank_normalized": round(pagerank_normalized, 4),
                "text": snippet,
            })

        results.sort(key=lambda result: result["score"], reverse=True)
        return results
