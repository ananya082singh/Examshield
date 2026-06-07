'use client';

interface UserDetail {
  name: string;
  email: string;
}

interface Alert {
  id: string;
  type: string;
  userId: string | null;
  message: string;
  resolved: boolean;
  timestamp: string;
  user?: UserDetail | null;
}

interface AlertLogsTableProps {
  alerts: Alert[];
  onResolve: (id: string) => Promise<void>;
  showResolveButton: boolean;
}

export default function AlertLogsTable({ alerts, onResolve, showResolveButton }: AlertLogsTableProps) {
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'SUSPICIOUS_DOWNLOAD_FREQUENCY':
        return (
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 glow-red animate-pulse">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        );
      case 'FAILED_LOGIN_SPIKE':
        return (
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 glow-red animate-pulse">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        );
      case 'NEW_DEVICE_LOGIN':
        return (
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-slate-800 text-slate-400 rounded-lg border border-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'SUSPICIOUS_DOWNLOAD_FREQUENCY':
        return 'Rate Limit Overrun (Multiple Downloads)';
      case 'FAILED_LOGIN_SPIKE':
        return 'Brute Force Alert (Failed Logins)';
      case 'NEW_DEVICE_LOGIN':
        return 'New Client Session (Potential Session Hijack)';
      default:
        return 'Security Flag';
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No active security alerts registered. System status secure.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
            alert.resolved
              ? 'bg-slate-900/20 border-slate-900 text-slate-400 opacity-60'
              : 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20 shadow-[0_4px_20px_-10px_rgba(239,68,68,0.05)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.type)}
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-xs font-semibold ${alert.resolved ? 'text-slate-400' : 'text-red-400'}`}>
                  {getAlertTitle(alert.type)}
                </h4>
                {!alert.resolved && (
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-1">{alert.message}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="font-mono">
                  {new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {alert.user && (
                  <span>
                    • User: <span className="text-slate-400 font-semibold">{alert.user.name}</span>
                  </span>
                )}
                {alert.resolved && (
                  <span className="text-emerald-500/80 font-semibold">✓ Resolved</span>
                )}
              </div>
            </div>
          </div>
          
          {!alert.resolved && showResolveButton && (
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500 text-red-300 hover:text-white rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              Resolve Flag
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
