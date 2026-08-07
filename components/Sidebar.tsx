
import React from 'react';
import { LayoutDashboard, Upload, Library, LogOut, X, Trash2, ShieldAlert } from 'lucide-react';
import { OpusLogo } from './Logo';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  deletedCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, isOpen, setIsOpen, deletedCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Patient Intake', icon: Upload },
    { id: 'research', label: 'Study Groups', icon: Library },
    { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'recycle', label: 'Archive', icon: Trash2, count: deletedCount },
  ];

  return (
    <>
      {/* Mobile Bottom Dock */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-slate-200 z-[400] lg:hidden flex items-center justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] rounded-2xl shadow-lg">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === item.id ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <item.icon size={20} strokeWidth={activeView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <div className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-300 hidden lg:flex`}>
        <div className="h-20 px-8 flex items-center border-b border-slate-100">
          <OpusLogo size="sm" />
        </div>
        
        <div className="flex-1 py-8 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all group ${activeView === item.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={`${activeView === item.id ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeView === item.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
