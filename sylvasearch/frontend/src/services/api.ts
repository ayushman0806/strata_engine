import type { SearchResult, KnowledgePanelData, SearchResponse } from '../types';
import { KNOWLEDGE_PANEL_DATA } from '../data/searchData';

const getHost = () => (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1');

export type { SearchResponse };

export interface EngineHealth {
  connected: boolean;
  indexedDocuments: number;
  totalLinks: number;
  frontierStats?: {
    pending: number;
    processing: number;
    crawled: number;
    failed: number;
    total: number;
  };
  message: string;
}

/**
 * Format raw URL into clean display breadcrumb (e.g., 'python.org › downloads › macos')
 */
export function formatDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    const pathSegments = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 3);
    if (pathSegments.length === 0) return domain;
    return `${domain} › ${pathSegments.join(' › ')}`;
  } catch {
    return url;
  }
}

/**
 * Extract clean hostname
 */
export function extractSiteName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Web';
  }
}

/**
 * Infer category from URL path and title
 */
export function inferCategory(url: string, title: string): string {
  const combined = `${url} ${title}`.toLowerCase();
  if (combined.includes('pep-') || combined.includes('pep ') || combined.includes('/peps/')) {
    return 'PEPs';
  }
  if (combined.includes('doc') || combined.includes('guide') || combined.includes('tutorial')) {
    return 'Docs';
  }
  if (combined.includes('download') || combined.includes('release')) {
    return 'Downloads';
  }
  if (combined.includes('job') || combined.includes('career')) {
    return 'Jobs';
  }
  if (combined.includes('event') || combined.includes('conference') || combined.includes('pycon')) {
    return 'Events';
  }
  if (combined.includes('community') || combined.includes('forum') || combined.includes('list')) {
    return 'Community';
  }
  if (combined.includes('news') || combined.includes('blog') || combined.includes('announc')) {
    return 'News';
  }
  return 'Web';
}

/**
 * Helper to try fetch across known base URLs
 */
