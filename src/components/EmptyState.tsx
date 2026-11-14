import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Friendly placeholder for lists and panels with nothing to show yet. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center gap-3 px-6 py-14 text-center ${className}`}>
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-4">
      <Icon size={26} aria-hidden="true" />
    </span>
    <p className="text-sm font-semibold text-ink">{title}</p>
    {description && <p className="max-w-sm text-sm text-ink-3">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
