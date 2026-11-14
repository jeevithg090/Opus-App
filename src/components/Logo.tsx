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
    role="img"
    aria-label="OPUS"
    className={`inline-flex select-none items-center rounded-xl border-b-4 border-brand-hover bg-brand font-black italic leading-none tracking-tighter text-white shadow-card ${SIZES[size]} ${className}`}
  >
    <span aria-hidden="true">OPUS</span>
  </div>
);
