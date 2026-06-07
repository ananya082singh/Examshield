'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSession, getUser } from '../utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    const user = getUser();
    if (user) {
      redirectUser(user.role);
    }
  }, []);

  const redirectUser = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      router.push('/admin');
    } else if (role === 'EXAM_CONTROLLER') {
      router.push('/controller');
    } else if (role === 'CENTER_ADMIN') {
      router.push('/center');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.post('/auth/login', { email, password });
      setSession(data.token, data.user);
      redirectUser(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerQuickLogin = async (quickEmail: string, quickPass: string) => {
    setLoading(true);
    setError('');
    setEmail(quickEmail);
    setPassword(quickPass);

    try {
      const data = await api.post('/auth/login', { email: quickEmail, password: quickPass });
      setSession(data.token, data.user);
      redirectUser(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glowing Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 glow-indigo mb-4 animate-pulse-glow">
            <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl text-glow">
            Exam<span className="text-indigo-400">Shield</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Secure Paper Distribution & Leak Traceability Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In to Dashboard</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Authorized Email
              </label>
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Security Password
              </label>
              <input
                id="password"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying Credentials...
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider text-center">
              Quick Security Logins
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => triggerQuickLogin('admin@examshield.ac.in', 'Admin@123')}
                disabled={loading}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-indigo-300">⚙️ Super Admin</p>
                <p className="text-[9px] text-slate-500 font-mono truncate">admin@examshield.ac.in</p>
              </button>
              
              <button
                type="button"
                onClick={() => triggerQuickLogin('controller@iiit-nr.ac.in', 'Ctrl@2026')}
                disabled={loading}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-emerald-300">📡 Controller</p>
                <p className="text-[9px] text-slate-500 font-mono truncate">controller@iiit-nr.ac.in</p>
              </button>

              <button
                type="button"
                onClick={() => triggerQuickLogin('center-admin@iiit-nr.ac.in', 'CAdm@2026')}
                disabled={loading}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-amber-300">🏫 Center Admin 1</p>
                <p className="text-[9px] text-slate-500 font-mono truncate">IIIT Naya Raipur</p>
              </button>

              <button
                type="button"
                onClick={() => triggerQuickLogin('center-admin2@iiit-nr.ac.in', 'CAdm2@2026')}
                disabled={loading}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-rose-300">🏫 Center Admin 2</p>
                <p className="text-[9px] text-slate-500 font-mono truncate">GEC Raipur</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
