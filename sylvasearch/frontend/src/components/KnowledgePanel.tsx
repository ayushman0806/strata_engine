import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Crosshair, 
  Star, 
  BarChart3, 
  ArrowUpRight 
} from 'lucide-react';
import type { KnowledgePanelData } from '../types';

export interface KnowledgePanelProps {
  data: KnowledgePanelData;
  isDark?: boolean;
  onViewMoreImages?: () => void;
  className?: string;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ 
  data, 
  isDark = false,
  onViewMoreImages,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Images' | 'Videos' | 'Types' | 'Facts'>('Overview');
  const [imageError, setImageError] = useState(false);
  const tabs = ['Overview', 'Images', 'Videos', 'Types', 'Facts'] as const;

  useEffect(() => {
    setImageError(false);
  }, [data.heroImage]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'cube':
        return <Box className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC]" />;
      case 'target':
        return <Crosshair className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC]" />;
      case 'star':
        return <Star className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC]" />;
      case 'chart':
        return <BarChart3 className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC]" />;
      default:
        return <Box className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC]" />;
    }
  };

  const hasValidImage = Boolean(data.heroImage && !imageError && data.heroImage.trim().length > 0);

  return (
    <div className={`w-full max-w-full xl:max-w-[480px] shrink-0 space-y-5 sm:space-y-6 ${className}`}>
      {/* Main Knowledge Card */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark 
          ? 'bg-[#1E1B4B] border-[#3B286B] text-white shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]' 
          : 'bg-white border-[#E8E5F3] text-[#171329] shadow-[0_8px_30px_-4px_rgba(96,40,217,0.06)]'
      }`}>
        {/* Hero Image if genuine and verified */}
        {hasValidImage ? (
          <div className="relative h-[180px] sm:h-[210px] w-full overflow-hidden bg-slate-900 group">
            <img
              src={data.heroImage}
              alt={data.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Subtle gradient overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

            {/* Title & Subtitle at bottom of hero */}
            <div className="absolute bottom-3.5 sm:bottom-4 left-3.5 sm:left-4 right-3.5 sm:right-4 z-10 text-white">
              <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight drop-shadow-sm">
                {data.title}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-white/85 font-normal drop-shadow-sm">
                {data.subtitle}
              </p>
            </div>
          </div>
        ) : (
          /* Clean, modern, brand header card when no authentic image exists */
          <div className={`p-4 sm:p-5 border-b ${
            isDark
              ? 'bg-gradient-to-br from-[#1E1B4B] to-[#161027] border-[#3B286B]'
              : 'bg-gradient-to-br from-[#FAF9FF] to-[#F3E8FF]/50 border-[#E8E5F3]'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold font-heading tracking-tight ${
                  isDark ? 'text-white' : 'text-[#1E293B]'
                }`}>
                  {data.title}
                </h2>
                <p className={`text-[12.5px] mt-0.5 font-medium ${
                  isDark ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'
                }`}>
                  {data.subtitle}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center font-bold text-base shrink-0 shadow-xs border border-[#9333EA]/20">
                {data.title.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Pill Nav Tabs */}
        <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-none ${
          isDark ? 'border-[#3B286B]' : 'border-[#F1EFF9]'
        }`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-3.5 py-1 rounded-full text-[12px] sm:text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#9333EA] text-white shadow-[0_2px_8px_rgba(147,51,234,0.35)]'
                    : isDark
                      ? 'text-[#C4B5FD] hover:bg-white/10 hover:text-white'
                      : 'text-[#475569] hover:bg-[#F5F3FF] hover:text-[#171329]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {/* Description */}
          <p className={`text-[13px] sm:text-[13.5px] leading-relaxed ${
            isDark ? 'text-[#C4B5FD]/90' : 'text-[#475569]'
          }`}>
            {data.description}
          </p>

          {/* Key Facts / Attribute Cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {data.attributes.map((attr, idx) => (
              <div
                key={idx}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                  isDark
                    ? 'bg-[#161027]/70 border-[#3B286B]/60 hover:border-[#A855F7]/50'
                    : 'bg-[#FAF9FF] border-[#E8E5F3] hover:border-[#C4B5FD]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {renderIcon(attr.icon)}
                  <span className="truncate">{attr.label}</span>
                </div>
                <div className={`text-[12.5px] sm:text-[13px] font-semibold leading-tight ${
                  isDark ? 'text-white' : 'text-[#1E293B]'
                }`}>
                  {attr.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Images Section ONLY if genuine related images exist */}
      {data.relatedImages && data.relatedImages.length > 0 && (
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-[15px] sm:text-[16px] font-bold font-heading ${isDark ? 'text-white' : 'text-[#171329]'}`}>
              Verified Media
            </h3>
            {onViewMoreImages && (
              <button 
                onClick={onViewMoreImages}
                className={`flex items-center gap-1 text-[12px] sm:text-[12.5px] font-medium hover:underline cursor-pointer ${
                  isDark ? 'text-[#C084FC] hover:text-[#E879F9]' : 'text-[#7C3AED] hover:text-[#9333EA]'
                }`}
              >
                <span>View more</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {data.relatedImages.slice(0, 2).map((img, i) => (
              <div
                key={i}
                className={`h-[110px] rounded-xl overflow-hidden border group cursor-pointer relative ${
                  isDark ? 'border-[#3B286B]' : 'border-[#E8E5F3]'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.title || 'Related image'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
