
import React, { useState } from 'react';
import { ArrowLeft, Plus, UserPlus, Search, Edit3, UserMinus, ShieldCheck, Library, X, ChevronRight } from 'lucide-react';
import { StudyGroup, Patient } from '../types';

interface StudyGroupDetailViewProps {
  group: StudyGroup;
  patients: Patient[];
  onBack: () => void;
  onEditPatient: (p: Patient) => void;
  onEnroll: (uhid: string) => void;
  onUnenroll: (uhid: string) => void;
}

const StudyGroupDetailView: React.FC<StudyGroupDetailViewProps> = ({
  group, patients, onBack, onEditPatient, onEnroll, onUnenroll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const enrolledPatients = patients.filter(p => p.studyGroupIds.includes(group.id));
  const availablePatients = patients.filter(p => !p.studyGroupIds.includes(group.id));

  const filteredEnrolled = enrolledPatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.uhid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 px-4 pb-24 lg:pb-12">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button 
          onClick={onBack} 
          className="text-xs font-bold text-teal-600 hover:text-slate-900 transition-colors flex items-center gap-2 group py-1"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Study Groups
        </button>
        <button 
          onClick={() => { setIsAdding(true); setActionError(null); }} 
          className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all"
        >
          <UserPlus size={18} /> Enroll Patient
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600">
          {actionError}
        </div>
      )}

      {/* Cohort Identity Card */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100"><ShieldCheck size={24} /></div>
               <h1 className="text-3xl font-bold text-slate-900">{group.name}</h1>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-3xl font-medium">{group.description}</p>
          </div>
          <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-5 sm:p-0 rounded-2xl w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end border border-slate-100 sm:border-none">
             <span className="text-4xl font-bold text-teal-600 leading-none">{enrolledPatients.length}</span>
             <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enrolled Patients</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Filter cohort members..."
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm font-medium shadow-sm"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mobile-Native Member List (Card Stack) */}
      <div className="block md:hidden space-y-4">
        {filteredEnrolled.length > 0 ? (
          filteredEnrolled.map(p => (
            <div key={p.uhid} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-teal-400 rounded-xl flex items-center justify-center font-bold text-sm">{p.name.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
                    <p className="text-[12px] font-mono text-slate-400 mt-1">{p.uhid}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEditPatient(p)} className="p-2.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100"><Edit3 size={14} /></button>
                  <button onClick={async () => { setActionError(null); try { await onUnenroll(p.uhid); } catch (err: any) { setActionError(err?.message || 'Failed to remove patient from group.'); } }} className="p-2.5 bg-red-50 text-red-400 rounded-lg border border-red-100"><UserMinus size={14} /></button>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">{p.diagnosis}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center gap-4">
             <Library size={40} className="text-slate-200" />
             <p className="text-sm font-bold text-slate-400">Empty Registry</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200">
                 <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">Patient Identity</th>
                 <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">Surgical Assessment</th>
                 <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredEnrolled.map(p => (
                 <tr key={p.uhid} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-bold text-sm group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">{p.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-[12px] font-mono text-slate-400 mt-1">{p.uhid}</p>
                        </div>
                      </div>
                   </td>
                   <td className="px-8 py-5">
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-xs">{p.diagnosis}</p>
                   </td>
                   <td className="px-8 py-5 text-right space-x-2">
                      <button onClick={() => onEditPatient(p)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={async () => { setActionError(null); try { await onUnenroll(p.uhid); } catch (err: any) { setActionError(err?.message || 'Failed to remove patient from group.'); } }} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm">
                        <UserMinus size={16} />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* Enrollment Registry Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-2">
              <h2 className="text-sm font-bold text-slate-900">Cohort Enrollment</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Candidate selection for unit: <span className="text-teal-600 font-bold">{group.name}</span>.
              </p>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                  {actionError}
                </div>
              )}

              <div className="space-y-2">
                 {availablePatients.length > 0 ? availablePatients.map(p => (
                   <button 
                    key={p.uhid} 
                    onClick={async () => { setActionError(null); try { await onEnroll(p.uhid); setIsAdding(false); } catch (err: any) { setActionError(err?.message || 'Enrollment failed. Please try again.'); } }}
                    className="w-full text-left p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-teal-50 hover:border-teal-200 transition-all flex justify-between items-center group active:scale-[0.98]"
                   >
                     <div className="space-y-0.5">
                       <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{p.name}</p>
                       <p className="text-[12px] font-mono text-slate-400">{p.uhid}</p>
                     </div>
                     <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm group-hover:border-teal-200"><Plus size={18} className="text-slate-300 group-hover:text-teal-600" /></div>
                   </button>
                 )) : (
                   <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
                     <Library size={32} className="text-slate-200" />
                     <p className="text-xs font-bold text-slate-400">No Valid Records</p>
                   </div>
                 )}
              </div>
            </div>
            
            <button onClick={() => setIsAdding(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm active:scale-95 shadow-lg transition-all">Dismiss Selection</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGroupDetailView;
