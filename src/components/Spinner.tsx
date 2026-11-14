import React from 'react';

interface SpinnerProps {
  label?: string;
  /** Shows the label under the spinner instead of only announcing it to screen readers. */
  showLabel?: boolean;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ label = 'Loading', showLabel = false, className = '' }) => (
  <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
    <div
      className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-accent/20 border-t-brand-accent"
      aria-hidden="true"
    />
    <span className={showLabel ? 'text-sm font-medium text-ink-3' : 'sr-only'}>{label}</span>
  </div>
);

export default Spinner;
