
import React, { useState } from 'react';
import { 
  Search, Plus, User, Calendar, X, ChevronRight, 
  FileText, Image as ImageIcon, Video, Music, Clock, Zap
} from 'lucide-react';
import { Patient, SurgeryEvent, MediaEntry, MediaType } from '../types';

interface DashboardProps {
  patients: Patient[];
  studyGroups: any[];
  media: MediaEntry[];
  onAddPatient: (patient: Patient) => void;
  onSelectPatient: (patient: Patient) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ patients, onAddPatient, onSelectPatient, media }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    uhid: '', name: '', ageYears: 0, ageMonths: 0, gender: 'Male', diagnosis: '', primarySurgeon: 'Dr. Alexander Smith', studyGroupIds: [], dateOfSurgery: ''
  });

  const filtered = patients.filter(p => 
    p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPOD = (patient: Patient) => {
    if (!patient.surgeries || patient.surgeries.length === 0) return null;
    const latestDateStr = patient.surgeries.reduce((latest, surg) => {
      return new Date(surg.date) > new Date(latest) ? surg.date : latest;
    }, patient.surgeries[0].date);
    
    const surgDate = new Date(latestDateStr);
    const today = new Date();
    const diffTime = today.getTime() - surgDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  };

  const recentClinicalLife = [
    ...media.map(m => ({ type: 'media', item: m, date: m.uploadedAt })),
    ...patients.flatMap(p => p.surgeries.filter(s => s.otNotes).map(s => ({ 
      type: 'notes', 
      item: { ...s, uhid: p.uhid, name: p.name }, 
      date: s.date 
    })))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.uhid || !newPatient.name) return;
    const surgeries: SurgeryEvent[] = newPatient.dateOfSurgery ? [{
      id: `surg_${Date.now()}`, title: 'Primary Surgery', date: newPatient.dateOfSurgery
    }] : [];

    setIsSubmitting(true);
    try {
      await onAddPatient({
        ...newPatient as Patient,
        createdAt: new Date().toISOString().split('T')[0],
        surgeries
      });
      setShowModal(false);
      setNewPatient({ uhid: '', name: '', ageYears: 0, ageMonths: 0, gender: 'Male', diagnosis: '', primarySurgeon: 'Dr. Alexander Smith', studyGroupIds: [], dateOfSurgery: '' });
    } catch (err) {
      console.error('Failed to add patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-12 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Patient Registry</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Manage clinical records and surgical media</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 font-medium text-sm"
        >
          <Plus size={18} />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by name or UHID..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Recent Activity */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock size={12} /> Recent Activity
        </h2>
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
          {recentClinicalLife.map((entry, idx) => (
            <div key={idx} className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative hover:border-teal-200 transition-all cursor-pointer">
              {entry.type === 'media' ? (
                <>
                  <img src={entry.item.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3">
                    <p className="text-white text-[10px] font-mono font-medium truncate">{entry.item.uhid}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full p-4 flex flex-col justify-between bg-slate-50">
                  <FileText size={16} className="text-teal-600" />
                  <p className="text-[11px] text-slate-600 line-clamp-4 leading-relaxed italic">"{entry.item.otNotes}"</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight truncate">{entry.item.name}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filtered.map(p => {
          const pod = getPOD(p);
          return (
            <div 
              key={p.uhid} 
              onClick={() => onSelectPatient(p)} 
              className="group bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-100 transition-all cursor-pointer flex flex-col gap-3 md:gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                  <User size={24} />
                </div>
                {pod !== null && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">POD {pod}</span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {p.name}
                </h3>
                <p className="text-slate-400 font-mono text-[11px] mt-1">{p.uhid}</p>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{p.diagnosis}</p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-2">
                <div className="flex -space-x-2">
                  {p.studyGroupIds.slice(0, 3).map(id => (
                    <div key={id} className="w-6 h-6 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-teal-700 uppercase" title={id}>
                      {id.charAt(0)}
                    </div>
                  ))}
                  {p.studyGroupIds.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                      +{p.studyGroupIds.length - 3}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 sm:duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">New Patient Enrollment</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] md:text-xs font-semibold text-slate-500 ml-1">UHID Identifier</label>
                  <input required placeholder="e.g. HOSP-2025-001" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" value={newPatient.uhid} onChange={e => setNewPatient({...newPatient, uhid: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] md:text-xs font-semibold text-slate-500 ml-1">Patient Name</label>
                  <input required placeholder="Full legal name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs font-semibold text-slate-500 ml-1">Clinical Diagnosis</label>
                <textarea required placeholder="Brief clinical findings..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 md:h-32 resize-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" value={newPatient.diagnosis} onChange={e => setNewPatient({...newPatient, diagnosis: e.target.value})} />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 md:py-4 rounded-xl transition-all active:scale-[0.98] shadow-sm text-sm disabled:opacity-50">
                {isSubmitting ? 'Adding...' : 'Complete Enrollment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
