import time

import xml.etree.ElementTree as ET

from urllib.parse import urlparse, urldefrag

import requests

from fastapi import FastAPI, HTTPException, Query

from app.crawler.crawler import Crawler

from app.database import (

    get_all_documents,

    get_connection,

    initialize_database,

    enqueue_url,

    claim_next_url,

    mark_url_crawled,

    mark_url_failed,

    mark_url_permanently_failed,

    get_frontier_stats,

)

from app.indexer.index import InvertedIndex

from app.search.engine import SearchEngine

from app.search.pagerank import PageRank

app = FastAPI(

    title="SylvaSearch",

    description="My own search engine",

    version="0.3.0",

)

initialize_database()

# Recover jobs interrupted by an application restart.

connection = get_connection()

try:

    connection.execute("""

        UPDATE crawl_frontier

        SET status = 'pending',

            updated_at = CURRENT_TIMESTAMP

        WHERE status = 'processing'

    """)

    connection.commit()

finally:

    connection.close()

index = InvertedIndex()

pagerank = PageRank()

search_engine = SearchEngine(index, {})

def load_page_ranks():

    """Calculate PageRank from links persisted in SQLite."""

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute("SELECT source_url, target_url FROM links")

        rows = cursor.fetchall()

    finally:

        connection.close()

    links = [(row["source_url"], row["target_url"]) for row in rows]

    return pagerank.calculate(links)

def load_index():

    """Rebuild the in-memory index from persisted documents."""

    index.documents.clear()

    index.index.clear()

    for document in get_all_documents():

        index.add_document(

            document["id"],

            {

                "url": document["url"],

                "title": document["title"] or "",

                "text": document["content"] or "",

            },

        )

def rebuild_search_state():

    """Refresh the index and PageRank after data is persisted."""

    load_index()

    search_engine.page_ranks = load_page_ranks()

def validate_http_url(url: str) -> str:

    """Validate a seed URL and return its netloc."""

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https") or not parsed.hostname:

        raise HTTPException(

            status_code=400,

            detail=f"Invalid URL: {url}. Use an http:// or https:// URL.",

        )

    return parsed.netloc

def save_crawled_documents(documents):

    """Persist documents and their outgoing links to SQLite."""

    connection = get_connection()

    new_documents = 0

    new_links = 0

    try:

        cursor = connection.cursor()

        for document in documents:

            cursor.execute(

                """

                INSERT OR IGNORE INTO documents (url, title, content)

                VALUES (?, ?, ?)

                """,

                (

                    document["url"],

                    document.get("title", ""),

                    document.get("text", ""),

                ),

            )

            if cursor.rowcount > 0:

                new_documents += 1

            for target_url in document.get("links", []):

                cursor.execute(

                    """

                    INSERT OR IGNORE INTO links (source_url, target_url)

                    VALUES (?, ?)

                    """,

                    (document["url"], target_url),

                )

                if cursor.rowcount > 0:

                    new_links += 1

        connection.commit()

    except Exception:

        connection.rollback()

        raise

    finally:

        connection.close()

    return new_documents, new_links

