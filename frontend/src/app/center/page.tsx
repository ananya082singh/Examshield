'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, clearSession } from '../../utils/api';
import CountdownTimer from '../../components/CountdownTimer';

export default function CenterDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data State
  const [exams, setExams] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalAssignedPapers: 0, unlockedPapers: 0, lockedPapers: 0, expiredPapers: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPaperId, setDownloadingPaperId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'CENTER_ADMIN') {
      clearSession();
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadCenterData();
  }, []);

  const loadCenterData = async () => {
    setError('');
    try {
      // Fetch exams assigned to this center (handled by backend listExams filtering based on JWT payload)
      const examsData = await api.get('/exams');
      setExams(examsData);
      
      // Fetch dashboard metrics and local logs
      const dashboardData = await api.get('/dashboard');
      setStats(dashboardData.stats);
      setLogs(dashboardData.logs);
    } catch (err: any) {
      setError(err.message || 'Failed to load center exam schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const handleDownloadPaper = async (paperId: string, examName: string) => {
    setDownloadingPaperId(paperId);
    setError('');

    try {
      // Call download API which returns a raw Blob (PDF file)
      const blob = await api.download(`/papers/${paperId}/download`);
      
      // Create Object URL from memory blob
      const fileURL = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger browser inline viewer / print dialog
      const link = document.createElement('a');
      link.href = fileURL;
      link.target = '_blank';
      // Alternatively, trigger direct save file download:
      // link.download = `${examName.replace(/\s+/g, '_')}_QuestionPaper.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reload dashboard logs to show download audit
      loadCenterData();
    } catch (err: any) {
      setError(err.message || 'Failed to decrypt and retrieve exam paper.');
    } finally {
      setDownloadingPaperId(null);
    }
  };

  // Check if current time is within exam window
  const getExamStatus = (startTimeStr: string, endTimeStr: string) => {
    const now = new Date();
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    if (now < start) {
      return 'LOCKED';
    } else if (now > end) {
      return 'EXPIRED';
    } else {
      return 'ACTIVE';
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
          <p className="text-slate-400 text-sm">Verifying Center Credentials...</p>
        </div>
      </div>
    );
  }

  const center = currentUser.center || { name: 'Assigned Center', code: 'UNASSIGNED', location: 'Unknown' };

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
            <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-xl glow-amber text-center space-y-1.5">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">🏛️ Center Node</span>
              <p className="text-xs font-semibold text-slate-100">{center.name}</p>
              <p className="text-[10px] text-indigo-400 font-mono font-bold">Code: {center.code}</p>
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
              <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
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
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Center Admin Panel</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse-glow"></span>
            <span className="text-xs text-slate-400">Node Status: Secure Connection</span>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Warning Banner */}
          <div className="bg-red-500/[0.03] border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-red-400 block font-semibold mb-1 uppercase tracking-wider">⚠️ Security and Audit Alert</strong>
              All document requests are decrypted dynamically and cryptographically watermarked with your center profile and admin credentials. Attempting to copy, print, or leak this paper will embed trace metadata, making you personally accountable.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Assigned Papers</div>
              <div className="text-2xl font-extrabold text-white mt-1.5 font-mono">{stats.totalAssignedPapers}</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Unlocked Papers</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1.5 font-mono">{stats.unlockedPapers}</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Locked Papers</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1.5 font-mono">{stats.lockedPapers}</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Expired Windows</div>
              <div className="text-2xl font-extrabold text-slate-500 mt-1.5 font-mono">{stats.expiredPapers}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1 & 2: Assigned Papers List */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">📄 Authorized Examination Papers</h3>
                <button
                  onClick={loadCenterData}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  🔄 Sync Schedule
                </button>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No exam papers assigned to this center.
                </div>
              ) : (
                <div className="space-y-4">
                  {exams.map(exam => {
                    const paper = exam.papers[0]; // Center admin only sees exams that HAVE papers
                    if (!paper) return null;

                    const status = getExamStatus(exam.startTime, exam.endTime);

                    return (
                      <div
                        key={exam.id}
                        className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-sm">{exam.name}</h4>
                          <p className="text-xs text-slate-400">
                            Exam Date: {new Date(exam.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            Decryption Window: {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-2 shrink-0">
                          {/* Status and Countdown */}
                          <div>
                            {status === 'LOCKED' && (
                              <CountdownTimer targetDate={exam.startTime} onComplete={loadCenterData} />
                            )}
                            {status === 'ACTIVE' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse-glow">
                                ● Available for Decryption
                              </span>
                            )}
                            {status === 'EXPIRED' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700/50">
                                ✖ Locked: Window Expired
                              </span>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleDownloadPaper(paper.id, exam.name)}
                            disabled={status !== 'ACTIVE' || downloadingPaperId === paper.id}
                            className={`w-full md:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              status === 'ACTIVE'
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                                : 'bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {downloadingPaperId === paper.id ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Decrypting...
                              </>
                            ) : (
                              '🔓 View/Print Paper'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 3: Recent Activity / Logs for this user */}
            <div className="glass-card rounded-2xl p-6 h-fit">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">🔒 Center Audit Trail</h3>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No recent actions recorded.</div>
              ) : (
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {logs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg text-xs space-y-1 hover:border-slate-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${
                          log.action === 'PAPER_DOWNLOADED' ? 'text-indigo-400' : 'text-slate-300'
                        }`}>
                          {log.action === 'PAPER_DOWNLOADED' ? '🔓 Paper Decrypted' : log.action.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-slate-550 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 truncate">
                        {log.details && log.details.startsWith('{')
                          ? `Trace ID: ${JSON.parse(log.details).watermarkId}`
                          : log.details}
                      </p>
                      <div className="text-[9px] text-slate-600 font-mono">
                        IP: {log.ipAddress || '127.0.0.1'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