async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let lastError: Error | null = null;
  const currentHost = getHost();
  const urls = Array.from(new Set([
    '', // Relative first (Vite proxy - works on local & network)
    `http://${currentHost}:8000`, // Direct host backend over LAN
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ]));

  for (const base of urls) {
    const fullUrl = `${base}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const contentType = res.headers.get('content-type') || '';
      // If we requested an API endpoint but received HTML, Vite served index.html fallback
      if (res.ok && !contentType.includes('text/html')) {
        return res;
      }
      if (res.ok && contentType.includes('text/html')) {
        lastError = new Error(`Received HTML instead of JSON from ${fullUrl}`);
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError || new Error(`Failed to reach endpoint: ${endpoint}`);
}

/**
 * Check if the backend Strata / SylvaSearch engine is currently online
 */
export async function checkEngineHealth(): Promise<EngineHealth> {
  try {
    let res: Response;
    try {
      res = await fetchWithFallback('/health');
    } catch {
      res = await fetchWithFallback('/');
    }
    const data = await res.json();

    let frontierStats;
    try {
      const frontierRes = await fetchWithFallback('/frontier/stats');
      frontierStats = await frontierRes.json();
    } catch {
      // optional
    }

    return {
      connected: true,
      indexedDocuments: data.indexed_documents || 0,
      totalLinks: frontierStats?.crawled || 0,
      frontierStats,
      message: data.message || 'Engine operational',
    };
  } catch (err) {
    return {
      connected: false,
      indexedDocuments: 0,
      totalLinks: 0,
      message: err instanceof Error ? err.message : 'Offline',
    };
  }
}

/**
 * Execute query against the live BM25 + PageRank Strata backend
 */
export async function searchStrataEngine(
  query: string,
  category: string = 'all',
  page: number = 1,
  limit: number = 15
): Promise<SearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      category,
      page: 1,
      limit: 15,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      total_results: 0,
      results: [],
      durationMs: 0,
      isLive: true,
    };
  }

  const startTime = performance.now();
  const cappedLimit = Math.min(Math.max(1, limit), 15);

  try {
    const res = await fetchWithFallback(
      `/search?q=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(category)}&page=${page}&limit=${cappedLimit}`
    );
    const data = await res.json();
    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

    const backendResults = (data.results || []).map((raw: any) => {
      const url = raw.url || '';
      const title = raw.title || url;
      const siteName = raw.publisher || extractSiteName(url);
      const highlightWords = trimmed.split(/\s+/).filter(w => w.length > 1);

      const result: SearchResult = {
        id: String(raw.id || hashString(url)),
        title,
        url,
        displayUrl: formatDisplayUrl(url),
        snippet: raw.snippet || raw.text || '',
        highlightWords,
        siteName,
        favicon: siteName.toLowerCase().includes('python') ? 'python' : 'default',
        category: raw.media_type ? capitalize(raw.media_type) : capitalize(category),
        mediaType: raw.media_type || (category === 'images' ? 'image' : category === 'videos' ? 'video' : category === 'news' ? 'news' : 'web'),
        thumbnail: raw.thumbnail || (raw.media_type === 'image' ? raw.image_url : undefined),
        imageUrl: raw.image_url,
        duration: raw.duration,
        publisher: raw.publisher,
        publishedAt: raw.published_at,
        width: raw.width,
        height: raw.height,
        date: raw.published_at || 'Indexed Page',
        score: typeof raw.score === 'number' ? raw.score : undefined,
        bm25: typeof raw.bm25_normalized === 'number' ? raw.bm25_normalized : raw.bm25,
        pagerank: typeof raw.pagerank_normalized === 'number' ? raw.pagerank_normalized : raw.pagerank,
        titleScore: raw.title_score,
        phraseScore: raw.phrase_score,
      };

      return result;
    });

    return {
      query: trimmed,
      category: data.category || category,
      page: data.page || page,
      limit: data.limit || cappedLimit,
      totalPages: data.total_pages || 1,
      hasNext: Boolean(data.has_next),
      hasPrev: Boolean(data.has_prev),
      total_results: typeof data.total_results === 'number' ? data.total_results : backendResults.length,
      results: backendResults,
      durationMs,
      isLive: true,
    };
  } catch (error: unknown) {
    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    const errMessage = error instanceof Error ? error.message : 'Network error';

    return {
      query: trimmed,
      category,
      page,
      limit: cappedLimit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      total_results: 0,
      results: [],
      durationMs,
      isLive: false,
      error: `Strata Engine offline or request failed (${errMessage}).`,
    };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Trigger real-time web crawler on seed URL
 */
export async function triggerCrawl(url: string, maxPages: number = 20): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const res = await fetchWithFallback(`/crawl-seeds?seeds=${encodeURIComponent(url)}&max_pages=${maxPages}`);
    const data = await res.json();
    return {
      success: true,
      message: `Crawled ${data.pages_crawled} pages (${data.new_documents} new docs indexed, ${data.new_links} links discovered)`,
      data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Crawler execution failed',
    };
  }
}

/**
 * Fetch live search suggestions for autocomplete as user types
 */
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetchWithFallback(`/api/suggest?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        return data.suggestions;
      }
    }
  } catch {
    // fallback gracefully
  }
  return [];
}

/**
 * Fetch PageRank leaderboard
 */
export async function getPageRankLeaderboard(): Promise<{
  total_pages: number;
  pages: { url: string; pagerank: number }[];
}> {
  try {
    const res = await fetchWithFallback('/pagerank');
    return await res.json();
  } catch {
    return { total_pages: 0, pages: [] };
  }
}

/**
 * Intelligent Knowledge Panel Provider tailored to queries
 */
