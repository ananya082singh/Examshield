'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, clearSession } from '../../utils/api';
import AuditLogsTable from '../../components/AuditLogsTable';
import AlertLogsTable from '../../components/AlertLogsTable';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'centers' | 'users' | 'forensics'>('overview');
  
  // Dashboard Data State
  const [stats, setStats] = useState<any>({ totalExams: 0, totalCenters: 0, activeAlerts: 0, totalUsers: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms State
  const [centerForm, setCenterForm] = useState({ name: '', code: '', location: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CENTER_ADMIN', centerId: '' });
  const [centerMessage, setCenterMessage] = useState({ type: '', text: '' });
  const [userMessage, setUserMessage] = useState({ type: '', text: '' });

  // Forensics State
  const [manualId, setManualId] = useState('');
  const [leakedFile, setLeakedFile] = useState<File | null>(null);
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [forensicLoading, setForensicLoading] = useState(false);
  const [forensicError, setForensicError] = useState('');
  const [leakPlatform, setLeakPlatform] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth and Data Fetching
  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      clearSession();
      router.push('/');
      return;
    }
    setCurrentUser(user);
    fetchDashboardData();
    fetchCenters();
    fetchUsers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await api.get('/dashboard');
      setStats(data.stats);
      setAlerts(data.alerts);
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const data = await api.get('/auth/centers');
      setCenters(data);
    } catch (err) {
      console.error('Failed to fetch centers', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get('/auth/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await api.put(`/dashboard/alerts/${id}/resolve`, {});
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCenterMessage({ type: '', text: '' });
    try {
      await api.post('/auth/centers', centerForm);
      setCenterMessage({ type: 'success', text: 'Exam Center created successfully!' });
      setCenterForm({ name: '', code: '', location: '' });
      fetchCenters();
      fetchDashboardData();
    } catch (err: any) {
      setCenterMessage({ type: 'error', text: err.message || 'Failed to create center' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMessage({ type: '', text: '' });
    
    // Validate center selection if CENTER_ADMIN
    if (userForm.role === 'CENTER_ADMIN' && !userForm.centerId) {
      setUserMessage({ type: 'error', text: 'Center Admin must be linked to a center' });
      return;
    }

    try {
      const body = {
        ...userForm,
        centerId: userForm.role === 'CENTER_ADMIN' ? userForm.centerId : null
      };
      await api.post('/auth/users', body);
      setUserMessage({ type: 'success', text: 'User account created successfully!' });
      setUserForm({ name: '', email: '', password: '', role: 'CENTER_ADMIN', centerId: '' });
      fetchUsers();
      fetchDashboardData();
    } catch (err: any) {
      setUserMessage({ type: 'error', text: err.message || 'Failed to create user' });
    }
  };

  const handleRunForensics = async (e: React.FormEvent) => {
    e.preventDefault();
    setForensicLoading(true);
    setForensicError('');
    setForensicResult(null);

    try {
      const formData = new FormData();
      if (leakedFile) {
        formData.append('file', leakedFile);
      } else if (manualId) {
        formData.append('manualWatermarkId', manualId);
      } else {
        throw new Error('Please upload a file or enter a Watermark Trace ID.');
      }
      if (leakPlatform) {
        formData.append('leakPlatform', leakPlatform);
      }

      const report = await api.post('/forensic/scan', formData);
      setForensicResult(report);
      fetchDashboardData();

      // Open the dedicated forensic report in a NEW WINDOW
      if (report.found) {
        const encoded = encodeURIComponent(JSON.stringify(report));
        window.open(`/forensic-report?data=${encoded}`, '_blank', 'width=900,height=780,scrollbars=yes,resizable=yes');
      }
    } catch (err: any) {
      setForensicError(err.message || 'Forensic analysis failed.');
    } finally {
      setForensicLoading(false);
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
          <p className="text-slate-400 text-sm">Loading Secure Command Console...</p>
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

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 glow-indigo'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              📊 System Overview
            </button>
            <button
              onClick={() => setActiveTab('centers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'centers'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 glow-indigo'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              🏫 Exam Centers
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 glow-indigo'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              👥 User Management
            </button>
            <button
              onClick={() => setActiveTab('forensics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'forensics'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 glow-indigo'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              🔎 Leak Forensics
            </button>
          </nav>
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
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            {activeTab === 'overview' && 'System Overview'}
            {activeTab === 'centers' && 'Manage Exam Centers'}
            {activeTab === 'users' && 'Provision User Roles'}
            {activeTab === 'forensics' && 'Leak Forensics Investigation'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse-glow"></span>
            <span className="text-xs text-slate-400">Node Status: Secure Connection</span>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Exams</div>
                  <div className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.totalExams}</div>
                </div>
                <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Centers</div>
                  <div className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.totalCenters}</div>
                </div>
                <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Authorized Users</div>
                  <div className="text-3xl font-extrabold text-white mt-2 font-mono">{stats.totalUsers}</div>
                </div>
                <div className={`glass-card rounded-2xl p-5 relative overflow-hidden border-2 ${stats.activeAlerts > 0 ? 'border-red-500/20 glow-red animate-pulse-glow' : 'border-white/5'}`}>
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Security Flags</div>
                  <div className={`text-3xl font-extrabold mt-2 font-mono ${stats.activeAlerts > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {stats.activeAlerts}
                  </div>
                </div>
              </div>

              {/* Grid Logs / Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Audit Logs */}
                <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">🔒 Live System Audit logs</h3>
                    <button
                      onClick={fetchDashboardData}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      🔄 Refresh Logs
                    </button>
                  </div>
                  <AuditLogsTable logs={logs} />
                </div>

                {/* Suspicious Alerts */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">🚨 Suspicious Activity Feeds</h3>
                  <AlertLogsTable alerts={alerts} onResolve={handleResolveAlert} showResolveButton={true} />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CENTERS */}
          {activeTab === 'centers' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Card */}
              <div className="glass-card rounded-2xl p-6 h-fit">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">➕ Create Exam Center</h3>
                {centerMessage.text && (
                  <div className={`p-3 rounded-lg text-xs mb-4 ${centerMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
                    {centerMessage.text}
                  </div>
                )}
                <form onSubmit={handleCreateCenter} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Center Name</label>
                    <input
                      type="text"
                      required
                      value={centerForm.name}
                      onChange={e => setCenterForm({ ...centerForm, name: e.target.value })}
                      placeholder="e.g. IIIT Naya Raipur Centre A"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Unique Center Code</label>
                    <input
                      type="text"
                      required
                      value={centerForm.code}
                      onChange={e => setCenterForm({ ...centerForm, code: e.target.value })}
                      placeholder="e.g. NHS-782"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Physical Location</label>
                    <textarea
                      required
                      value={centerForm.location}
                      onChange={e => setCenterForm({ ...centerForm, location: e.target.value })}
                      placeholder="Building, street details..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                  >
                    Register Center
                  </button>
                </form>
              </div>

              {/* Table Card */}
              <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">🏫 Registered Exam Centers</h3>
                {centers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No exam centers registered.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Center Code</th>
                          <th className="py-3 px-4">Center Name</th>
                          <th className="py-3 px-4">Physical Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-350">
                        {centers.map(center => (
                          <tr key={center.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">{center.code}</td>
                            <td className="py-3 px-4 font-semibold text-slate-100">{center.name}</td>
                            <td className="py-3 px-4 max-w-[200px] truncate" title={center.location}>{center.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Card */}
              <div className="glass-card rounded-2xl p-6 h-fit">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">➕ Add User Account</h3>
                {userMessage.text && (
                  <div className={`p-3 rounded-lg text-xs mb-4 ${userMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
                    {userMessage.text}
                  </div>
                )}
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Institutional Email</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="e.g. principal@school.ac.in"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Access Password</label>
                    <input
                      type="password"
                      required
                      value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Role Type</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="CENTER_ADMIN">Center Admin (NHS, WCE, etc)</option>
                      <option value="EXAM_CONTROLLER">Exam Controller (Uploads/Scheduling)</option>
                      <option value="SUPER_ADMIN">System Super Admin</option>
                    </select>
                  </div>
                  {userForm.role === 'CENTER_ADMIN' && (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Exam Center Association</label>
                      <select
                        required
                        value={userForm.centerId}
                        onChange={e => setUserForm({ ...userForm, centerId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Center --</option>
                        {centers.map(center => (
                          <option key={center.id} value={center.id}>{center.name} ({center.code})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                  >
                    Provision User
                  </button>
                </form>
              </div>

              {/* Table Card */}
              <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">👥 Registered Security Accounts</h3>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No user accounts registered.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">System Role</th>
                          <th className="py-3 px-4">Associated Center</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-350">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-4 font-semibold text-slate-100">{user.name}</td>
                            <td className="py-3 px-4 font-mono">{user.email}</td>
                            <td className="py-3 px-4">
                              {user.role === 'SUPER_ADMIN' && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Admin</span>}
                              {user.role === 'EXAM_CONTROLLER' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Controller</span>}
                              {user.role === 'CENTER_ADMIN' && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">Center Admin</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {user.center ? `${user.center.name} (${user.center.code})` : 'N/A (Institution-wide)'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FORENSICS */}
          {activeTab === 'forensics' && (
            <div className="space-y-8">
              {/* Investigation Input Form */}
              <div className="glass-card rounded-2xl p-8 max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-red-500/10 rounded-xl border border-red-500/20 glow-red mb-3">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-base uppercase tracking-wider">Execute Forensic Trace</h3>
                  <p className="text-slate-400 text-xs mt-1">Trace leaked documents back to the origin downloading account and exam center.</p>
                </div>

                <form onSubmit={handleRunForensics} className="space-y-6">

                  {/* Step 1: Where was it found? */}
                  <div className="p-5 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Step 1: Where did you find the leaked paper?</h4>
                    <p className="text-[10px] text-slate-500 mb-3">This is recorded in the investigation report to track which platforms are being used to distribute leaked papers.</p>
                    <select
                      value={leakPlatform}
                      onChange={e => setLeakPlatform(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- Select leak source platform --</option>
                      <option value="WhatsApp">📱 WhatsApp (message / group / status)</option>
                      <option value="Telegram">✈️ Telegram (channel / group / bot)</option>
                      <option value="Email">📧 Email (forwarded attachment)</option>
                      <option value="Website/Link">🌐 Website / Link shared online</option>
                      <option value="Social Media (Facebook/Instagram)">📲 Social Media (Facebook / Instagram)</option>
                      <option value="Twitter/X">🐦 Twitter / X</option>
                      <option value="YouTube">▶️ YouTube (video / reel showing paper)</option>
                      <option value="USB / Physical Copy">💾 USB / Printed Physical Copy</option>
                      <option value="Other App/Platform">📦 Other App / Platform</option>
                    </select>
                  </div>

                  {/* Step 2: Identify the PDF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Method A: Upload PDF */}
                    <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Method A: Upload Leaked PDF</h4>
                        <p className="text-[10px] text-slate-500 mb-4">If you have the actual PDF file (e.g. downloaded from Telegram / WhatsApp), upload it here. The system will automatically extract the hidden Trace ID from its metadata.</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".pdf"
                          ref={fileInputRef}
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setLeakedFile(file);
                              setManualId('');
                              
                              // Smart auto-detection based on filename keywords
                              const name = file.name.toLowerCase();
                              let detected = 'Telegram'; // Default smart guess
                              if (name.includes('whatsapp') || name.includes('wa')) {
                                detected = 'WhatsApp';
                              } else if (name.includes('telegram') || name.includes('tg')) {
                                detected = 'Telegram';
                              } else if (name.includes('mail') || name.includes('email') || name.includes('gmail') || name.includes('outlook')) {
                                detected = 'Email';
                              } else if (name.includes('facebook') || name.includes('instagram') || name.includes('fb') || name.includes('ig') || name.includes('social')) {
                                detected = 'Social Media (Facebook/Instagram)';
                              } else if (name.includes('twitter') || name.includes('x.com')) {
                                detected = 'Twitter/X';
                              } else if (name.includes('usb') || name.includes('physical') || name.includes('drive')) {
                                detected = 'USB / Physical Copy';
                              } else if (name.includes('web') || name.includes('link') || name.includes('http')) {
                                detected = 'Website/Link';
                              }
                              setLeakPlatform(detected);
                            }
                          }}
                          className="hidden"
                        />
                        {leakedFile ? (
                          <div className="space-y-2 mb-2">
                            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                              <span className="text-xs text-indigo-400 truncate max-w-[200px]">{leakedFile.name}</span>
                              <button
                                type="button"
                                onClick={() => { setLeakedFile(null); setLeakPlatform(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="text-[10px] text-red-400 font-bold hover:text-red-300 cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                            {leakPlatform && (
                              <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                                <span>✨ Leak Platform Auto-detected:</span>
                                <span className="bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">{leakPlatform}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-medium cursor-pointer transition-all flex flex-col items-center gap-1.5"
                          >
                            <span>📂 Click to select leaked PDF</span>
                            <span className="text-[9px] text-slate-600">(Downloaded from WhatsApp / Telegram / Email)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Method B: Manual Trace ID */}
                    <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Method B: Enter Visible Trace ID</h4>
                        <p className="text-[10px] text-slate-500 mb-4">If the paper was leaked as a photo/screenshot, look for the small red text at the bottom of the page reading "ExamShield Trace ID: ES-XXXXXXXX" and enter it below.</p>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={manualId}
                          onChange={e => {
                            setManualId(e.target.value.toUpperCase());
                            setLeakedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          placeholder="E.G. ES-A92B104F"
                          className="w-full px-3 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono uppercase text-sm focus:ring-1 focus:ring-red-500 text-center tracking-widest"
                        />
                      </div>
                    </div>
                  </div>

                  {forensicError && (
                    <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-start gap-2">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{forensicError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forensicLoading || (!leakedFile && !manualId)}
                    className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
                  >
                    {forensicLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Scanning PDF metadata & binary structure...
                      </>
                    ) : (
                      '🔍 Trace Leak Source Now'
                    )}
                  </button>
                </form>
              </div>

              {/* Investigation Results Report */}
              {forensicResult && (
                <div className="glass-card rounded-2xl p-8 max-w-4xl mx-auto border-red-500/20 glow-red animate-pulse-glow">
                  <div className="border-b border-white/5 pb-4 mb-6 flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Forensic Report</span>
                      <h3 className="font-bold text-white text-base mt-1.5 uppercase tracking-wide">Trace Results: Leak Identified</h3>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-500">
                      Trace Token: {forensicResult.watermarkId}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-350">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Responsible Center</span>
                        <span className="text-slate-100 font-bold text-sm block mt-0.5">{forensicResult.center.name}</span>
                        <span className="text-indigo-400 font-mono font-bold mt-1 block">Code: {forensicResult.center.code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Physical Location</span>
                        <span className="text-slate-200 block mt-0.5">{forensicResult.center.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Exam Paper Scope</span>
                        <span className="text-slate-200 block mt-0.5 font-semibold">
                          {forensicResult.exam ? `${forensicResult.exam.name} (ID: ${forensicResult.exam.id.substring(0, 8)}...)` : 'Unknown Exam'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Accessing Account</span>
                        <span className="text-slate-100 font-bold text-sm block mt-0.5">{forensicResult.user.name}</span>
                        <span className="text-slate-400 font-mono block mt-0.5">{forensicResult.user.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Decryption / Download Time (IST)</span>
                        <span className="text-slate-200 block mt-0.5 font-mono">
                          {new Date(forensicResult.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Client IP Address</span>
                        <span className="text-slate-200 block mt-0.5 font-mono">IP: {forensicResult.ipAddress || 'N/A'}</span>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5 max-w-[300px]" title={forensicResult.userAgent}>Browser: {forensicResult.userAgent?.substring(0, 60)}...</span>
                      </div>
                    </div>
                  </div>

                  {forensicResult.leakPlatform && forensicResult.leakPlatform !== 'Not specified' && (
                    <div className="mt-4 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-center gap-3">
                      <span className="text-xl">📡</span>
                      <div>
                        <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-bold">Leak Platform / Channel</span>
                        <span className="text-sm text-amber-200 font-semibold">{forensicResult.leakPlatform}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                    <span className="text-xs text-red-300 font-medium">
                      ⚠️ Trace confirms this PDF copy was generated exclusively for the user above. This constitutes evidence of unauthorized distribution.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
