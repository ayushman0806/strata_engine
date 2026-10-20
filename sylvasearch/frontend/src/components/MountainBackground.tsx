import React from 'react';

interface MountainBackgroundProps {
  variant?: 'full' | 'subtle';
  isDark?: boolean;
}

export const MountainBackground: React.FC<MountainBackgroundProps> = ({
  variant = 'full',
  isDark = false
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
      {/* 1. High-fidelity cinematic mountain nebula graphic */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
          variant === 'subtle' 
            ? isDark ? 'opacity-30 mix-blend-screen scale-100' : 'opacity-25 mix-blend-multiply scale-100' 
            : isDark ? 'opacity-65 mix-blend-screen scale-100' : 'opacity-85 scale-100'
        }`}
        style={{
          backgroundImage: `url('/assets/strata-nebula-mountain.jpg')`,
          backgroundPosition: 'center 45%',
        }}
      />

      {/* 2. Soft atmospheric haze & readability gradient scrims */}
      <div 
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark 
            ? 'bg-gradient-to-b from-[#0F0A1A]/70 via-[#0F0A1A]/50 to-[#0F0A1A]/90' 
            : 'bg-gradient-to-b from-[#FAF9FF]/60 via-[#FAF9FF]/30 to-[#FAF9FF]/80'
        }`} 
      />

      {/* 3. Subtle cosmic radial glow around the central UI area */}
      <div 
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 50% 45%, rgba(168, 85, 247, 0.15) 0%, transparent 60%)'
            : 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.75) 0%, rgba(250, 249, 255, 0.4) 40%, transparent 80%)'
        }}
      />

      {/* 4. Bottom edge blending for seamless scrolling and footer placement */}
      <div className={`absolute bottom-0 inset-x-0 h-40 transition-colors ${
        isDark 
          ? 'bg-gradient-to-t from-[#0F0A1A] via-[#0F0A1A]/70 to-transparent' 
          : 'bg-gradient-to-t from-[#FAF9FF] via-[#FAF9FF]/80 to-transparent'
      }`} />
    </div>
  );
};
