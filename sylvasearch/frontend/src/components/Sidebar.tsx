import React from 'react';
import { 
  Globe, 
  Image, 
  Video, 
  Newspaper, 
  ShoppingBag, 
  MapPin, 
  MoreHorizontal,
  Quote,
  X
} from 'lucide-react';
import { SIDEBAR_NAV } from '../data/searchData';
import type { SidebarNavItem } from '../types';

export interface SidebarProps {
  activeTab: string;
  onTabSelect: (tabId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isDark?: boolean;
  navItems?: SidebarNavItem[];
  showPhilosophyQuote?: boolean;
  customQuote?: {
    quote: string;
    author: string;
    subtext: string;
  };
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  isOpen = true,
  onClose,
  isDark = false,
  navItems = SIDEBAR_NAV,
  showPhilosophyQuote = true,
  customQuote = {
    quote: '“Explore more than results.”',
    author: 'Strata',
    subtext: 'Search beyond surfaces'
  },
  className = ''
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe className="w-4 h-4 shrink-0" />;
      case 'image':
        return <Image className="w-4 h-4 shrink-0" />;
      case 'video':
        return <Video className="w-4 h-4 shrink-0" />;
      case 'news':
        return <Newspaper className="w-4 h-4 shrink-0" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 shrink-0" />;
      case 'map':
        return <MapPin className="w-4 h-4 shrink-0" />;
      default:
        return <MoreHorizontal className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container (Responsive Drawer on Mobile, Column on Desktop) */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-6rem)] z-50 lg:z-10 w-[260px] lg:w-[210px] shrink-0 flex flex-col justify-between py-5 lg:py-2 px-4 lg:px-0 lg:pr-4 transition-all duration-300 ease-in-out ${
          isDark
            ? 'bg-[#0F0A1A] lg:bg-transparent border-r lg:border-r-0 border-[#3B286B]/60'
            : 'bg-[#FAF9FF] lg:bg-transparent border-r lg:border-r-0 border-[#E8E5F3]'
        } ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:hidden opacity-0 lg:opacity-100'
        } ${className}`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex lg:hidden items-center justify-between pb-4 mb-2 border-b border-[#E8E5F3]/50 dark:border-[#3B286B]/50">
          <span className="font-heading font-bold text-base">Navigation</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#171329] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="space-y-1.5 overflow-y-auto scrollbar-none flex-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabSelect(item.id);
                  if (onClose) onClose(); // Auto close drawer on mobile after selection
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#3B286B]/80 text-[#C4B5FD] font-semibold shadow-sm border border-[#A855F7]/40'
                      : 'bg-gradient-to-r from-[#F3E8FF] to-[#FAF5FF] text-[#6028D9] font-semibold shadow-sm border border-[#E9D5FF]/60'
                    : isDark
                      ? 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                      : 'text-[#475569] hover:text-[#171329] hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? (isDark ? 'text-[#C084FC]' : 'text-[#7C3AED]') : (isDark ? 'text-[#94A3B8]' : 'text-[#64748B]')}>
                    {getIcon(item.icon)}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#9333EA]/10 text-[#9333EA] font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Brand Philosophy Quote Card (Configurable & Production Scalable) */}
        {showPhilosophyQuote && (
          <div className="mt-6 pt-2">
            <div
              className={`relative rounded-2xl overflow-hidden p-4 sm:p-5 transition-colors ${
                isDark
                  ? 'bg-[#1E1B4B]/80 border border-[#3B286B] text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]'
                  : 'glass-panel border border-white/80 shadow-[0_10px_25px_-5px_rgba(96,40,217,0.08)]'
              }`}
            >
              <div className="text-[#9333EA] opacity-80 mb-2">
                <Quote className="w-5 h-5 stroke-[2.2]" />
              </div>

              <blockquote className={`text-[13.5px] font-semibold leading-snug ${isDark ? 'text-white' : 'text-[#171329]'}`}>
                {customQuote.quote}
              </blockquote>

              <div className={`mt-3.5 pt-2.5 border-t flex flex-col ${isDark ? 'border-[#3B286B]' : 'border-[#E8E5F3]/60'}`}>
                <span className={`text-[11.5px] font-bold ${isDark ? 'text-white' : 'text-[#171329]'}`}>
                  {customQuote.author}
                </span>
                <span className={`text-[10px] tracking-wide ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  {customQuote.subtext}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
