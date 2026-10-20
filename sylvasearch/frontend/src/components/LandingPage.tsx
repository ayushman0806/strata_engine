import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Mic, 
  Camera, 
  Sun, 
  Moon, 
  Menu, 
  Globe, 
  Image, 
  Video, 
  Newspaper, 
  Sparkles,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { StrataLogo } from './StrataLogo';
import { MountainBackground } from './MountainBackground';
import { fetchSearchSuggestions } from '../services/api';

export interface LandingPageProps {
  onSearchSubmit: (query: string) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenSidebar?: () => void;
  tagline?: string;
  defaultPlaceholder?: string;
  exploreCardData?: {
    tag: string;
    title: string;
    image: string;
  };
  className?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSearchSubmit,
  isDark = false,
  onToggleTheme,
  onOpenSidebar,
  tagline = 'Search Beyond Surfaces',
  defaultPlaceholder = 'Search the web with Strata...',
  exploreCardData = {
    tag: 'Explore',
    title: 'Discover a calmer, smarter web',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=140&q=80'
  },
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Web');
  const [isFocused, setIsFocused] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);
  const requestIdRef = useRef<number>(0);

  const categories = [
    { id: 'Web', label: 'Web', icon: Globe },
    { id: 'Images', label: 'Images', icon: Image },
    { id: 'Videos', label: 'Videos', icon: Video },
    { id: 'News', label: 'News', icon: Newspaper },
  ];

  // Fetch live suggestions as user types, preventing stale responses
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLiveSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const currentId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchSearchSuggestions(trimmed);
        if (currentId === requestIdRef.current) {
          setLiveSuggestions(suggestions);
          setSelectedIndex(-1);
        }
      } catch {
        if (currentId === requestIdRef.current) {
          setLiveSuggestions([]);
        }
      }
    }, 120);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsFocused(false);
      onSearchSubmit(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, liveSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && liveSuggestions[selectedIndex]) {
        e.preventDefault();
        const selected = liveSuggestions[selectedIndex];
        setQuery(selected);
        setIsFocused(false);
        onSearchSubmit(selected);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  return (
    <div className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden transition-colors ${
      isDark ? 'bg-[#0F0A1A] text-[#F8FAFC]' : 'bg-[#FAF9FF] text-[#171329]'
    } ${className}`}>
      {/* Authentic Mountain Nebula Background Graphic */}
      <MountainBackground variant="full" isDark={isDark} />

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex items-center justify-between">
        {/* Left: Menu & Strata Logo */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button 
            onClick={onOpenSidebar}
            aria-label="Navigation Menu"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'text-[#C4B5FD] hover:bg-white/10' : 'text-[#475569] hover:bg-white/60'
            }`}
          >
            <Menu className="w-5 h-5 stroke-[2]" />
          </button>
          
          <div className="flex items-center">
            <StrataLogo size="md" isDark={isDark} />
          </div>
        </div>

        {/* Right Nav Links, Sun Toggle, Avatar */}
        <div className={`flex items-center gap-3 sm:gap-6 text-[13.5px] sm:text-[14px] font-medium ${
          isDark ? 'text-[#C4B5FD]' : 'text-[#475569]'
        }`}>
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            <button 
              onClick={() => onSearchSubmit('nebula wallpaper')}
              className="hover:text-[#9333EA] transition-colors cursor-pointer"
            >
              Images
            </button>
            <button 
              onClick={() => onSearchSubmit('nebula news')}
              className="hover:text-[#9333EA] transition-colors cursor-pointer"
            >
              News
            </button>
            <button 
              onClick={() => onSearchSubmit('nebula observatory maps')}
              className="hover:text-[#9333EA] transition-colors cursor-pointer"
            >
              Maps
            </button>
            <button className="hover:text-[#9333EA] transition-colors cursor-pointer flex items-center gap-1.5">
              <span className="grid grid-cols-2 gap-0.5 w-3 h-3">
                <span className={`w-1 h-1 rounded-xs ${isDark ? 'bg-[#C4B5FD]' : 'bg-[#475569]'}`}></span>
                <span className={`w-1 h-1 rounded-xs ${isDark ? 'bg-[#C4B5FD]' : 'bg-[#475569]'}`}></span>
                <span className={`w-1 h-1 rounded-xs ${isDark ? 'bg-[#C4B5FD]' : 'bg-[#475569]'}`}></span>
                <span className={`w-1 h-1 rounded-xs ${isDark ? 'bg-[#C4B5FD]' : 'bg-[#475569]'}`}></span>
              </span>
              More
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onToggleTheme}
              aria-label="Toggle Theme"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-amber-300 hover:bg-white/10' : 'text-[#475569] hover:bg-white/60'
              }`}
            >
              {isDark ? <Moon className="w-5 h-5 stroke-[1.8]" /> : <Sun className="w-5 h-5 stroke-[1.8]" />}
            </button>

            <div className="relative cursor-pointer">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Profile"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#A855F7] border-2 border-white rounded-full"></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Center Search Engine Stage */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center my-auto py-8 sm:py-12">
        {/* Large Dimensional Strata Logo Emblem */}
        <div className="flex flex-col items-center mb-5 sm:mb-6">
          <StrataLogo size="xl" showText={false} isDark={isDark} className="mb-2" />
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold font-heading tracking-tight mt-1 ${
            isDark ? 'text-white' : 'text-[#171329]'
          }`}>
            Strata
          </h1>
          <p className={`mt-2 text-[11px] sm:text-[12px] md:text-[13px] font-semibold tracking-[0.22em] uppercase text-center ${
            isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
          }`}>
            {tagline}
          </p>
        </div>

        {/* Omnibar Search Input Bar */}
        <div ref={searchContainerRef} className="w-full max-w-[700px] relative px-1 sm:px-0">
          <form 
            onSubmit={handleSubmit}
            className="w-full relative"
          >
            <div className={`relative flex items-center rounded-full border transition-all duration-300 ${
              isDark
                ? 'bg-[#1E1B4B]/90 backdrop-blur-xl border-[#3B286B] shadow-[0_12px_40px_-5px_rgba(0,0,0,0.5)] focus-within:ring-2 focus-within:ring-[#A855F7]/30'
                : 'bg-white/95 backdrop-blur-xl border-white/80 shadow-[0_12px_40px_-5px_rgba(96,40,217,0.15)] hover:shadow-[0_16px_48px_-4px_rgba(96,40,217,0.2)] focus-within:ring-2 focus-within:ring-[#9333EA]/30'
            }`}>
              {/* Search Icon */}
              <div className={`pl-4 sm:pl-5 pr-2 sm:pr-3 ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
              </div>

              {/* Main Input Field */}
              <input
                type="text"
                value={query}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={defaultPlaceholder}
                className={`w-full py-3 sm:py-3.5 bg-transparent text-[15px] sm:text-[16px] outline-none ${
                  isDark ? 'text-white placeholder-[#64748B]' : 'text-[#171329] placeholder-[#94A3B8]'
                }`}
              />

              {/* Voice & Lens Action Icons */}
              <div className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                <button 
                  type="button"
                  onClick={() => {
                    if (query.trim()) onSearchSubmit(query.trim());
                  }}
                  aria-label="Search with image"
                  className="p-1.5 hover:text-[#9333EA] hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (query.trim()) onSearchSubmit(query.trim());
                  }}
                  aria-label="Search with voice"
                  className="p-1.5 hover:text-[#9333EA] hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Gradient Submit Action Pill Button */}
              <button
                type="submit"
                aria-label="Search"
                className="mr-1.5 sm:mr-2 my-1.5 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] hover:opacity-95 active:scale-95 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(147,51,234,0.4)] transition-all cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Floating Autocomplete Suggestions Dropdown based on real relevance signals */}
          {isFocused && liveSuggestions.length > 0 && (
            <div className={`absolute top-full left-1 right-1 sm:left-0 sm:right-0 mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
              isDark 
                ? 'bg-[#1E1B4B] border-[#3B286B] text-[#F8FAFC]' 
                : 'bg-white border-[#E8E5F3] text-[#171329]'
            }`}>
              <div className="py-2">
                <div className="px-4 py-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                  <span>Search Suggestions</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#9333EA]" />
                </div>
                {liveSuggestions.map((text, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <button
                      key={index}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuery(text);
                        setIsFocused(false);
                        onSearchSubmit(text);
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-[14px] transition-colors cursor-pointer ${
                        isSelected
                          ? isDark ? 'bg-white/10 text-white font-medium' : 'bg-[#F5F3FF] text-[#7C3AED] font-medium'
                          : isDark ? 'hover:bg-white/5' : 'hover:bg-[#FAF9FF]'
                      }`}
                    >
                      <Search className="w-4 h-4 text-[#9333EA] shrink-0" />
                      <span className="flex-1 truncate">{text}</span>
                      <span className="text-[11px] text-[#94A3B8] font-normal hidden sm:inline">Search</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Pills (Fluid wrapped & touch optimized) */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  const targetQuery = query.trim() || cat.label;
                  onSearchSubmit(targetQuery);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12.5px] sm:text-[13px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#3B286B] text-[#C084FC] border border-[#A855F7]/40 shadow-sm'
                      : 'bg-white text-[#7C3AED] shadow-[0_4px_16px_rgba(96,40,217,0.12)] border border-[#E9D5FF]'
                    : isDark
                      ? 'bg-[#1E1B4B]/80 hover:bg-[#24184F] text-[#C4B5FD] border border-[#3B286B]'
                      : 'bg-white/75 hover:bg-white text-[#475569] hover:text-[#171329] border border-white/60 shadow-xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? (isDark ? 'text-[#C084FC]' : 'text-[#7C3AED]') : (isDark ? 'text-[#94A3B8]' : 'text-[#64748B]')}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer Section: Explore Widget, Scroll hint, Tagline */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Bottom Left: Explore Discover Card */}
        <div 
          onClick={() => onSearchSubmit('nebula wallpaper')}
          className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3.5 p-2.5 pr-4 rounded-2xl transition-all cursor-pointer group ${
            isDark
              ? 'bg-[#1E1B4B]/80 backdrop-blur-md border border-[#3B286B] shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#A855F7]/60'
              : 'bg-white/85 backdrop-blur-md border border-white/90 shadow-[0_8px_24px_rgba(96,40,217,0.08)] hover:shadow-[0_12px_32px_rgba(96,40,217,0.14)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <img
              src={exploreCardData.image}
              alt="Explore preview"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover shadow-xs shrink-0"
            />
            <div>
              <span className="block text-[10px] font-bold text-[#9333EA] dark:text-[#C084FC] uppercase tracking-wider">
                {exploreCardData.tag}
              </span>
              <span className={`block text-[12.5px] sm:text-[13px] font-semibold transition-colors leading-tight ${
                isDark ? 'text-white group-hover:text-[#C084FC]' : 'text-[#171329] group-hover:text-[#7C3AED]'
              }`}>
                {exploreCardData.title}
              </span>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ml-2 shrink-0 ${
            isDark
              ? 'bg-[#161027] border-[#3B286B] text-[#94A3B8] group-hover:text-[#C084FC]'
              : 'bg-[#FAF9FF] border-[#E8E5F3] text-[#64748B] group-hover:text-[#9333EA] group-hover:border-[#C4B5FD]'
          }`}>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Center: Scroll To Explore indicator (Hidden on compact mobile viewports to prevent clutter) */}
        <div 
          onClick={() => onSearchSubmit('nebula wallpaper')}
          className="hidden sm:flex flex-col items-center gap-1.5 cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
        >
          <div className={`w-7 h-7 rounded-full border flex items-center justify-center shadow-xs ${
            isDark ? 'bg-[#1E1B4B] border-[#3B286B] text-[#C4B5FD]' : 'bg-white/80 border-[#E8E5F3] text-[#64748B]'
          }`}>
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
          <span className={`text-[10px] font-semibold tracking-[0.2em] uppercase ${
            isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
          }`}>
            Scroll to explore
          </span>
        </div>

        {/* Bottom Right: Tagline */}
        <div className={`text-[11px] font-semibold tracking-wider uppercase text-center sm:text-right ${
          isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
        }`}>
          Cleaner search &nbsp;•&nbsp; Smarter results &nbsp;•&nbsp; A brighter web
        </div>
      </footer>
    </div>
  );
};
