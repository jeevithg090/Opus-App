import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  /** Optional supporting text under the title. */
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional element rendered next to the title. */
  icon?: React.ReactNode;
  /** Prevents closing via Escape/backdrop while an action is in flight. */
  busy?: boolean;
}

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' } as const;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: labelled, traps keyboard focus, closes on Escape or backdrop
 * click, focuses the first field on open and returns focus to the trigger on close.
 * Renders as a bottom sheet on phones and a centred card on larger screens.
 */
const Modal: React.FC<ModalProps> = ({ title, description, onClose, children, size = 'md', icon, busy = false }) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>('input, textarea, select');
    (firstField ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Portalled to <body> so ancestors with transforms/animations never clip or reposition the dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex animate-fade-in items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`max-h-[92dvh] w-full ${SIZES[size]} animate-rise-in overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-raised outline-none sm:rounded-3xl sm:pb-8 md:p-8`}
      >
        <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-ink">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-ink-3">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="-mr-2 -mt-1 rounded-lg p-2 text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
