import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  className = '',
  ringColor,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const displayName = name || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isEmerald = displayName.toLowerCase().includes('n') || displayName.toLowerCase().includes('me');
  const fallbackBg = isEmerald 
    ? 'from-emerald-500/30 to-teal-700/40 text-emerald-300 border-emerald-500/40' 
    : 'from-purple-500/30 to-indigo-700/40 text-purple-300 border-purple-500/40';

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={displayName}
        onError={() => setImageError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0 ${ringColor ? `ring-1 ${ringColor}` : ''} ${className}`}
      />
    );
  }

  return (
    <div
      title={displayName}
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${fallbackBg} border flex items-center justify-center font-bold tracking-tight shrink-0 select-none ${ringColor ? `ring-1 ${ringColor}` : ''} ${className}`}
    >
      <span>{initials || 'U'}</span>
    </div>
  );
};