def discover_sitemap_urls(seed_url, allowed_domain, max_sitemaps=5, max_urls=1000):

    """Discover same-host URLs from robots.txt and XML sitemaps."""

    parsed_seed = urlparse(seed_url)

    origin = f"{parsed_seed.scheme}://{parsed_seed.netloc}"

    headers = {"User-Agent": "SylvaSearchBot/0.1"}

    sitemap_queue = [

        f"{origin}/sitemap.xml",

        f"{origin}/sitemap_index.xml",

    ]

    try:

        response = requests.get(

            f"{origin}/robots.txt",

            headers=headers,

            timeout=5,

        )

        if response.ok:

            for line in response.text.splitlines():

                if line.lower().startswith("sitemap:"):

                    sitemap_url = line.split(":", 1)[1].strip()

                    if sitemap_url:

                        sitemap_queue.insert(0, sitemap_url)

    except requests.RequestException:

        pass

    allowed_host = (

        urlparse("https://" + allowed_domain).hostname or allowed_domain

    ).lower()

    discovered = set()

    visited_sitemaps = set()

    sitemap_count = 0

    while sitemap_queue and sitemap_count < max_sitemaps and len(discovered) < max_urls:

        sitemap_url = sitemap_queue.pop(0)

        if sitemap_url in visited_sitemaps:

            continue

        visited_sitemaps.add(sitemap_url)

        sitemap_count += 1

        try:

            response = requests.get(

                sitemap_url,

                headers=headers,

                timeout=10,

            )

            response.raise_for_status()

            root = ET.fromstring(response.content)

        except (requests.RequestException, ET.ParseError, ValueError):

            continue

        root_type = root.tag.rsplit("}", 1)[-1].lower()

        for element in root:

            loc = next(

                (

                    child.text.strip()

                    for child in element

                    if child.tag.rsplit("}", 1)[-1].lower() == "loc"

                    and child.text

                    and child.text.strip()

                ),

                None,

            )

            if not loc:

                continue

            if root_type == "sitemapindex":

                sitemap_queue.append(loc)

                continue

            if root_type != "urlset":

                continue

            candidate = urldefrag(loc)[0]

            candidate_host = (urlparse(candidate).hostname or "").lower()

            if (

                urlparse(candidate).scheme in ("http", "https")

                and candidate_host == allowed_host

            ):

                discovered.add(candidate)

            if len(discovered) >= max_urls:

                break

    return sorted(discovered)

# Restore the persistent corpus whenever the application starts.

rebuild_search_state()

@app.get("/")

def home():

    return {

        "message": "SylvaSearch is running!",

        "indexed_documents": len(index.documents),

    }

@app.get("/crawl")

def crawl(url: str):

    """Crawl one domain, save its pages, and refresh the search index."""

    domain = validate_http_url(url)

    crawler = Crawler(

        max_pages=50,

        allowed_domain=domain,

        max_depth=2,

        delay=1.0,

    )

    try:

        crawl_result = crawler.crawl(url)

    finally:

        crawler.close()

    documents = crawl_result.get("documents", [])

    new_documents, new_links = save_crawled_documents(documents)

    rebuild_search_state()

    return {

        "seed": url,

        "pages_crawled": len(documents),

        "new_documents": new_documents,

        "new_links": new_links,

        "links_found": sum(len(doc.get("links", [])) for doc in documents),

        "blocked_by_robots": crawl_result.get("blocked_by_robots", 0),

        "request_errors": crawl_result.get("request_errors", 0),

        "total_indexed_documents": len(index.documents),

    }

@app.get("/crawl-seeds")

def crawl_seeds(

    seeds: str,

    max_pages: int = Query(default=100, ge=1, le=500),

):

    """

    Crawl multiple domains and persist the collected pages.

    max_pages applies per seed/domain, not to the combined crawl.

    """

    seed_urls = [seed.strip() for seed in seeds.split(",") if seed.strip()]

    if not seed_urls:

        raise HTTPException(

            status_code=400,

            detail="At least one seed URL is required.",

        )

    validated_seeds = [

        (seed_url, validate_http_url(seed_url))

        for seed_url in seed_urls

    ]

    all_documents = []

    seen_urls = set()

    blocked_by_robots = 0

    request_errors = 0

    for seed_url, domain in validated_seeds:

        print(f"Starting seed: {seed_url}")

        crawler = Crawler(

            max_pages=max_pages,

            allowed_domain=domain,

            max_depth=2,

            delay=1.0,

        )

        try:

            crawl_result = crawler.crawl(seed_url)

        finally:

            crawler.close()

        blocked_by_robots += crawl_result.get("blocked_by_robots", 0)

        request_errors += crawl_result.get("request_errors", 0)

        for document in crawl_result.get("documents", []):

            document_url = document.get("url")

            if not document_url or document_url in seen_urls:

                continue

            seen_urls.add(document_url)

            all_documents.append(document)

    # This work must happen before returning the response.

    new_documents, new_links = save_crawled_documents(all_documents)

    rebuild_search_state()

    return {

        "seeds": [seed_url for seed_url, _ in validated_seeds],

        "pages_crawled": len(all_documents),

        "new_documents": new_documents,

        "new_links": new_links,

        "links_found": sum(

            len(document.get("links", [])) for document in all_documents

        ),

        "blocked_by_robots": blocked_by_robots,

        "request_errors": request_errors,

        "total_indexed_documents": len(index.documents),

    }

