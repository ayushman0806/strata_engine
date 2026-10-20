import React from 'react';

interface StrataLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textSize?: string;
  isDark?: boolean;
}

export const StrataLogo: React.FC<StrataLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textSize,
  isDark = false
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32 md:w-36 md:h-36',
  }[size];

  const defaultTextSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl md:text-6xl',
  }[size];

  const logoSrc = isDark ? '/assets/strata.png' : '/assets/strata_white.png';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official 3D sculpted ribbon S emblem */}
      <div className={`relative ${iconDimensions} shrink-0 flex items-center justify-center`}>
        <img
          src={logoSrc}
          alt="Strata Emblem"
          className="w-full h-full object-contain filter drop-shadow-[0_6px_20px_rgba(168,85,247,0.3)] transition-transform duration-300 hover:scale-105"
        />
      </div>

      {showText && (
        <span
          className={`font-heading font-bold tracking-tight transition-colors ${
            isDark ? 'text-white' : 'text-[#171329]'
          } ${textSize || defaultTextSize}`}
        >
          Strata
        </span>
      )}
    </div>
  );
};
