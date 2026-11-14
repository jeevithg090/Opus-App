import React from 'react';
import { LayoutDashboard, Upload, Library, LogOut, Trash2, ShieldAlert, type LucideIcon } from 'lucide-react';
import { OpusLogo } from './Logo';
import type { ViewId } from './navigation';

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
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onLogout, deletedCount }) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'upload', label: 'Patient Intake', shortLabel: 'Intake', icon: Upload },
    { id: 'research', label: 'Study Groups', shortLabel: 'Groups', icon: Library },
    { id: 'audit', label: 'Audit Logs', shortLabel: 'Audit', icon: ShieldAlert },
    { id: 'recycle', label: 'Archive', shortLabel: 'Archive', icon: Trash2, count: deletedCount },
  ];

  return (
    <>
      {/* Mobile bottom dock */}
      <nav
        aria-label="Primary"
        className="fixed bottom-4 left-4 right-4 z-[400] flex items-center justify-around rounded-2xl border border-slate-200 bg-white/95 px-1 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 shadow-lg backdrop-blur-md lg:hidden"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-all ${active ? 'text-teal-600' : 'text-slate-500'}`}
            >
              <item.icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="truncate text-[11px] font-medium">{item.shortLabel}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-teal-600 px-0.5 text-[10px] font-bold text-white">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-slate-100 px-8">
          <OpusLogo size="sm" />
        </div>

        <nav aria-label="Primary" className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-8">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`group flex w-full items-center justify-between rounded-lg px-4 py-3 transition-all ${active ? 'bg-teal-50 font-semibold text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    size={20}
                    aria-hidden="true"
                    className={active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}
                  />
                  <span className="text-sm">{item.label}</span>
                </span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {item.count}
                    <span className="sr-only"> archived records</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={20} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
