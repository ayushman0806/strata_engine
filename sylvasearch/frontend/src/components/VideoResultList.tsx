import React, { useState } from 'react';
import { Play, Video as VideoIcon, ExternalLink } from 'lucide-react';
import type { SearchResult } from '../types';

export interface VideoResultListProps {
  results: SearchResult[];
  isDark?: boolean;
}

export const VideoResultList: React.FC<VideoResultListProps> = ({ results, isDark = false }) => {
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3 py-2">
      {results.map((item) => {
        const isFailed = failedThumbnails[item.id];

        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 shadow-xs hover:shadow-md ${
              isDark
                ? 'bg-[#1E1B4B]/40 border-[#3B286B]/60 hover:border-[#A855F7]/60'
                : 'bg-white border-[#E8E5F3] hover:border-[#9333EA]/40'
            }`}
          >
            {/* Video Thumbnail with Duration badge and Play icon */}
            <div className="relative w-full sm:w-[190px] h-[130px] sm:h-[110px] shrink-0 rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 flex items-center justify-center">
              {!isFailed && item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  onError={() => setFailedThumbnails((prev) => ({ ...prev, [item.id]: true }))}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#94A3B8]">
                  <VideoIcon className="w-8 h-8 opacity-60" />
                </div>
              )}

              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:bg-black/40 transition-all">
                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                </div>
              </div>

              {/* Duration badge */}
              {item.duration && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/85 text-white text-[11px] font-medium font-mono">
                  {item.duration}
                </span>
              )}
            </div>

            {/* Video Metadata */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h4
                  className={`text-[15px] sm:text-[16px] font-semibold leading-snug line-clamp-2 transition-colors ${
                    isDark ? 'text-[#F1F5F9] group-hover:text-[#D8B4FE]' : 'text-[#1E293B] group-hover:text-[#7C3AED]'
                  }`}
                >
                  {item.title}
                </h4>

                <p
                  className={`text-[12.5px] mt-1.5 line-clamp-2 leading-relaxed ${
                    isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                  }`}
                >
                  {item.snippet}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                <span className="font-semibold text-foreground truncate">{item.publisher || 'YouTube'}</span>
                {item.publishedAt && (
                  <>
                    <span>•</span>
                    <span className="shrink-0">{item.publishedAt}</span>
                  </>
                )}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50 group-hover:opacity-100" />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
