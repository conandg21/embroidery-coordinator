import { useState, useEffect } from 'react';
import api from '../api';

const ROLES = ['admin', 'manager', 'digitizer', 'production_tech'];
const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  digitizer: 'Digitizer',
  production_tech: 'Production Tech',
};
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  digitizer: 'bg-purple-100 text-purple-700',
  production_tech: 'bg-orange-100 text-orange-700',
};

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '',
    role: user?.role || 'staff', password: '', is_active: user?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/users/${user.id}`, { name: form.name, email: form.email, role: form.role, is_active: form.is_active });
      } else {
        if (!form.password || form.password.length < 8) throw new Error('Password must be at least 8 characters');
        await api.post('/users', { name: form.name, email: form.email, role: form.role, password: form.password });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" className="input" value={form.password}
                onChange={e => set('password', e.target.value)} required minLength={8}
                placeholder="Minimum 8 characters" />
            </div>
          )}
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-brand-600" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Account active</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user.id}/reset-password`, { newPassword: password });
      setDone(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Reset Password — {user.name}</h2>
        {done ? (
          <div className="text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-700 mb-4">Password reset successfully!</p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8}
                placeholder="Minimum 8 characters" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                {saving ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { type: 'edit'|'new'|'reset', user? }

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-500 text-sm">{users.length} users total</p>
        </div>
        <button onClick={() => setModal({ type: 'new' })} className="btn-primary">+ New User</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', user: u })}
                        className="text-xs text-brand-600 hover:underline">Edit</button>
                      <button onClick={() => setModal({ type: 'reset', user: u })}
                        className="text-xs text-gray-500 hover:underline">Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'new' && (
        <UserModal onClose={() => setModal(null)} onSaved={loadUsers} />
      )}
      {modal?.type === 'edit' && (
        <UserModal user={modal.user} onClose={() => setModal(null)} onSaved={loadUsers} />
      )}
      {modal?.type === 'reset' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
