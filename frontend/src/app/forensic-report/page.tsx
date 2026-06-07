'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ForensicReportContent() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        setReport(JSON.parse(decodeURIComponent(data)));
      } catch (e) {
        console.error('Invalid report data', e);
      }
    }
  }, [searchParams]);

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm">Loading forensic report...</p>
      </div>
    );
  }

  const accessTime = report.timestamp
    ? new Date(report.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'long',
        timeStyle: 'medium',
      })
    : 'Unknown';

  const platformIcons: Record<string, string> = {
    'WhatsApp': '📱',
    'Telegram': '✈️',
    'Email': '📧',
    'Website/Link': '🌐',
    'Social Media (Facebook/Instagram)': '📲',
    'Twitter/X': '🐦',
    'YouTube': '▶️',
    'USB / Physical Copy': '💾',
    'Other App/Platform': '📦',
  };

  const platformIcon = report.leakPlatform
    ? platformIcons[report.leakPlatform] || '📡'
    : '❓';

  const platformKnown =
    report.leakPlatform && report.leakPlatform !== 'Not specified';

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-3 pb-6 border-b border-white/5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest">
            🔴 CLASSIFIED — FORENSIC INVESTIGATION REPORT
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Exam<span className="text-red-400">Shield</span>
            <span className="text-slate-400 font-normal text-xl ml-3">Leak Trace Result</span>
          </h1>
          <p className="text-xs text-slate-500">
            Trace ID: <span className="font-mono text-slate-300">{report.watermarkId}</span>
            &nbsp;·&nbsp;
            Generated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>

        {/* ── LEAK SOURCE PLATFORM — MAIN HIGHLIGHT ── */}
        {platformKnown && (
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-6 flex items-center gap-5">
            <div className="text-5xl">{platformIcon}</div>
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-1">
                Leak Source Platform
              </p>
              <p className="text-2xl font-black text-amber-200">
                {report.leakPlatform}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                This is where the leaked paper was found / reported.
              </p>
            </div>
          </div>
        )}

        {/* ── RESPONSIBLE PERSON ── */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 space-y-4">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest">
            👤 Accused Person
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-xl font-black text-red-300">
              {report.user?.name?.substring(0, 2).toUpperCase() || '??'}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{report.user?.name || 'Unknown'}</p>
              <p className="text-sm text-red-300 font-mono">{report.user?.email || 'unknown'}</p>
            </div>
          </div>
        </div>

        {/* ── EXAM CENTER & EXAM DETAILS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              🏫 Exam Center
            </h2>
            <p className="text-sm font-bold text-white">{report.center?.name}</p>
            <p className="text-xs font-mono text-indigo-400">{report.center?.code}</p>
            <p className="text-xs text-slate-400">{report.center?.location}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 space-y-3">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              📄 Exam Paper
            </h2>
            <p className="text-sm font-bold text-white">{report.exam?.name || 'N/A'}</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                <span className="text-slate-500">Access Time (IST):</span>
              </p>
              <p className="text-xs font-mono text-emerald-400">{accessTime}</p>
            </div>
            <p className="text-xs font-mono text-slate-500">
              IP: {report.ipAddress || 'N/A'}
            </p>
          </div>
        </div>

        {/* ── VERDICT ── */}
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-center space-y-2">
          <p className="text-xs text-red-400 uppercase tracking-widest font-bold">⚠️ Forensic Verdict</p>
          <p className="text-sm text-red-200 leading-relaxed">
            The watermark <span className="font-mono font-bold text-white">{report.watermarkId}</span> embedded in the leaked document was
            generated exclusively when <span className="font-bold text-white">{report.user?.name}</span> at{' '}
            <span className="font-bold text-white">{report.center?.name}</span> accessed this paper.
            {platformKnown && (
              <> The paper was found on <span className="font-bold text-amber-300">{report.leakPlatform}</span>.</>
            )}
          </p>
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            🖨️ Print / Save Report
          </button>
          <button
            onClick={() => window.close()}
            className="px-6 py-2.5 bg-red-700/30 hover:bg-red-700/50 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            ✕ Close Window
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 pb-4">
          This report was generated by ExamShield — Secure Exam Distribution &amp; Leak Traceability Platform.
          For official use only. Do not share without authorization.
        </p>
      </div>
    </main>
  );
}

export default function ForensicReportPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    }>
      <ForensicReportContent />
    </Suspense>
  );
}
