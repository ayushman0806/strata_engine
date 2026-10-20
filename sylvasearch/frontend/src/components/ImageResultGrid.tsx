import React, { useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import type { SearchResult } from '../types';

export interface ImageResultGridProps {
  results: SearchResult[];
  isDark?: boolean;
}

export const ImageResultGrid: React.FC<ImageResultGridProps> = ({ results, isDark = false }) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4 py-2">
      {results.map((item) => {
        const isFailed = failedImages[item.id];
        const displayImg = item.imageUrl || item.thumbnail;

        return (
          <a
            key={item.id}
            href={item.imageUrl || item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-2xl overflow-hidden border flex flex-col transition-all duration-200 hover:-translate-y-1 shadow-xs hover:shadow-md ${
              isDark
                ? 'bg-[#1E1B4B]/50 border-[#3B286B]/60 hover:border-[#A855F7]/60'
                : 'bg-white border-[#E8E5F3] hover:border-[#9333EA]/40'
            }`}
          >
            {/* Image Preview Container */}
            <div className="relative aspect-4/3 w-full overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center">
              {!isFailed && displayImg ? (
                <img
                  src={displayImg}
                  alt={item.title || 'Image result'}
                  loading="lazy"
                  onError={() => handleImageError(item.id)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#94A3B8] p-4 text-center">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                  <span className="text-[11px] font-medium">Image preview unavailable</span>
                </div>
              )}

              {/* Dimensions badge if available */}
              {item.width && item.height && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono tracking-tight backdrop-blur-xs">
                  {item.width} × {item.height}
                </span>
              )}
            </div>

            {/* Image Caption & Source Metadata */}
            <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
              <h4
                className={`text-[13px] font-medium leading-snug line-clamp-2 transition-colors ${
                  isDark ? 'text-[#F1F5F9] group-hover:text-[#D8B4FE]' : 'text-[#1E293B] group-hover:text-[#7C3AED]'
                }`}
                title={item.title}
              >
                {item.title}
              </h4>

              <div className="flex items-center justify-between gap-1 mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                <span className="truncate max-w-[120px] font-medium">
                  {item.publisher || item.siteName || 'Web'}
                </span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