@app.get("/frontier/stats")

def frontier_stats():

    """Show persistent crawl queue counts."""

    return get_frontier_stats()

@app.post("/crawl-queue")

def crawl_queue(

    seeds: str,

    max_pages: int = Query(default=10, ge=1, le=100),

    max_depth: int = Query(default=2, ge=0, le=5),

    delay: float = Query(default=1.0, ge=0, le=5),

):

    """

    Enqueue seed URLs and process a bounded number of queued pages.

    Discovered URLs remain in SQLite for future batches.

    """

    seed_urls = [item.strip() for item in seeds.split(",") if item.strip()]

    if not seed_urls:

        raise HTTPException(status_code=400, detail="Provide at least one seed URL.")

    normalized_seeds = []

    for seed in seed_urls:

        validate_http_url(seed)

        domain = validate_http_url(seed)

        normalizer = Crawler(

            max_pages=1,

            allowed_domain=domain,

            max_depth=0,

            delay=0,

        )

        try:

            normalized = normalizer.normalize_url(seed)

        finally:

            normalizer.close()

        if not normalized:

            raise HTTPException(status_code=400, detail=f"Invalid seed URL: {seed}")

        normalized_seeds.append((normalized, domain))

    added_seeds = 0

    added_sitemap_urls = 0

    for seed_url, domain in normalized_seeds:

        if enqueue_url(seed_url, depth=0, priority=100):

            added_seeds += 1

        for sitemap_url in discover_sitemap_urls(seed_url, domain):

            normalizer = Crawler(

                max_pages=1,

                allowed_domain=domain,

                max_depth=0,

                delay=0,

            )

            try:

                normalized_sitemap_url = normalizer.normalize_url(sitemap_url)

            finally:

                normalizer.close()

            if normalized_sitemap_url and enqueue_url(

                normalized_sitemap_url,

                source_url=seed_url,

                depth=1,

                priority=20,

            ):

                added_sitemap_urls += 1

    pages_processed = 0

    new_documents = 0

    new_links = 0

    blocked_by_robots = 0

    request_errors = 0

    while pages_processed < max_pages:

        job = claim_next_url(max_attempts=3)

        if job is None:

            break

        url = job["url"]

        depth = job["depth"]

        domain = validate_http_url(url)

        crawler = Crawler(

            max_pages=1,

            allowed_domain=domain,

            max_depth=0,

            delay=0,

        )

        try:

            result = crawler.crawl(url)

        except Exception as error:

            mark_url_failed(url, str(error), max_attempts=3)

            pages_processed += 1

            continue

        finally:

            crawler.close()

        blocked_by_robots += result.get("blocked_by_robots", 0)

        request_errors += result.get("request_errors", 0)

        documents = result.get("documents", [])

        if not documents:

            failure = next(
                (
                    item
                    for item in result.get("errors", [])
                    if item.get("url") == url
                ),
                None,
            )

            if failure and not failure.get("retryable", True):
                mark_url_permanently_failed(
                    url,
                    failure.get("error", "Permanent HTTP error"),
                )
            else:
                mark_url_failed(
                    url,
                    (
                        failure.get("error", "Crawl produced no indexable page")
                        if failure
                        else "No indexable page fetched; possibly blocked, non-HTML, or empty"
                    ),
                    max_attempts=3,
                    retry_delay_seconds=60,
                )

            pages_processed += 1

            if delay:
                time.sleep(delay)

            continue

        try:

            added_docs, added_links = save_crawled_documents(documents)

            new_documents += added_docs

            new_links += added_links

            if depth < max_depth:

                for document in documents:

                    for link in document.get("links", []):

                        enqueue_url(

                            link,

                            source_url=document["url"],

                            depth=depth + 1,

                            priority=10,

                        )

            mark_url_crawled(url)

        except Exception as error:

            mark_url_failed(url, str(error), max_attempts=3)

            pages_processed += 1

            continue

        pages_processed += 1

        if delay and pages_processed < max_pages:

            time.sleep(delay)

    rebuild_search_state()

    return {

        "seeds_added": added_seeds,

        "sitemap_urls_added": added_sitemap_urls,

        "pages_processed": pages_processed,

        "new_documents": new_documents,

        "new_links": new_links,

        "blocked_by_robots": blocked_by_robots,

        "request_errors": request_errors,

        "indexed_documents": len(index.documents),

        "frontier": get_frontier_stats(),

    }

