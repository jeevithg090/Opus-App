import React from 'react';

const SIZES = {
  sm: 'text-lg px-2 py-1',
  md: 'text-3xl px-4 py-2',
  lg: 'text-5xl px-6 py-4',
} as const;

export const OpusLogo: React.FC<{ size?: keyof typeof SIZES; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <div
    className={`flex select-none items-center gap-2 rounded-xl border-b-4 border-teal-800 bg-teal-600 font-black italic tracking-tighter text-white shadow-lg ${SIZES[size]} ${className}`}
    aria-label="OPUS"
  >
    OPUS
  </div>
);
