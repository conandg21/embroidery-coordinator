import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_CONFIG = {
  intake:       { label: 'Intake',       color: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500' },
  digitization: { label: 'Digitization', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  production:   { label: 'Production',   color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  qa:           { label: 'QA',           color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-800',  dot: 'bg-green-500' },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700' },
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-600' },
  low:    { label: 'Low',    color: 'bg-blue-50 text-blue-600' },
};

function StatCard({ label, value, icon, color, to }) {
  const inner = (
    <div className={`card p-5 flex items-center gap-4 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get('/orders/stats/summary'),
          api.get('/orders?limit=8'),
        ]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data.orders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good to see you, {user?.name}!</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Alert Row */}
      {(parseInt(stats?.urgent) > 0 || parseInt(stats?.overdue) > 0) && (
        <div className="flex gap-3 flex-wrap">
          {parseInt(stats?.urgent) > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              🚨 {stats.urgent} urgent order{stats.urgent !== '1' ? 's' : ''} need attention
            </div>
          )}
          {parseInt(stats?.overdue) > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium">
              ⏰ {stats.overdue} order{stats.overdue !== '1' ? 's' : ''} past due date
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Orders" value={stats?.active} icon="📋" color="bg-brand-50" to="/orders" />
        <StatCard label="In Production" value={stats?.production} icon="🧵" color="bg-orange-50" to="/orders?status=production" />
        <StatCard label="Digitization" value={stats?.digitization} icon="💻" color="bg-purple-50" to="/orders?status=digitization" />
        <StatCard label="Completed" value={stats?.completed} icon="✅" color="bg-green-50" to="/orders?status=completed" />
      </div>

      {/* Pipeline */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Production Pipeline</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {['intake', 'digitization', 'production', 'qa', 'completed', 'cancelled'].map(s => (
            <Link key={s} to={`/orders?status=${s}`}
              className="text-center p-3 rounded-xl border border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition-all">
              <p className="text-2xl font-bold text-gray-900">{stats?.[s] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{STATUS_CONFIG[s]?.label || s}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No orders yet. <Link to="/orders" className="text-brand-600 hover:underline">Create one</Link></p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => (
              <Link key={order.id} to={`/orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{order.title}</p>
                    {order.priority !== 'normal' && (
                      <span className={`badge ${PRIORITY_CONFIG[order.priority]?.color}`}>
                        {PRIORITY_CONFIG[order.priority]?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.order_number} {order.customer_name ? `· ${order.customer_name}` : ''}
                    {order.assigned_to_name ? ` · ${order.assigned_to_name}` : ''}
                  </p>
                </div>
                <span className={`badge ${STATUS_CONFIG[order.status]?.color}`}>
                  {STATUS_CONFIG[order.status]?.label || order.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
