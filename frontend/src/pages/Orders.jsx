import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_CONFIG = {
  intake:       { label: 'Intake',       color: 'bg-blue-100 text-blue-800' },
  digitization: { label: 'Digitization', color: 'bg-purple-100 text-purple-800' },
  production:   { label: 'Production',   color: 'bg-orange-100 text-orange-800' },
  qa:           { label: 'QA',           color: 'bg-yellow-100 text-yellow-800' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-800' },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-600' },
};
const PRIORITY_CONFIG = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  normal: 'bg-gray-100 text-gray-600',
  low:    'bg-blue-50 text-blue-600',
};

function NewOrderModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '', customer_id: '', description: '', priority: 'normal',
    due_date: '', assigned_to: '', garment_type: '', quantity: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/customers'), api.get('/users')]).then(([c, u]) => {
      setCustomers(c.data);
      setUsers(u.data);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/orders', { ...form, quantity: parseInt(form.quantity) || 1 });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Logo for Blue Polo Shirts" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select className="input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                <option value="">-- None --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">-- Unassigned --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Garment Type</label>
              <input className="input" value={form.garment_type} onChange={e => set('garment_type', e.target.value)} placeholder="e.g. Polo, Hat, Jacket" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Any additional details..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await api.get(`/orders?${params}`);
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm">{total} total</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Order</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input w-64" placeholder="Search orders, customers…"
          value={search}
          onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('search', e.target.value); return n; })} />
        <div className="flex gap-1 flex-wrap">
          {['', 'intake', 'digitization', 'production', 'qa', 'completed', 'cancelled'].map(s => (
            <button key={s}
              onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); s ? n.set('status', s) : n.delete('status'); return n; })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${status === s && s !== '' ? 'bg-brand-600 text-white' : !s && !status ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s ? STATUS_CONFIG[s]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Order #', 'Title', 'Customer', 'Status', 'Priority', 'Assigned', 'Due Date', 'Files'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.order_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{order.title}</td>
                  <td className="px-4 py-3 text-gray-600">{order.customer_name || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_CONFIG[order.status]?.color}`}>{STATUS_CONFIG[order.status]?.label || order.status}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${PRIORITY_CONFIG[order.priority]}`}>{order.priority}</span></td>
                  <td className="px-4 py-3 text-gray-600">{order.assigned_to_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{order.due_date ? new Date(order.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{order.file_count > 0 ? `📎 ${order.file_count}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">📋</p><p>No orders found</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
            className="card p-4 cursor-pointer active:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{order.title}</p>
                <p className="font-mono text-xs text-gray-400 mt-0.5">{order.order_number}</p>
              </div>
              <span className={`badge flex-shrink-0 ${STATUS_CONFIG[order.status]?.color}`}>
                {STATUS_CONFIG[order.status]?.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
              {order.customer_name && <span>👤 {order.customer_name}</span>}
              {order.assigned_to_name && <span>🔧 {order.assigned_to_name}</span>}
              {order.due_date && <span>📅 {new Date(order.due_date).toLocaleDateString()}</span>}
              {order.file_count > 0 && <span>📎 {order.file_count} files</span>}
              {order.priority !== 'normal' && (
                <span className={`badge ${PRIORITY_CONFIG[order.priority]}`}>{order.priority}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} onCreated={() => loadOrders()} />}
    </div>
  );
}
