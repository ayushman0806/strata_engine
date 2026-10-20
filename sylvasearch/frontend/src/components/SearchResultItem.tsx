import React from 'react';
import { MoreVertical } from 'lucide-react';
import type { SearchResult } from '../types';

export interface SearchResultItemProps {
  result: SearchResult;
  isDark?: boolean;
  onItemClick?: (result: SearchResult) => void;
  className?: string;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
  result, 
  isDark = false,
  onItemClick,
  className = ''
}) => {
  // Favicon style or fallback badge
  const renderFavicon = () => {
    switch (result.favicon) {
      case 'python':
        return (
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#3776AB] to-[#FFD43B] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
            Py
          </div>
        );
      case 'unsplash':
        return (
          <div className="w-5 h-5 rounded-md bg-black text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            U
          </div>
        );
      case 'abyss':
        return (
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            A
          </div>
        );
      case 'pinterest':
        return (
          <div className="w-5 h-5 rounded-full bg-[#E60023] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
            P
          </div>
        );
      case 'nasa':
        return (
          <div className="w-5 h-5 rounded-full bg-[#0B3D91] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
            N
          </div>
        );
      case '4k':
        return (
          <div className="w-5 h-5 rounded-md bg-teal-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            4K
          </div>
        );
      default: {
        const domain = (() => {
          try {
            return new URL(result.url).hostname;
          } catch {
            return '';
          }
        })();
        const letter = result.siteName ? result.siteName.charAt(0).toUpperCase() : 'S';
        if (domain) {
          return (
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt={result.siteName}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-md object-contain shrink-0"
            />
          );
        }
        return (
          <div className="w-5 h-5 rounded-md bg-[#7C3AED] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
            {letter}
          </div>
        );
      }
    }
  };

  // Highlight keywords like "nebula wallpapers" in bold
  const renderSnippet = () => {
    let content = result.snippet;
    if (result.highlightWords && result.highlightWords.length > 0) {
      const parts = content.split(new RegExp(`(${result.highlightWords.join('|')})`, 'gi'));
      return parts.map((part, index) => {
        const isMatched = result.highlightWords?.some(
          w => w.toLowerCase() === part.toLowerCase()
        );
        return isMatched ? (
          <strong key={index} className={`font-semibold ${isDark ? 'text-white' : 'text-[#171329]'}`}>
            {part}
          </strong>
        ) : (
          part
        );
      });
    }
    return content;
  };

  return (
    <article 
      onClick={() => onItemClick && onItemClick(result)}
      className={`group flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-5 py-4 border-b rounded-xl px-2 sm:px-2.5 transition-all ${
        isDark 
          ? 'border-[#3B286B]/40 hover:bg-[#1E1B4B]/40' 
          : 'border-[#F1EFF9] hover:bg-white/40'
      } ${className}`}
    >
      {/* Content Column */}
      <div className="flex-1 min-w-0 pr-0 sm:pr-2 w-full">
        {/* URL breadcrumb and Favicon line */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {renderFavicon()}
          
          <div className={`flex items-center gap-1.5 text-[12px] sm:text-[12.5px] leading-none truncate ${
            isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
          }`}>
            <span className={`font-medium ${isDark ? 'text-[#C4B5FD]' : 'text-[#334155]'}`}>{result.siteName}</span>
            <span className="opacity-50">·</span>
            <span className="truncate hover:underline cursor-pointer">{result.displayUrl}</span>
          </div>

          {result.date && (
            <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-[#94A3B8]/70' : 'text-[#94A3B8]'}`}>
              · {result.date}
            </span>
          )}

          {/* Three dots overflow menu button */}
          <button 
            aria-label="More options"
            className="text-[#94A3B8] hover:text-[#475569] dark:hover:text-white p-0.5 rounded ml-auto cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title link */}
        <h3 className={`text-[17px] sm:text-[19px] font-semibold leading-snug mb-1.5 transition-colors ${
          isDark 
            ? 'text-[#C084FC] hover:text-[#E879F9]' 
            : 'text-[#6028D9] hover:text-[#9333EA]'
        }`}>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {result.title}
          </a>
        </h3>

        {/* Description snippet */}
        <p className={`text-[13px] sm:text-[13.5px] leading-relaxed max-w-[620px] ${
          isDark ? 'text-[#C4B5FD]/90' : 'text-[#475569]'
        }`}>
          {renderSnippet()}
        </p>

        {/* Explainable Ranking Badges (when powered by Strata Engine) */}
        {result.score !== undefined && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10.5px]">
            <span className={`px-2 py-0.5 rounded-md font-semibold tracking-wide ${
              isDark ? 'bg-[#9333EA]/30 text-[#D8B4FE] border border-[#9333EA]/40' : 'bg-[#9333EA]/10 text-[#7E22CE] border border-[#9333EA]/20'
            }`}>
              Score {(result.score * 100).toFixed(1)}%
            </span>
            {result.bm25 !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-white/5 text-[#94A3B8]' : 'bg-black/5 text-[#64748B]'
              }`}>
                BM25 {result.bm25.toFixed(2)}
              </span>
            )}
            {result.pagerank !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-white/5 text-[#94A3B8]' : 'bg-black/5 text-[#64748B]'
              }`}>
                PageRank {result.pagerank.toFixed(2)}
              </span>
            )}
            {result.category && (
              <span className={`px-1.5 py-0.5 rounded-md font-medium ${
                isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
              }`}>
                {result.category}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Preview Card (Responsive size: full width on tiny mobile or fixed card on tablet/desktop) */}
      {result.thumbnail && (
        <a 
          href={result.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`shrink-0 w-full sm:w-[110px] h-[120px] sm:h-[78px] rounded-xl overflow-hidden border shadow-sm group-hover:shadow-md transition-all cursor-pointer relative mt-2 sm:mt-0 ${
            isDark ? 'border-[#3B286B] bg-[#161027]' : 'border-[#E8E5F3] bg-[#F5F3FF]'
          }`}
        >
          <img
            src={result.thumbnail}
            alt={result.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </a>
      )}
    </article>
  );
};
