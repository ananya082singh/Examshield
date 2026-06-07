'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, clearSession } from '../../utils/api';

export default function ControllerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data State
  const [exams, setExams] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam Form State
  const [examForm, setExamForm] = useState({ name: '', date: '', startTime: '', endTime: '' });
  const [examMessage, setExamMessage] = useState({ type: '', text: '' });

  // Paper Upload State
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== 'EXAM_CONTROLLER' && user.role !== 'SUPER_ADMIN')) {
      clearSession();
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const examsData = await api.get('/exams');
      const centersData = await api.get('/auth/centers');
      setExams(examsData);
      setCenters(centersData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamMessage({ type: '', text: '' });

    // Validate times
    const start = new Date(`${examForm.date}T${examForm.startTime}`);
    const end = new Date(`${examForm.date}T${examForm.endTime}`);

    if (start >= end) {
      setExamMessage({ type: 'error', text: 'Start time must be before end time' });
      return;
    }

    try {
      await api.post('/exams', {
        name: examForm.name,
        date: new Date(examForm.date),
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      setExamMessage({ type: 'success', text: 'Exam scheduled successfully!' });
      setExamForm({ name: '', date: '', startTime: '', endTime: '' });
      loadAllData();
    } catch (err: any) {
      setExamMessage({ type: 'error', text: err.message || 'Failed to create exam' });
    }
  };

  const handleCenterCheckboxChange = (centerId: string) => {
    if (selectedCenterIds.includes(centerId)) {
      setSelectedCenterIds(selectedCenterIds.filter(id => id !== centerId));
    } else {
      setSelectedCenterIds([...selectedCenterIds, centerId]);
    }
  };

  const handleUploadPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage({ type: '', text: '' });
    
    if (!selectedExamId) {
      setUploadMessage({ type: 'error', text: 'Please select an exam' });
      return;
    }
    if (!uploadFile) {
      setUploadMessage({ type: 'error', text: 'Please choose a PDF question paper' });
      return;
    }
    if (selectedCenterIds.length === 0) {
      setUploadMessage({ type: 'error', text: 'Please assign at least one center' });
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('examId', selectedExamId);
      formData.append('centerIds', JSON.stringify(selectedCenterIds));
      formData.append('file', uploadFile);

      await api.post('/papers/upload', formData);
      
      setUploadMessage({ type: 'success', text: 'Paper encrypted and uploaded successfully!' });
      // Reset upload fields
      setSelectedExamId('');
      setSelectedCenterIds([]);
      setUploadFile(null);
      loadAllData();
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Failed to upload paper' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will permanently delete the associated encrypted paper and assignments.')) {
      return;
    }

    try {
      await api.delete(`/exams/${id}`);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam');
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-400 text-sm">Opening Exam Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="font-bold text-white text-lg tracking-wide text-glow">
              Exam<span className="text-indigo-400 font-semibold">Shield</span>
            </span>
          </div>

          <div className="p-6">
            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl glow-indigo text-center space-y-2">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Controller Scope</span>
              <p className="text-[11px] text-slate-300">Provision exam papers, configure encryption schemes, and assign test centers.</p>
            </div>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-red-400 hover:text-red-300 font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            ❌ Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-8">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Exam Control Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse-glow"></span>
            <span className="text-xs text-slate-400">Node Status: Secure Connection</span>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1 & 2: Exams List */}
            <div className="lg:col-span-2 space-y-8">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">📅 Scheduled Examination Windows</h3>
                  <button
                    onClick={loadAllData}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    🔄 Refresh Data
                  </button>
                </div>

                {exams.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No exams scheduled. Use the form on the right to create an exam.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exams.map(exam => {
                      const hasPaper = exam.papers.length > 0;
                      return (
                        <div
                          key={exam.id}
                          className="p-4 bg-slate-950/40 border border-slate-800 hover:border-slate-750 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <h4 className="font-bold text-white text-sm">{exam.name}</h4>
                              {hasPaper ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                                  🔒 Encrypted Paper Loaded
                                </span>
                              ) : (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 animate-pulse">
                                  ⚠️ Paper Missing
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-450 font-mono">
                              Date: {new Date(exam.date).toLocaleDateString('en-IN')} &nbsp;|&nbsp;
                              Window: {new Date(exam.startTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} &ndash; {new Date(exam.endTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST
                            </p>
                            {hasPaper && (
                              <div className="pt-2">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Assigned Distribution Centers:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {exam.papers[0].assignments.map((a: any) => (
                                    <span key={a.id} className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[9px] font-mono">
                                      🏛️ {a.center.name} ({a.center.code})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <button
                              onClick={() => handleDeleteExam(exam.id)}
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 hover:border-red-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                            >
                              Delete Window
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Actions (Create Exam, Upload Paper) */}
            <div className="space-y-8">
              {/* Form 1: Create Exam */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">➕ Create Exam Window</h3>
                {examMessage.text && (
                  <div className={`p-3 rounded-lg text-xs mb-4 ${examMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
                    {examMessage.text}
                  </div>
                )}
                <form onSubmit={handleCreateExam} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Exam Name</label>
                    <input
                      type="text"
                      required
                      value={examForm.name}
                      onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                      placeholder="e.g. Advanced Cybersecurity Finals"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Exam Date</label>
                    <input
                      type="date"
                      required
                      value={examForm.date}
                      onChange={e => setExamForm({ ...examForm, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Start Time</label>
                      <input
                        type="time"
                        required
                        value={examForm.startTime}
                        onChange={e => setExamForm({ ...examForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">End Time</label>
                      <input
                        type="time"
                        required
                        value={examForm.endTime}
                        onChange={e => setExamForm({ ...examForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                  >
                    Schedule Exam Window
                  </button>
                </form>
              </div>

              {/* Form 2: Upload Secure Paper */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">🔒 Secure Paper Provision</h3>
                {uploadMessage.text && (
                  <div className={`p-3 rounded-lg text-xs mb-4 ${uploadMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
                    {uploadMessage.text}
                  </div>
                )}
                <form onSubmit={handleUploadPaper} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Select Exam Target</label>
                    <select
                      required
                      value={selectedExamId}
                      onChange={e => setSelectedExamId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose Exam Window --</option>
                      {exams.filter(exam => exam.papers.length === 0).map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Select Question Paper (PDF)</label>
                    <input
                      type="file"
                      required
                      accept=".pdf"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Authorize Exam Centers</label>
                    {centers.length === 0 ? (
                      <p className="text-[10px] text-slate-500">No centers available. Please register centers first.</p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-800 bg-slate-950 p-2.5 rounded-lg">
                        {centers.map(center => (
                          <label key={center.id} className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer hover:text-white">
                            <input
                              type="checkbox"
                              checked={selectedCenterIds.includes(center.id)}
                              onChange={() => handleCenterCheckboxChange(center.id)}
                              className="accent-indigo-500 rounded cursor-pointer"
                            />
                            <span>{center.name} ({center.code})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={uploadLoading || !selectedExamId || !uploadFile}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2"
                  >
                    {uploadLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Encrypting PDF...
                      </>
                    ) : (
                      '🔐 Encrypt & Authorize'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
