import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Mic, 
  Camera, 
  Sun, 
  Moon,
  Menu,
  SlidersHorizontal,
  Image,
  Video,
  Newspaper,
  ShoppingBag,
  MapPin,
  MoreHorizontal,
  Sparkles,
  Settings,
  Shield,
  HelpCircle
} from 'lucide-react';
import { StrataLogo } from './StrataLogo';
import { CATEGORY_TABS } from '../data/searchData';
import type { CategoryTabItem } from '../types';
import { fetchSearchSuggestions } from '../services/api';

export interface HeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  onClear: () => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  activeFilter: string | null;
  onFilterChange?: (filter: string) => void;
  onToggleSidebar?: () => void;
  onNavigateHome?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  categoryTabs?: CategoryTabItem[];
  filterChips?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
  userProfile?: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  query,
  onQueryChange,
  onSearch,
  onClear,
  activeCategory,
  onCategoryChange,
  activeFilter,
  onFilterChange: _onFilterChange,
  onToggleSidebar,
  onNavigateHome,
  isDark = false,
  onToggleTheme,
  categoryTabs = CATEGORY_TABS,
  filterChips = [],
  onSelectSuggestion,
  userProfile = {
    name: 'Elena Rostova',
    email: 'elena.r@strata.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
  },
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLensModal, setShowLensModal] = useState(false);
  
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const debounceRef = useRef<any>(null);
  const requestIdRef = useRef<number>(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, liveSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      setIsFocused(false);
      if (selectedIndex >= 0 && liveSuggestions[selectedIndex]) {
        const selected = liveSuggestions[selectedIndex];
        onQueryChange(selected);
        onSearch(selected);
      } else {
        onSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'all':
        return <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'image':
        return <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'video':
        return <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'news':
        return <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'map':
        return <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      default:
        return <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-30 transition-colors backdrop-blur-md border-b pt-3 sm:pt-4 pb-2 px-3 sm:px-6 lg:px-8 ${
        isDark 
          ? 'bg-[#0F0A1A]/92 border-[#3B286B]/60 text-[#F8FAFC]' 
          : 'bg-[#FAF9FF]/92 border-[#E8E5F3]/80 text-[#171329]'
      } ${className}`}>
        {/* Top row: Hamburger, Logo, Omnibar Search, Theme Toggle, Profile Avatar */}
        <div className="max-w-[1440px] mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Left Section: Menu button & Strata Logo */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={onToggleSidebar}
              aria-label="Toggle Navigation Sidebar"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark 
                  ? 'text-[#C4B5FD] hover:text-white hover:bg-white/10' 
                  : 'text-[#475569] hover:text-[#171329] hover:bg-white/80'
              }`}
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
            
            <button 
              onClick={onNavigateHome}
              className="flex items-center cursor-pointer focus:outline-none"
              title="Go to Strata Home"
            >
              <StrataLogo size="md" isDark={isDark} />
            </button>
          </div>

          {/* Center Section: Responsive Omnibar Search */}
          <div ref={searchContainerRef} className="order-3 md:order-2 w-full md:flex-1 md:max-w-[690px] relative mt-1 md:mt-0">
            <div className={`relative flex items-center rounded-full border transition-all duration-200 ${
              isDark
                ? 'bg-[#1E1B4B] border-[#3B286B] shadow-[0_4px_20px_rgba(0,0,0,0.3)] focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/30'
                : 'bg-white border-[#E8E5F3] shadow-[0_4px_16px_rgba(96,40,217,0.06)] hover:border-[#C084FC]/60 hover:shadow-[0_6px_20px_rgba(96,40,217,0.1)] focus-within:border-[#9333EA] focus-within:ring-2 focus-within:ring-[#9333EA]/20'
            }`}>
              {/* Search Icon */}
              <div className={`pl-3.5 sm:pl-4 pr-1.5 sm:pr-2 flex items-center ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                <Search className="w-4 h-4 stroke-[2]" />
              </div>

              {/* Input field */}
              <input
                type="text"
                value={query}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search the web with Strata..."
                className={`w-full py-2 sm:py-2.5 bg-transparent text-[14px] sm:text-[15px] font-normal outline-none ${
                  isDark 
                    ? 'text-[#F8FAFC] placeholder-[#64748B]' 
                    : 'text-[#171329] placeholder-[#94A3B8]'
                }`}
              />

              {/* Clear Button */}
              {query && (
                <button
                  onClick={onClear}
                  aria-label="Clear search input"
                  className="p-1 text-[#94A3B8] hover:text-[#171329] dark:hover:text-white rounded-full transition-colors mr-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Action icons: Microphone & Camera */}
              <div className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                <button 
                  type="button"
                  onClick={() => setShowVoiceModal(true)}
                  aria-label="Search by voice"
                  title="Search by voice"
                  className="p-1.5 hover:text-[#9333EA] dark:hover:text-[#C084FC] hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowLensModal(true)}
                  aria-label="Search by image lens"
                  title="Search with Strata Lens"
                  className="p-1.5 hover:text-[#9333EA] dark:hover:text-[#C084FC] hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Primary Gradient Search Button */}
              <button
                onClick={() => {
                  setIsFocused(false);
                  onSearch(query);
                }}
                aria-label="Submit search query"
                className="mr-1.5 my-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] hover:opacity-95 active:scale-95 text-white flex items-center justify-center shadow-[0_3px_10px_rgba(147,51,234,0.35)] transition-all cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </button>
            </div>

            {/* Dynamic Suggestions Dropdown based on real relevance signals */}
            {isFocused && liveSuggestions.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
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
                          onQueryChange(text);
                          onSearch(text);
                          setIsFocused(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-[13.5px] transition-colors cursor-pointer ${
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

          {/* Right Section: Theme Toggle & User Avatar */}
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={onToggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light theme" : "Dark theme"}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark 
                  ? 'text-[#C4B5FD] hover:text-white hover:bg-white/10' 
                  : 'text-[#475569] hover:text-[#171329] hover:bg-white/80'
              }`}
            >
              {isDark ? (
                <Moon className="w-5 h-5 stroke-[1.8] text-amber-300" />
              ) : (
                <Sun className="w-5 h-5 stroke-[1.8]" />
              )}
            </button>

            {/* Profile Avatar with dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="relative cursor-pointer focus:outline-none flex items-center"
                aria-label="User profile settings"
              >
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FAF9FF] shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#A855F7] border-2 border-white rounded-full"></span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl p-2 z-50 animate-in fade-in duration-150 ${
                  isDark 
                    ? 'bg-[#1E1B4B] border-[#3B286B] text-[#F8FAFC]' 
                    : 'bg-white border-[#E8E5F3] text-[#171329]'
                }`}>
                  <div className="px-3 py-2 border-b border-[#E8E5F3]/50">
                    <p className="text-[13px] font-semibold">{userProfile.name}</p>
                    <p className="text-[11px] text-[#64748B]">{userProfile.email}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-lg cursor-pointer">
                      <Settings className="w-4 h-4 text-[#9333EA]" />
                      <span>Search Preferences</span>
                    </button>
                    <button className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-lg cursor-pointer">
                      <Shield className="w-4 h-4 text-[#9333EA]" />
                      <span>Privacy & Sovereign Mode</span>
                    </button>
                    <button className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-[#F5F3FF] dark:hover:bg-white/10 rounded-lg cursor-pointer">
                      <HelpCircle className="w-4 h-4 text-[#9333EA]" />
                      <span>Help & Feedback</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Second row: Categories Navigation */}
        <div className="max-w-[1440px] mx-auto mt-2.5 sm:mt-3.5 flex items-center justify-between border-b border-transparent">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            {categoryTabs.map((tab) => {
              const isActive = activeCategory.toLowerCase() === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onCategoryChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[12.5px] sm:text-[13.5px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? isDark 
                        ? 'text-[#C084FC] bg-[#3B286B]/70 shadow-sm border border-[#A855F7]/30'
                        : 'text-[#7C3AED] bg-[#F3E8FF]/70 shadow-sm border border-[#E9D5FF]/60'
                      : isDark
                        ? 'text-[#C4B5FD] hover:text-white hover:bg-white/5'
                        : 'text-[#475569] hover:text-[#171329] hover:bg-white/60'
                  }`}
                >
                  {getCategoryIcon(tab.icon)}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Tools Button & Popover */}
          <div ref={toolsRef} className="relative hidden md:block">
            <button 
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors cursor-pointer shrink-0 ${
                showToolsMenu 
                  ? 'bg-[#9333EA] text-white shadow-xs' 
                  : isDark
                    ? 'text-[#C4B5FD] hover:text-white hover:bg-white/10'
                    : 'text-[#475569] hover:text-[#171329] hover:bg-white/70'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>

            {showToolsMenu && (
              <div className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-3 z-50 animate-in fade-in duration-150 ${
                isDark 
                  ? 'bg-[#1E1B4B] border-[#3B286B] text-[#F8FAFC]' 
                  : 'bg-white border-[#E8E5F3] text-[#171329]'
              }`}>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#64748B] mb-2">Search Tools</h4>
                <div className="space-y-2 text-[13px]">
                  <div>
                    <label className="text-[11px] font-medium text-[#64748B] block mb-1">Time Range</label>
                    <select className={`w-full py-1 px-2 rounded-lg text-xs border outline-none ${
                      isDark ? 'bg-[#161027] border-[#3B286B] text-white' : 'bg-[#FAF9FF] border-[#E8E5F3]'
                    }`}>
                      <option>Any time</option>
                      <option>Past 24 hours</option>
                      <option>Past week</option>
                      <option>Past month</option>
                      <option>Past year</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#64748B] block mb-1">Result Veracity</label>
                    <select className={`w-full py-1 px-2 rounded-lg text-xs border outline-none ${
                      isDark ? 'bg-[#161027] border-[#3B286B] text-white' : 'bg-[#FAF9FF] border-[#E8E5F3]'
                    }`}>
                      <option>All results</option>
                      <option>Verbatim match only</option>
                      <option>High resolution media only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Third row: Dynamic Recommended Search Suggestions Bar */}
        {filterChips && filterChips.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-2 sm:mt-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            <span className={`text-[11px] font-semibold tracking-wide pl-1 pr-0.5 shrink-0 flex items-center gap-1 ${
              isDark ? 'text-[#C084FC]' : 'text-[#7C3AED]'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-[#9333EA]" />
              Related:
            </span>
            {filterChips.map((suggestion) => {
              const isSelected = activeFilter === suggestion;
              return (
                <button
                  key={suggestion}
                  onClick={() => {
                    if (onSelectSuggestion) {
                      onSelectSuggestion(suggestion);
                    } else {
                      onQueryChange(suggestion);
                      onSearch(suggestion);
                    }
                  }}
                  className={`px-3 sm:px-3.5 py-1 rounded-full text-[12px] sm:text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-[0_2px_8px_rgba(147,51,234,0.3)]'
                      : isDark
                        ? 'bg-[#1E1B4B]/80 text-[#C4B5FD] border-[#3B286B] hover:border-[#A855F7] hover:bg-[#9333EA] hover:text-white'
                        : 'bg-white/90 text-[#475569] border-[#E8E5F3] hover:border-[#9333EA] hover:bg-[#F3E8FF] hover:text-[#7C3AED] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Voice Search Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col items-center text-center ${
            isDark ? 'bg-[#1E1B4B] border-[#3B286B] text-white' : 'bg-white border-[#E8E5F3] text-[#171329]'
          }`}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] flex items-center justify-center text-white mb-4 animate-pulse shadow-lg">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-heading mb-1">Listening...</h3>
            <p className="text-sm text-[#64748B] mb-6">Say something like "Nebula wallpapers 4K" or "Hubble telescope gallery"</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onQueryChange('hubble telescope nebula 4k');
                  onSearch('hubble telescope nebula 4k');
                  setShowVoiceModal(false);
                }}
                className="px-4 py-2 bg-[#9333EA] text-white rounded-full text-xs font-semibold hover:bg-[#7C3AED] transition-colors cursor-pointer"
              >
                Simulate Voice Query
              </button>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="px-4 py-2 border border-[#E8E5F3] rounded-full text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strata Lens Visual Search Modal */}
      {showLensModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl flex flex-col items-center text-center ${
            isDark ? 'bg-[#1E1B4B] border-[#3B286B] text-white' : 'bg-white border-[#E8E5F3] text-[#171329]'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold font-heading mb-1">Search with Strata Lens</h3>
            <p className="text-sm text-[#64748B] mb-5">Search by image to identify celestial objects, wallpapers, or textures</p>
            <div className="w-full border-2 border-dashed border-[#C4B5FD] rounded-2xl p-6 mb-5 bg-[#FAF9FF]/50 flex flex-col items-center justify-center">
              <p className="text-xs text-[#64748B] mb-2">Drag and drop any cosmic image here or paste image link</p>
              <span className="text-xs font-semibold text-[#7C3AED] hover:underline cursor-pointer">Browse files</span>
            </div>
            <button
              onClick={() => setShowLensModal(false)}
              className="px-5 py-2 bg-[#9333EA] text-white rounded-full text-xs font-semibold hover:bg-[#7C3AED] transition-colors cursor-pointer"
            >
              Close Lens
            </button>
          </div>
        </div>
      )}
    </>
  );
};