export function getKnowledgePanelForQuery(query: string, topResult?: SearchResult): KnowledgePanelData {
  const lower = query.toLowerCase().trim();

  if (lower.includes('python')) {
    return {
      title: 'Python',
      subtitle: 'High-level programming language',
      description: 'Python is an interpreted, high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Dynamically-typed and garbage-collected, it supports multiple paradigms including structured, object-oriented, and functional programming.',
      heroImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80',
      attributes: [
        {
          icon: 'cube',
          label: 'Designed by',
          value: 'Guido van Rossum',
        },
        {
          icon: 'target',
          label: 'First released',
          value: '20 February 1991',
        },
        {
          icon: 'star',
          label: 'Typing discipline',
          value: 'Duck, dynamic, strong typing',
        },
        {
          icon: 'chart',
          label: 'Governance',
          value: 'Python Software Foundation (PSF)',
        },
      ],
      relatedImages: [
        {
          url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80',
          title: 'Code Editor',
        },
        {
          url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80',
          title: 'Syntax Structure',
        },
        {
          url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=500&q=80',
          title: 'Terminal Execution',
        },
        {
          url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=500&q=80',
          title: 'Algorithms',
        },
      ],
      moreImagesCount: 42,
    };
  }

  if (lower.includes('pep')) {
    return {
      title: 'Python Enhancement Proposal (PEP)',
      subtitle: 'Official design specifications & standards',
      description: 'A Python Enhancement Proposal (PEP) is a design document providing information to the Python community or describing a new feature for Python, its processes, or environment. PEPs are the primary mechanism for proposing major new features and collecting community input.',
      heroImage: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&w=900&q=80',
      attributes: [
        {
          icon: 'cube',
          label: 'Format Author',
          value: 'Warsaw, Hylton, van Rossum (PEP 1)',
        },
        {
          icon: 'target',
          label: 'Purpose',
          value: 'Language evolution & consensus',
        },
        {
          icon: 'star',
          label: 'Famous PEPs',
          value: 'PEP 8 (Style), PEP 20 (Zen)',
        },
        {
          icon: 'chart',
          label: 'Status Types',
          value: 'Draft, Accepted, Final, Rejected',
        },
      ],
      relatedImages: [
        {
          url: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&w=500&q=80',
          title: 'Architecture Blueprint',
        },
        {
          url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80',
          title: 'Language Spec',
        },
      ],
      moreImagesCount: 16,
    };
  }

  if (lower.includes('linkedin')) {
    return {
      title: 'LinkedIn',
      subtitle: 'Professional Social Network & Career Platform',
      description: 'LinkedIn is an American business and employment-focused social media platform that operates via websites and mobile apps. It is primarily used for professional networking and career development, allowing job seekers to post their CVs and employers to post jobs.',
      heroImage: '',
      attributes: [
        {
          icon: 'cube',
          label: 'Platform Type',
          value: 'Professional Social Network',
        },
        {
          icon: 'target',
          label: 'Official Domain',
          value: 'linkedin.com',
        },
        {
          icon: 'star',
          label: 'Parent Company',
          value: 'Microsoft Corporation',
        },
        {
          icon: 'chart',
          label: 'Key Focus',
          value: 'Careers, Jobs & Professional Profiles',
        },
      ],
      relatedImages: [],
      moreImagesCount: 0,
    };
  }

  if (lower.includes('nebula') || lower.includes('space') || lower.includes('universe')) {
    return KNOWLEDGE_PANEL_DATA;
  }

  // If a top result exists, synthesize a dynamic panel with authentic metadata
  if (topResult) {
    // Only use authentic, verified result images, never unrelated stock photos
    const verifiedImage = topResult.imageUrl || topResult.thumbnail || '';

    return {
      title: topResult.title.split('|')[0].split('-')[0].trim() || 'Strata Knowledge Graph',
      subtitle: topResult.siteName || 'Information Retrieval Node',
      description: topResult.snippet || 'Real-time indexed resource from the Strata search engine graph.',
      heroImage: verifiedImage,
      attributes: [
        {
          icon: 'cube',
          label: 'Source Host',
          value: topResult.siteName,
        },
        {
          icon: 'chart',
          label: 'Relevance Score',
          value: topResult.score ? `${Math.min(99.9, topResult.score * 70).toFixed(1)}%` : 'Direct Match',
        },
        {
          icon: 'target',
          label: 'BM25 Lexical',
          value: topResult.bm25 ? `${(topResult.bm25 * 100).toFixed(1)}%` : 'Computed',
        },
        {
          icon: 'star',
          label: 'PageRank Authority',
          value: topResult.pagerank ? `${(topResult.pagerank * 100).toFixed(1)}%` : 'Ranked',
        },
      ],
      relatedImages: verifiedImage ? [{ url: verifiedImage, title: topResult.title }] : [],
      moreImagesCount: 0,
    };
  }

  return {
    title: query || 'Search Topic',
    subtitle: 'Knowledge Graph',
    description: 'Explore verified results, citations, and indexed information across the web.',
    heroImage: '',
    attributes: [
      {
        icon: 'cube',
        label: 'Status',
        value: 'Indexed',
      },
      {
        icon: 'chart',
        label: 'Search Category',
        value: 'General Web',
      },
    ],
    relatedImages: [],
    moreImagesCount: 0,
  };
}
