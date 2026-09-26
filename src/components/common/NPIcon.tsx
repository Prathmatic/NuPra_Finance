import React from 'react';

interface NPIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

export const NPIcon: React.FC<NPIconProps> = ({ 
  size = 'md', 
  className = '',
  showGlow = true 
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-[13px]',
    lg: 'w-14 h-14 text-[18px]',
    xl: 'w-20 h-20 text-[26px]',
  };

  const roundedMap = {
    sm: 'rounded-xl',
    md: 'rounded-[14px]',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Outer subtle glow */}
      {showGlow && (
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-indigo-500/20 rounded-2xl blur-md -z-10 pointer-events-none transition-all" 
        />
      )}

      {/* Outer border container with refined gradient */}
      <div 
        className={`${sizeMap[size]} p-[1.5px] bg-gradient-to-br from-emerald-400/60 via-teal-500/30 to-indigo-500/60 ${roundedMap[size]} shadow-lg shadow-black/40 flex items-center justify-center`}
      >
        {/* Inner dark slate pill */}
        <div 
          className={`w-full h-full bg-slate-950/95 border border-white/10 ${roundedMap[size]} flex items-center justify-center relative overflow-hidden`}
        >
          {/* Subtle metallic diagonal sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          
          {/* Geometric Monogram "NP" */}
          <div className="flex items-center tracking-tighter font-black font-sans text-white">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              N
            </span>
            <span className="bg-gradient-to-b from-emerald-300 via-teal-300 to-indigo-300 bg-clip-text text-transparent -ml-[1px]">
              P
            </span>
          </div>

          {/* Micro status jewel indicator */}
          <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-emerald-400 opacity-80" />
        </div>
      </div>
    </div>
  );
};
