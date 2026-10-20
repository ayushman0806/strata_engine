import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SearchResultItem } from './components/SearchResultItem';
import { ImageResultGrid } from './components/ImageResultGrid';
import { VideoResultList } from './components/VideoResultList';
import { KnowledgePanel } from './components/KnowledgePanel';
import { LandingPage } from './components/LandingPage';
import { MountainBackground } from './components/MountainBackground';
import { CrawlerModal } from './components/CrawlerModal';
import {
  searchStrataEngine,
  checkEngineHealth,
  getKnowledgePanelForQuery,
  fetchSearchSuggestions,
  type EngineHealth,
} from './services/api';
import { DEFAULT_SEARCH_TOPICS } from './data/searchData';
import type { PageViewMode, SearchResult } from './types';

export function App() {
  // Read initial query from URL search parameters if available
  const initialUrlQuery = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('q') || ''
    : '';
  const initialCategory = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('category') || 'all').toLowerCase()
    : 'all';

  // Navigation state between Landing Page and Results Page
  const [currentPage, setCurrentPage] = useState<PageViewMode>(initialUrlQuery ? 'results' : 'landing');
  const [query, setQuery] = useState(initialUrlQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSidebarTab, setActiveSidebarTab] = useState(initialCategory);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Pagination State (Max 15 per page enforced strictly by backend and frontend)
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);

  // Engine Connection & Results State
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchDurationMs, setSearchDurationMs] = useState(0.2);
  const [totalBackendResults, setTotalBackendResults] = useState(0);
  const [engineHealth, setEngineHealth] = useState<EngineHealth | null>(null);
  const [isCrawlerModalOpen, setIsCrawlerModalOpen] = useState(false);

  // Dynamic recommendations row state (contextual according to search query)
  const [recommendedSuggestions, setRecommendedSuggestions] = useState<string[]>(DEFAULT_SEARCH_TOPICS);

  // Update recommendations whenever search query changes
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRecommendedSuggestions(DEFAULT_SEARCH_TOPICS);
      return;
    }

    let isMounted = true;
    fetchSearchSuggestions(trimmed).then((suggs) => {
      if (!isMounted) return;
      if (suggs && suggs.length > 0) {
        const formatted = suggs
          .filter((s) => s.toLowerCase() !== trimmed.toLowerCase())
          .map((s) => s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        setRecommendedSuggestions(formatted.length > 0 ? formatted.slice(0, 8) : suggs.slice(0, 8));
      } else {
        setRecommendedSuggestions([
          `${trimmed} Login`,
          `${trimmed} Jobs`,
          `${trimmed} Official Site`,
          `${trimmed} News`,
          `${trimmed} Overview`,
        ]);
      }
    }).catch(() => {
      if (isMounted) {
        setRecommendedSuggestions([
          `${trimmed} Login`,
          `${trimmed} Official Site`,
          `${trimmed} News`,
        ]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [query]);

  // Check backend health on initial mount and set up periodic ping
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      const health = await checkEngineHealth();
      if (isMounted) setEngineHealth(health);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Perform search against Strata Engine with category and page
  const executeSearch = useCallback(async (searchQuery: string, category: string = 'all', page: number = 1) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setTotalBackendResults(0);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchStrataEngine(trimmed, category, page, 15);
      setResults(response.results);
      setTotalBackendResults(response.total_results);
      setTotalPages(response.totalPages);
      setHasNextPage(response.hasNext);
      setHasPrevPage(response.hasPrev);
      setCurrentPageNum(response.page);
      setSearchDurationMs(response.durationMs);
    } catch {
      setResults([]);
      setTotalBackendResults(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search on mount ONLY if an initial query is provided in the URL
  useEffect(() => {
    if (initialUrlQuery.trim()) {
      executeSearch(initialUrlQuery.trim(), initialCategory, 1);
    }
  }, [executeSearch, initialUrlQuery, initialCategory]);

  // Search submission handler
  const handleSearch = (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setCurrentPage('results');
    setCurrentPageNum(1);
    setSidebarOpen(false);

    // Sync browser URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('q', trimmed);
      url.searchParams.set('category', activeCategory);
      window.history.pushState(null, '', url.toString());
    }
    executeSearch(trimmed, activeCategory, 1);
  };

  // Category change handler (resets to page 1)
  const handleCategoryChange = (newCat: string) => {
    const normalized = newCat.toLowerCase();
    setActiveCategory(normalized);
    setActiveSidebarTab(normalized);
    setCurrentPageNum(1);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      url.searchParams.set('category', normalized);
      window.history.pushState(null, '', url.toString());
    }

    if (query.trim()) {
      executeSearch(query.trim(), normalized, 1);
    }
  };

  // Sidebar navigation selection handler
  const handleSidebarSelect = (tabId: string) => {
    if (tabId === 'crawler') {
      setIsCrawlerModalOpen(true);
      return;
    }
    handleCategoryChange(tabId);
  };

  // Pagination navigation handler
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || newPage === currentPageNum) return;
    setCurrentPageNum(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    executeSearch(query, activeCategory, newPage);
  };

  const handleNavigateHome = () => {
    setQuery('');
    setResults([]);
    setTotalBackendResults(0);
    setCurrentPageNum(1);
    setCurrentPage('landing');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      url.searchParams.delete('category');
      window.history.pushState(null, '', url.pathname);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setTotalBackendResults(0);
    setCurrentPageNum(1);
  };

  // Filter results based on active filter chip (e.g. '4K', 'Dark', etc.)
  const filteredResults = useMemo(() => {
    if (!activeFilter) return results;
    return results.filter((item: SearchResult) => {
      return (
        item.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
        item.snippet.toLowerCase().includes(activeFilter.toLowerCase())
      );
    });
  }, [results, activeFilter]);

  // Compute dynamic knowledge panel data based on query & top result
  const knowledgePanelData = useMemo(() => {
    return getKnowledgePanelForQuery(query, filteredResults[0]);
  }, [query, filteredResults]);

  // Generate page numbers for pagination controls
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPageNum - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPageNum, totalPages]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-[#9333EA]/20 selection:text-[#6028D9] ${
        isDark ? 'bg-[#0F0A1A] text-[#F8FAFC]' : 'bg-[#FAF9FF] text-[#171329]'
      }`}
    >
      {/* Dynamic View & Engine Controller Top Bar */}
      <div
        className={`text-xs py-1.5 px-3 sm:px-4 flex items-center justify-between z-40 border-b ${
          isDark
            ? 'bg-[#161027] text-white/90 border-[#3B286B]'
            : 'bg-[#1E1B4B] text-white/90 border-[#3B286B]'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsCrawlerModalOpen(true)}
            className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer group"
            title="Open Strata Crawler & Graph Console"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                engineHealth?.connected ? 'bg-[#10B981] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-white">
              {engineHealth?.connected
                ? `Strata Engine Active (${engineHealth.indexedDocuments} Docs)`
                : 'Strata Engine (Standby)'}
            </span>
            <span className="text-white/40 text-[10px] group-hover:text-white">⚙️ Console</span>
          </button>

          <span className="text-white/40 hidden md:inline">|</span>
          <span className="text-white/70 hidden md:inline text-[11px]">
            BM25 + PageRank Power Iteration
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setIsCrawlerModalOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#9333EA]/40 hover:bg-[#9333EA]/60 text-white transition-colors cursor-pointer border border-[#9333EA]/40"
          >
            <Database className="w-3 h-3" />
            <span>Crawler & Frontier</span>
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-md">
            <button
              onClick={() => setCurrentPage('results')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                currentPage === 'results'
                  ? 'bg-[#9333EA] text-white shadow-xs'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setCurrentPage('landing')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                currentPage === 'landing'
                  ? 'bg-[#9333EA] text-white shadow-xs'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Landing
            </button>
          </div>
        </div>
      </div>

      {currentPage === 'landing' ? (
        <LandingPage
          onSearchSubmit={handleSearch}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      ) : (
        <div className="relative flex-1 flex flex-col overflow-x-hidden">
          {/* Authentic Mountain Background Graphic Component */}
          <MountainBackground variant="subtle" isDark={isDark} />

          {/* Sticky Omnibar Header with Live Category Tabs */}
          <Header
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onClear={handleClear}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigateHome={handleNavigateHome}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            filterChips={recommendedSuggestions}
            onSelectSuggestion={(suggestion) => {
              setActiveFilter(null);
              setQuery(suggestion);
              handleSearch(suggestion);
            }}
          />

          {/* Main Layout Container (Sidebar + Results + Knowledge Panel) */}
          <div className="relative z-10 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex-1 flex gap-4 lg:gap-8">
            {/* Left Column: Responsive Sidebar */}
            <Sidebar
              activeTab={activeSidebarTab}
              onTabSelect={handleSidebarSelect}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              isDark={isDark}
            />

            {/* Middle Column: Search Results List */}
            <main className="flex-1 min-w-0 max-w-full lg:max-w-[690px]">
              {/* Search Metadata Count line */}
              <div
                className={`text-[12px] sm:text-[12.5px] mb-2 font-normal flex items-center justify-between ${
                  isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                }`}
              >
                <span>
                  {isLoading ? (
                    `Searching Strata Engine (${activeCategory})...`
                  ) : (
                    <>
                      About {totalBackendResults} results ({searchDurationMs} ms)
                      <span className="opacity-60 ml-1.5 hidden sm:inline">
                        · Max 15 per page
                      </span>
                    </>
                  )}
                </span>

                {totalBackendResults > 0 && (
                  <span className="text-[11px] opacity-75 hidden sm:inline font-mono">
                    Page {currentPageNum} of {totalPages}
                  </span>
                )}
              </div>

              {/* Shimmer loading skeleton */}
              {isLoading && (
                <div className="space-y-4 py-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`p-4 rounded-xl border animate-pulse space-y-2.5 ${
                        isDark ? 'border-[#3B286B]/40 bg-[#1E1B4B]/20' : 'border-[#F1EFF9] bg-white/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-400/20" />
                        <div className="w-36 h-3 rounded bg-purple-400/20" />
                      </div>
                      <div className="w-3/4 h-5 rounded bg-purple-500/20" />
                      <div className="w-full h-3 rounded bg-purple-400/15" />
                      <div className="w-4/5 h-3 rounded bg-purple-400/15" />
                    </div>
                  ))}
                </div>
              )}

              {/* List of Search Results */}
              {!isLoading && (
                <div>
                  {filteredResults.length > 0 ? (
                    <div>
                      {/* 1. Category: Images */}
                      {activeCategory === 'images' && (
                        <ImageResultGrid results={filteredResults} isDark={isDark} />
                      )}

                      {/* 2. Category: Videos */}
                      {activeCategory === 'videos' && (
                        <VideoResultList results={filteredResults} isDark={isDark} />
                      )}

                      {/* 3. Category: All or News */}
                      {activeCategory !== 'images' && activeCategory !== 'videos' && (
                        <div className="space-y-1">
                          {filteredResults.map((result) => (
                            <SearchResultItem key={result.id} result={result} isDark={isDark} />
                          ))}
                        </div>
                      )}

                      {/* Working Pagination Bar */}
                      <nav
                        aria-label="Search results pagination"
                        className={`mt-8 pt-4 pb-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                          isDark ? 'border-[#3B286B]/60' : 'border-[#E8E5F3]'
                        }`}
                      >
                        {/* Page indicator info */}
                        <div className={`text-[12.5px] font-medium ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                          Page <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1E293B]'}`}>{currentPageNum}</span> of{' '}
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1E293B]'}`}>{totalPages}</span>
                          <span className="opacity-70 ml-2">({totalBackendResults} results total)</span>
                        </div>

                        {/* Previous and Next Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePageChange(currentPageNum - 1)}
                            disabled={currentPageNum <= 1 || !hasPrevPage}
                            aria-label="Previous page"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                              currentPageNum <= 1 || !hasPrevPage
                                ? 'opacity-40 cursor-not-allowed border border-transparent text-[#94A3B8]'
                                : isDark
                                  ? 'bg-[#1E1B4B] border border-[#3B286B] text-[#C4B5FD] hover:bg-[#9333EA] hover:text-white shadow-xs'
                                  : 'bg-white border border-[#E8E5F3] text-[#6028D9] hover:bg-[#9333EA] hover:text-white shadow-xs'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                          </button>

                          {/* Numerical Page Indicator Buttons */}
                          <div className="hidden sm:flex items-center gap-1 px-1">
                            {pageNumbers.map((p) => (
                              <button
                                key={p}
                                onClick={() => handlePageChange(p)}
                                aria-label={`Page ${p}`}
                                className={`w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                  p === currentPageNum
                                    ? 'bg-[#9333EA] text-white shadow-xs'
                                    : isDark
                                      ? 'text-[#C4B5FD] hover:bg-white/10'
                                      : 'text-[#64748B] hover:bg-black/5'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handlePageChange(currentPageNum + 1)}
                            disabled={currentPageNum >= totalPages || !hasNextPage}
                            aria-label="Next page"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                              currentPageNum >= totalPages || !hasNextPage
                                ? 'opacity-40 cursor-not-allowed border border-transparent text-[#94A3B8]'
                                : isDark
                                  ? 'bg-[#1E1B4B] border border-[#3B286B] text-[#C4B5FD] hover:bg-[#9333EA] hover:text-white shadow-xs'
                                  : 'bg-white border border-[#E8E5F3] text-[#6028D9] hover:bg-[#9333EA] hover:text-white shadow-xs'
                            }`}
                          >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </nav>
                    </div>
                  ) : (
                    <div
                      className={`py-12 px-6 rounded-2xl border text-center ${
                        isDark
                          ? 'border-[#3B286B]/60 bg-[#161027]/60 text-[#94A3B8]'
                          : 'border-[#E8E5F3] bg-white/60 text-[#64748B]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        No {activeCategory !== 'all' ? activeCategory : ''} results found for "{query}"
                      </p>
                      <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto">
                        Try searching with different terms or crawl new pages into the engine.
                      </p>

                      {/* Clickable Popular Query Chips */}
                      <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-lg mx-auto">
                        {['Python', 'Artificial Intelligence', 'Space Exploration', 'Quantum Computing', 'Linux'].map(
                          (sample) => (
                            <button
                              key={sample}
                              onClick={() => handleSearch(sample)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                                isDark
                                  ? 'bg-[#1E1B4B] border-[#3B286B] text-[#C4B5FD] hover:bg-[#9333EA] hover:text-white'
                                  : 'bg-white border-[#E8E5F3] text-[#6028D9] hover:bg-[#9333EA] hover:text-white'
                              }`}
                            >
                              {sample}
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setIsCrawlerModalOpen(true)}
                          className="px-4 py-2 bg-[#9333EA] text-white rounded-full text-xs font-semibold hover:bg-[#7C3AED] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Database className="w-3.5 h-3.5" />
                          Crawl &amp; Index New Domain
                        </button>
                        <button
                          onClick={handleNavigateHome}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                            isDark
                              ? 'border-[#3B286B] text-white/80 hover:bg-white/10'
                              : 'border-[#E8E5F3] text-black/70 hover:bg-black/5'
                          }`}
                        >
                          Return to Home
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Right Column: Dynamic Knowledge Panel (Desktop) */}
            <aside className="hidden xl:block">
              <KnowledgePanel data={knowledgePanelData} isDark={isDark} />
            </aside>
          </div>

          {/* Mobile & Tablet Knowledge Panel Display */}
          <div className="xl:hidden max-w-full lg:max-w-[690px] mx-auto px-3 sm:px-6 pb-12 w-full">
            <div className={`pt-6 border-t ${isDark ? 'border-[#3B286B]' : 'border-[#E8E5F3]'}`}>
              <KnowledgePanel data={knowledgePanelData} isDark={isDark} />
            </div>
          </div>
        </div>
      )}

      {/* Crawler & Engine Frontier Controller Modal */}
      <CrawlerModal
        isOpen={isCrawlerModalOpen}
        onClose={() => setIsCrawlerModalOpen(false)}
        isDark={isDark}
        onCrawlSuccess={() => {
          checkEngineHealth().then(setEngineHealth);
          executeSearch(query, activeCategory, 1);
        }}
      />
    </div>
  );
}

export default App;
