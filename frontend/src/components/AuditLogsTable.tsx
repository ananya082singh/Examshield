'use client';

interface UserDetail {
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  timestamp: string;
  user?: UserDetail | null;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
}

export default function AuditLogsTable({ logs }: AuditLogsTableProps) {
  
  // Format action string into a readable label and badge color
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">Login Success</span>;
      case 'LOGIN_FAILED':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">Login Failed</span>;
      case 'PAPER_UPLOADED':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">Paper Uploaded</span>;
      case 'PAPER_DOWNLOADED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">Decrypted & Open</span>;
      case 'UNAUTHORIZED_ACCESS':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase animate-pulse">Blocked Access</span>;
      case 'FORENSIC_INVESTIGATION':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">Forensic Trace</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-750 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">{action.replace('_', ' ')}</span>;
    }
  };

  const parseDevice = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Mobi')) return '📱 Mobile';
    if (userAgent.includes('Chrome')) return '🌐 Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return '🌐 Safari';
    if (userAgent.includes('Firefox')) return '🌐 Firefox';
    return '🖥️ Desktop';
  };

  const formatDetails = (details: string | null) => {
    if (!details) return '';
    try {
      // If details is JSON string (like for paper downloads)
      const parsed = JSON.parse(details);
      if (parsed.watermarkId) {
        return `Watermark: ${parsed.watermarkId} (${parsed.centerCode})`;
      }
      return details;
    } catch (e) {
      return details;
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No audit log activities found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="py-3.5 px-4">Timestamp</th>
            <th className="py-3.5 px-4">User / Scope</th>
            <th className="py-3.5 px-4">Event</th>
            <th className="py-3.5 px-4">Details</th>
            <th className="py-3.5 px-4">IP Address</th>
            <th className="py-3.5 px-4">Client</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-xs text-slate-300">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-3.5 px-4 font-mono text-slate-400">
                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </td>
              <td className="py-3.5 px-4">
                <div className="font-semibold text-slate-200">
                  {log.user ? log.user.name : (log.userId ? 'Deleted User' : 'System/Guest')}
                </div>
                <div className="text-[10px] text-slate-500">
                  {log.user ? log.user.email : (log.userId ? '' : 'External request')}
                </div>
              </td>
              <td className="py-3.5 px-4">
                {getActionBadge(log.action)}
              </td>
              <td className="py-3.5 px-4 font-medium text-slate-200 max-w-[200px] truncate" title={log.details || ''}>
                {formatDetails(log.details)}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-400">
                {log.ipAddress || '127.0.0.1'}
              </td>
              <td className="py-3.5 px-4">
                <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]" title={log.userAgent || ''}>
                  {parseDevice(log.userAgent)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
