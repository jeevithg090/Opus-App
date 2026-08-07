
import React from 'react';
import { ShieldAlert, Clock, User, Activity, Search, ArrowLeft, Shield } from 'lucide-react';
import { AuditEntry } from '../types';

interface AuditTrailProps {
  logs: AuditEntry[];
  onBack?: () => void;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ logs, onBack }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 px-4 pb-24 lg:pb-10">
      <div className="space-y-4">
        {onBack && (
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-xs font-bold text-teal-600 hover:text-slate-900 transition-colors group py-2"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Workspace
          </button>
        )}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Audit Trail</h1>
            <p className="text-slate-500 text-sm mt-1">Immutable record of all clinical data interactions.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} className="text-teal-500" />
            System Integrity Verified
          </div>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Filter clinical audit logs..."
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm font-medium shadow-sm"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mobile-optimized Card List */}
      <div className="block md:hidden space-y-4">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400"><User size={14} /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{log.userName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{log.userId.slice(-8)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 justify-end">
                    <Clock size={12} className="text-teal-600" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tight">{log.action}</p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{log.details}</p>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">ID: {log.targetId}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-100">
            <ShieldAlert size={32} className="mx-auto text-slate-200" />
            <p className="text-sm font-bold text-slate-400">Registry Empty</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Identity</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Action</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Context</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-teal-600 group-hover:border-teal-100 transition-colors"><User size={14} /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">{log.userName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1">{log.userId.slice(-8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tight">{log.action}</p>
                      <p className="text-xs text-slate-500 leading-tight font-medium max-w-xs truncate">{log.details}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">{log.targetId}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Clock size={12} className="text-teal-600" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
