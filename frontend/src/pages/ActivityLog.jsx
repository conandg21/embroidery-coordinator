import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const ACTION_ICONS = {
  LOGIN: '🔑', LOGOUT: '👋',
  CREATE_ORDER: '📋', UPDATE_ORDER: '✏️', DELETE_ORDER: '🗑️', CHANGE_ORDER_STATUS: '🔄',
  UPLOAD_FILES: '📎', DOWNLOAD_FILE: '⬇️', DELETE_FILE: '🗑️',
  CREATE_USER: '👤', UPDATE_USER: '✏️', RESET_PASSWORD: '🔐', CHANGE_PASSWORD: '🔐',
  CREATE_CUSTOMER: '👥', UPDATE_CUSTOMER: '✏️',
};

export default function ActivityLog() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (action) params.set('action', action);
      const res = await api.get(`/activity?${params}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, action]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-500 text-sm">{isAdmin ? 'All team activity' : 'Your activity'} · {total} entries</p>
      </div>

      <div className="flex gap-3">
        <select className="input w-48" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="LOGIN">Logins</option>
          <option value="CREATE_ORDER">Orders Created</option>
          <option value="CHANGE_ORDER_STATUS">Status Changes</option>
          <option value="UPLOAD_FILES">File Uploads</option>
          <option value="DOWNLOAD_FILE">File Downloads</option>
          <option value="CREATE_USER">Users Created</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">📝</p>
            <p>No activity found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Time', 'User', 'Action', 'Order', 'Details'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.user_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span>{ACTION_ICONS[log.action] || '📌'}</span>
                        <span className="text-gray-700">{log.action.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.order_number ? (
                        <div>
                          <p className="font-mono text-xs text-brand-600">{log.order_number}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[160px]">{log.order_title}</p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {log.details ? (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1">← Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs py-1">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
