import re
from collections import defaultdict


class InvertedIndex:

    def __init__(self):

        self.index = defaultdict(set)
        self.documents = {}

    def tokenize(self, text):

        words = re.findall(
            r"\b[a-zA-Z0-9]+\b",
            text.lower()
        )

        return words

    def add_document(
        self,
        document_id,
        document
    ):

        self.documents[document_id] = document

        text = (
            document["title"]
            + " "
            + document["text"]
        )

        words = self.tokenize(text)

        for word in words:

            self.index[word].add(
                document_id
            )

    def search(self, query):

        words = self.tokenize(query)

        if not words:
            return []

        matching_documents = None

        for word in words:

            documents = self.index.get(
                word,
                set()
            )

            if matching_documents is None:

                matching_documents = documents.copy()

            else:

                matching_documents &= documents

        if not matching_documents:
            return []

        return [
            self.documents[doc_id]
            for doc_id in matching_documents
        ]