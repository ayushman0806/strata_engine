import time

from collections import deque

from urllib.parse import urljoin, urlparse, urldefrag

from urllib.robotparser import RobotFileParser

import requests

from bs4 import BeautifulSoup

class Crawler:

    """A polite, domain-restricted breadth-first web crawler."""

    def __init__(

        self,

        max_pages=20,

        allowed_domain=None,

        max_depth=2,

        delay=1.0,

    ):

        self.max_pages = max(1, int(max_pages))

        self.allowed_domain = (

            allowed_domain.lower().strip()

            if allowed_domain

            else None

        )

        self.max_depth = max(0, int(max_depth))

        self.delay = max(0.0, float(delay))

        self.visited = set()

        self.queue = deque()

        self.robot_parsers = {}

        self.session = requests.Session()

        self.session.headers.update(

            {

                "User-Agent": "SylvaSearchBot/0.1",

                "Accept": "text/html,application/xhtml+xml",

            }

        )

    # ---------------------------------------------------------

    # URL NORMALIZATION

    # ---------------------------------------------------------

    def normalize_url(self, url):

        """Normalize HTTP(S) URLs and remove fragments."""

        if not url:

            return None

        try:

            url = urldefrag(url.strip())[0]

            parsed = urlparse(url)

            if parsed.scheme.lower() not in ("http", "https"):

                return None

            if not parsed.hostname:

                return None

            scheme = parsed.scheme.lower()

            hostname = parsed.hostname.lower()

            # Preserve a non-default port, if present.

            try:

                port = parsed.port

            except ValueError:

                return None

            if port and not (

                (scheme == "http" and port == 80)

                or (scheme == "https" and port == 443)

            ):

                netloc = f"{hostname}:{port}"

            else:

                netloc = hostname

            path = parsed.path or "/"

            # Keep the root slash, remove other trailing slashes.

            if path != "/":

                path = path.rstrip("/") or "/"

            normalized = f"{scheme}://{netloc}{path}"

            # Query parameters may distinguish different pages, so keep them.

            if parsed.query:

                normalized += f"?{parsed.query}"

            return normalized

        except (TypeError, ValueError, AttributeError):

            return None

    # ---------------------------------------------------------

    # DOMAIN RESTRICTION

    # ---------------------------------------------------------

    def is_allowed_domain(self, url):

        """Keep the crawl on the configured host."""

        if not self.allowed_domain:

            return True

        try:

            parsed = urlparse(url)

            host = (parsed.hostname or "").lower()

            allowed = self.allowed_domain.lower()

            # Accept a hostname or host:port as allowed_domain.

            if "://" in allowed:

                allowed = (urlparse(allowed).hostname or "").lower()

            else:

                allowed = allowed.split(":", 1)[0]

            return host == allowed

        except (TypeError, ValueError, AttributeError):

            return False

    # ---------------------------------------------------------

    # ROBOTS.TXT

    # ---------------------------------------------------------

    def get_robot_parser(self, url):

        """Fetch and cache robots.txt for each origin."""

        try:

            parsed = urlparse(url)

            origin = f"{parsed.scheme}://{parsed.netloc}"

        except (TypeError, ValueError, AttributeError):

            return None

        if origin in self.robot_parsers:

            return self.robot_parsers[origin]

        robots_url = f"{origin}/robots.txt"

        parser = RobotFileParser()

        parser.set_url(robots_url)

        try:

            # Use our configured session/User-Agent to fetch robots.txt.

            response = self.session.get(robots_url, timeout=10)

            response.raise_for_status()

            parser.parse(response.text.splitlines())

            self.robot_parsers[origin] = parser

            return parser

        except requests.RequestException as error:

            # If robots.txt cannot be retrieved, log the issue and continue

            # using the crawler's fallback policy. Do not bypass a rule that

            # was successfully retrieved and parsed.

            print(f"Could not retrieve robots.txt: {robots_url} ({error})")

            self.robot_parsers[origin] = None

            return None

    def allowed_by_robots(self, url):

        """Return whether the configured crawler identity may fetch a URL."""

        parser = self.get_robot_parser(url)

        # Retrieval failures are handled as unavailable robots.txt.

        if parser is None:

            return True

        try:

            return parser.can_fetch("SylvaSearchBot", url)

        except Exception as error:

            print(f"Could not evaluate robots.txt for {url}: {error}")

            # Fail closed if a retrieved policy cannot be evaluated.

            return False

    # ---------------------------------------------------------

    # LINK EXTRACTION

    # ---------------------------------------------------------

    def extract_links(self, soup, current_url):

        """Extract normalized, same-domain HTTP(S) links."""

        links = set()

        try:

            anchors = soup.find_all("a", href=True)

        except Exception:

            return links

        for anchor in anchors:

            try:

                href = (anchor.get("href") or "").strip()

                if not href:

                    continue

                lowered_href = href.lower()

                if lowered_href.startswith(

                    ("#", "javascript:", "mailto:", "tel:", "data:")

                ):

                    continue

                absolute_url = urljoin(current_url, href)

                normalized_url = self.normalize_url(absolute_url)

                if not normalized_url:

                    continue

                if not self.is_allowed_domain(normalized_url):

                    continue

                links.add(normalized_url)

            except Exception:

                continue

        return links

    # ---------------------------------------------------------

    # CONTENT EXTRACTION

    # ---------------------------------------------------------

    def extract_content(self, soup):

        """Extract unique headings, paragraphs, and list items."""

        unwanted_tags = [

            "script",

            "style",

            "noscript",

            "svg",

            "canvas",

            "iframe",

            "form",

            "nav",

            "footer",

            "header",

            "aside",

        ]

        for tag_name in unwanted_tags:

            for tag in list(soup.find_all(tag_name)):

                try:

                    tag.decompose()

                except Exception:

                    pass

        content_blocks = []

        tags_to_collect = ["h1", "h2", "h3", "h4", "p", "li"]

        try:

            elements = soup.find_all(tags_to_collect)

        except Exception:

            elements = []

        seen = set()

        for element in elements:

            try:

                text = element.get_text(" ", strip=True)

            except Exception:

                continue

            text = " ".join(text.split())

            # Skip very short fragments and unusually large blocks.

            if len(text) < 20 or len(text) > 3000:

                continue

            normalized = text.casefold()

            if normalized in seen:

                continue

            seen.add(normalized)

            content_blocks.append(text)

        return " ".join(content_blocks).strip()

    # ---------------------------------------------------------

    # CRAWL

    # ---------------------------------------------------------

    def crawl(self, start_url):

        """

        Crawl a website using breadth-first search.

        Returns a dictionary containing:

          documents: list of {url, title, text, links}

          blocked_by_robots: number of URLs denied by robots.txt

          request_errors: number of page download failures

        """

        start_url = self.normalize_url(start_url)

        if not start_url:

            print("Invalid start URL.")

            return {

                "documents": [],

                "blocked_by_robots": 0,

                "request_errors": 0,
                "errors": [],
            }

        self.queue = deque([(start_url, 0)])

        self.visited = set()

        documents = []

        blocked_by_robots = 0

        request_errors = 0
        errors = []

        while self.queue and len(documents) < self.max_pages:

            url, depth = self.queue.popleft()

            if url in self.visited:

                continue

            if not self.is_allowed_domain(url):

                continue

            if depth > self.max_depth:

                continue

            # Mark before checking/downloading to avoid repeated attempts.

            self.visited.add(url)

            if not self.allowed_by_robots(url):

                print(f"Blocked by robots.txt: {url}")

                blocked_by_robots += 1

                continue

            print(f"Crawling: {url}")

            try:

                response = self.session.get(url, timeout=15)

                response.raise_for_status()

            except requests.RequestException as error:

                response_obj = getattr(error, "response", None)
                status_code = getattr(response_obj, "status_code", None)
                retryable = (
                    status_code is None
                    or status_code in (408, 425, 429)
                    or status_code >= 500
                )
                errors.append({
                    "url": url,
                    "status_code": status_code,
                    "retryable": retryable,
                    "error": str(error),
                })
                print(f"Request failed: {url}")
                print(error)
                request_errors += 1
                continue

            except Exception as error:

                errors.append({
                    "url": url,
                    "status_code": None,
                    "retryable": True,
                    "error": str(error),
                })
                print(f"Unexpected request error: {url}")
                print(error)
                request_errors += 1
                continue

            content_type = response.headers.get("Content-Type", "").lower()

            if "text/html" not in content_type:

                print(f"Skipping non-HTML: {url}")

                continue

            try:

                soup = BeautifulSoup(response.text, "lxml")

            except Exception:

                soup = BeautifulSoup(response.text, "html.parser")

            try:

                title_tag = soup.find("title")

                title = title_tag.get_text(" ", strip=True) if title_tag else ""

            except Exception:

                title = ""

            # Extract links before content cleaning removes navigation.

            page_links = self.extract_links(soup, url)

            print(f"Found {len(page_links)} links")

            text = self.extract_content(soup)

            if not text:

                print(f"Skipping empty page: {url}")

                continue

            documents.append(

                {

                    "url": url,

                    "title": title,

                    "text": text,

                    "links": sorted(page_links),

                }

            )

            if depth < self.max_depth:

                for link in sorted(page_links):

                    if link not in self.visited:

                        self.queue.append((link, depth + 1))

            if self.delay > 0 and self.queue and len(documents) < self.max_pages:

                time.sleep(self.delay)

        print(

            "Crawl complete. "

            f"Pages crawled: {len(documents)}, "

            f"Blocked by robots: {blocked_by_robots}, "

            f"Request errors: {request_errors}"

        )

        return {

            "documents": documents,

            "blocked_by_robots": blocked_by_robots,

            "request_errors": request_errors,
            "errors": errors,

        }

    def close(self):

        """Close the underlying HTTP session."""

        self.session.close()
