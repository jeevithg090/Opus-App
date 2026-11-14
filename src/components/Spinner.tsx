import React from 'react';

const Spinner: React.FC<{ label?: string; className?: string }> = ({ label = 'Loading', className = '' }) => (
  <div role="status" aria-live="polite" className={`flex items-center justify-center ${className}`}>
    <div
      className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600/20 border-t-teal-600"
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </div>
);

export default Spinner;