@app.get("/search")

def search(q: str = Query(min_length=1, max_length=300)):

    if not q.strip():

        raise HTTPException(

            status_code=400,

            detail="Search query cannot be empty.",

        )

    results = search_engine.search(q)

    return {"query": q, "total_results": len(results), "results": results}

@app.get("/pagerank")

def calculate_pagerank():

    ranks = load_page_ranks()

    sorted_ranks = sorted(ranks.items(), key=lambda item: item[1], reverse=True)

    return {

        "total_pages": len(ranks),

        "pages": [

            {"url": url, "pagerank": round(score, 8)}

            for url, score in sorted_ranks[:20]

        ],

    }

@app.get("/graph")

def graph():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(

            "SELECT source_url, target_url FROM links LIMIT 100"

        )

        rows = cursor.fetchall()

    finally:

        connection.close()

    return {

        "total_links": len(rows),

        "links": [

            {"source": row["source_url"], "target": row["target_url"]}

            for row in rows

        ],

    }

@app.get("/debug/index")

def debug_index():

    return {

        "total_documents": len(index.documents),

        "total_terms": len(index.index),

        "has_artificial": "artificial" in index.index,

        "artificial_documents": len(index.index.get("artificial", set())),

        "has_intelligence": "intelligence" in index.index,

        "intelligence_documents": len(index.index.get("intelligence", set())),

        "has_machine": "machine" in index.index,

        "machine_documents": len(index.index.get("machine", set())),

        "has_learning": "learning" in index.index,

        "learning_documents": len(index.index.get("learning", set())),

    }

@app.get("/debug/document")

def debug_document(url: str):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(

            """

            SELECT id, url, title, content

            FROM documents

            WHERE url = ?

            """,

            (url,),

        )

        row = cursor.fetchone()

    finally:

        connection.close()

    if row is None:

        return {"found": False, "message": "Document not found"}

    content = row["content"] or ""

    return {

        "found": True,

        "id": row["id"],

        "url": row["url"],

        "title": row["title"],

        "content_length": len(content),

        "content_preview": content[:5000],

    }

@app.get("/debug/documents")

def debug_documents():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute("SELECT id, url, title FROM documents ORDER BY id")

        rows = cursor.fetchall()

    finally:

        connection.close()

    return {

        "total": len(rows),

        "documents": [

            {"id": row["id"], "url": row["url"], "title": row["title"]}

            for row in rows

        ],

    }

@app.get("/debug/term")

def debug_term(term: str = Query(min_length=1, max_length=200)):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(

            """

            SELECT id, url, title, content

            FROM documents

            WHERE LOWER(content) LIKE ?

            LIMIT 10

            """,

            (f"%{term.lower()}%",),

        )

        rows = cursor.fetchall()

    finally:

        connection.close()

    return {

        "term": term,

        "matches": len(rows),

        "documents": [

            {

                "id": row["id"],

                "url": row["url"],

                "title": row["title"],

                "content_preview": (row["content"] or "")[:1000],

            }

            for row in rows

        ],

    }

@app.get("/debug/corpus")

def debug_corpus():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(

            """

            SELECT url, title, LENGTH(content) AS content_length

            FROM documents

            ORDER BY id

            """

        )

        rows = cursor.fetchall()

    finally:

        connection.close()

    return {

        "total_documents": len(rows),

        "documents": [

            {

                "url": row["url"],

                "title": row["title"],

                "content_length": row["content_length"],

            }

            for row in rows

        ],

    }
