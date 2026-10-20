export interface SearchResult {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  highlightWords?: string[];
  thumbnail?: string;
  imageUrl?: string;
  siteName: string;
  favicon?: string;
  category: string;
  date?: string;
  duration?: string;
  publisher?: string;
  publishedAt?: string;
  mediaType?: 'web' | 'image' | 'video' | 'news';
  width?: number;
  height?: number;
  score?: number;
  bm25?: number;
  pagerank?: number;
  titleScore?: number;
  phraseScore?: number;
}

export interface SearchResponse {
  query: string;
  category: string;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  total_results: number;
  results: SearchResult[];
  durationMs: number;
  isLive: boolean;
  error?: string;
}

export interface KnowledgeAttribute {
  icon: 'cube' | 'target' | 'star' | 'chart';
  label: string;
  value: string;
}

export interface RelatedImageItem {
  url: string;
  title: string;
}

export interface KnowledgePanelData {
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  attributes: KnowledgeAttribute[];
  relatedImages: RelatedImageItem[];
  moreImagesCount: number;
}

export interface CategoryTabItem {
  id: string;
  label: string;
  icon: string;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string | number;
}

export interface SearchSuggestion {
  text: string;
  type: 'trending' | 'recent';
}

export type ThemeMode = 'light' | 'dark';
export type PageViewMode = 'landing' | 'results';
