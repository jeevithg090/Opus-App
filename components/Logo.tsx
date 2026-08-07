
import React from 'react';

export const OpusLogo: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ size = 'md', className = "" }) => {
  const dimensions = {
    sm: 'text-lg px-2 py-1',
    md: 'text-3xl px-4 py-2',
    lg: 'text-5xl px-6 py-4'
  };

  return (
    <div className={`flex items-center gap-2 font-black tracking-tighter italic select-none bg-teal-600 text-white rounded-xl shadow-lg border-b-4 border-teal-800 ${className} ${dimensions[size]}`}>
      OPUS
    </div>
  );
};

export const OpusTextLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <OpusLogo size="md" className={className} />
);
