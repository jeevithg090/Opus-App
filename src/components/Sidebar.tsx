import React from 'react';
import { LayoutDashboard, Upload, Library, LogOut, Archive, ShieldCheck, type LucideIcon } from 'lucide-react';
import { OpusLogo } from './Logo';
import type { ViewId } from './navigation';
import type { AuthUser } from '../types';
import { initials } from '../lib/clinical';

interface NavItem {
  id: ViewId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  count?: number;
}

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onLogout: () => void;
  deletedCount: number;
  user: AuthUser;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onLogout, deletedCount, user }) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Patient Registry', shortLabel: 'Patients', icon: LayoutDashboard },
    { id: 'upload', label: 'Patient Intake', shortLabel: 'Intake', icon: Upload },
    { id: 'research', label: 'Study Groups', shortLabel: 'Groups', icon: Library },
    { id: 'audit', label: 'Audit Trail', shortLabel: 'Audit', icon: ShieldCheck },
    { id: 'recycle', label: 'Archive', shortLabel: 'Archive', icon: Archive, count: deletedCount },
  ];

  return (
    <>
      {/* Mobile bottom dock */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-[400] flex items-stretch justify-around rounded-2xl border border-line bg-surface/95 px-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-1 shadow-raised backdrop-blur-md lg:hidden"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.count ? `${item.label} (${item.count})` : item.label}
              className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors ${active ? 'bg-brand-soft text-brand-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              <item.icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              <span className="truncate text-[11px] font-semibold">{item.shortLabel}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-[18%] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-surface bg-brand px-0.5 text-[10px] font-bold text-white"
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-dvh w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-[72px] items-center border-b border-line px-6">
          <OpusLogo size="sm" />
          <span className="ml-3 text-xs font-medium leading-tight text-ink-3">
            Operative Photo
            <br />
            Unite &amp; Storage
          </span>
        </div>

        <nav aria-label="Primary" className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Workspace</p>
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'bg-brand-soft font-semibold text-brand-ink' : 'font-medium text-ink-2 hover:bg-surface-3 hover:text-ink'}`}
              >
                {active && (
                  <span
                    className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-brand-accent"
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-center gap-3">
                  <item.icon
                    size={19}
                    aria-hidden="true"
                    className={active ? 'text-brand-ink' : 'text-ink-4 group-hover:text-ink-2'}
                  />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-brand text-white' : 'bg-surface-3 text-ink-3'}`}
                  >
                    {item.count}
                    <span className="sr-only"> archived records</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft-2 text-sm font-bold text-brand-ink"
            >
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-xs text-ink-3">{user.role}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-danger-soft hover:text-danger-ink"
          >
            <LogOut size={19} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
