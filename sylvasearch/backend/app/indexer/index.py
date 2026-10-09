import re
from collections import defaultdict


class InvertedIndex:
    def __init__(self):
        self.index = defaultdict(set)
        self.documents = {}
        # Incremented whenever a document is inserted or refreshed.
        self.document_generation = 0

    def tokenize(self, text):
        return re.findall(r"\b[a-zA-Z0-9]+\b", text.lower()) if text else []

    def add_document(self, document_id, document):
        # Remove old postings if an existing document is refreshed.
        previous = self.documents.get(document_id)
        if previous is not None:
            old_text = (
                previous.get("title", "") + " " + previous.get("text", "")
            )
            for word in set(self.tokenize(old_text)):
                postings = self.index.get(word)
                if postings is not None:
                    postings.discard(document_id)
                    if not postings:
                        del self.index[word]

        self.documents[document_id] = document
        text = document.get("title", "") + " " + document.get("text", "")
        for word in set(self.tokenize(text)):
            self.index[word].add(document_id)

        self.document_generation += 1

    def search(self, query):
        words = self.tokenize(query)
        if not words:
            return []

        matching_documents = None
        for word in words:
            documents = self.index.get(word, set())
            if matching_documents is None:
                matching_documents = documents.copy()
            else:
                matching_documents &= documents

        if not matching_documents:
            return []

        return [
            self.documents[doc_id]
            for doc_id in matching_documents
            if doc_id in self.documents
        ]
