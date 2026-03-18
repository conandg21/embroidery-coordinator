import { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

function CustomerModal({ customer, onClose, onSaved }) {
  const isEdit = !!customer?.id;
  const [form, setForm] = useState({
    name: customer?.name || '', email: customer?.email || '',
    phone: customer?.phone || '', company: customer?.company || '', notes: customer?.notes || '',
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
        await api.put(`/customers/${customer.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input className="input" value={form.company} onChange={e => set('company', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const loadCustomers = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/customers${params}`);
      setCustomers(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(loadCustomers, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadCustomers(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">{customers.length} customers</p>
        </div>
        <button onClick={() => setModal({ type: 'new' })} className="btn-primary">+ New Customer</button>
      </div>

      <input className="input w-72" placeholder="Search customers…" value={search}
        onChange={e => setSearch(e.target.value)} />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p>No customers found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Company', 'Email', 'Phone', 'Orders', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/orders?search=${encodeURIComponent(c.name)}`}
                      className="text-brand-600 hover:underline text-xs">
                      {c.order_count} orders
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal({ type: 'edit', customer: c })}
                      className="text-xs text-brand-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'new' && <CustomerModal onClose={() => setModal(null)} onSaved={loadCustomers} />}
      {modal?.type === 'edit' && <CustomerModal customer={modal.customer} onClose={() => setModal(null)} onSaved={loadCustomers} />}
    </div>
  );
}
