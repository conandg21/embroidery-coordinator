import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Chat from './pages/Chat';
import ActivityLog from './pages/ActivityLog';
import Users from './pages/Users';
import Customers from './pages/Customers';

const can = {
  manageUsers:  (role) => role === 'admin',
  viewActivity: (role) => ['admin', 'manager'].includes(role),
  viewCustomers:(role) => ['admin', 'manager', 'production_tech'].includes(role),
};

const ROLE_LABELS = {
  admin: 'Admin', manager: 'Manager',
  digitizer: 'Digitizer', production_tech: 'Production Tech',
};

function ProtectedRoute({ children, check }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (check && !check(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />;
}

function NavLink({ to, icon, label, onClick }) {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <Link to={to} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
        ${active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const close = onClose || (() => {});
  return (
    <div className="flex flex-col h-full p-4 gap-1">
      <div className="flex items-center gap-2 px-3 py-3 mb-3">
        <span className="text-2xl">🧵</span>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-none">Embroidery</p>
          <p className="text-xs text-gray-500">Production Coordinator</p>
        </div>
        {/* Close button — mobile only */}
        <button onClick={close} className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
      </div>

      <NavLink to="/"          icon="📊" label="Dashboard"    onClick={close} />
      <NavLink to="/orders"    icon="📋" label="Orders"       onClick={close} />
      {can.viewCustomers(role) && <NavLink to="/customers" icon="👥" label="Customers" onClick={close} />}
      <NavLink to="/chat"      icon="💬" label="Team Chat"    onClick={close} />
      {can.viewActivity(role)  && <NavLink to="/activity"  icon="📝" label="Activity Log" onClick={close} />}
      {can.manageUsers(role)   && <NavLink to="/users"     icon="⚙️" label="Manage Users" onClick={close} />}

      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
        </div>
        <button onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-gray-200 fixed h-full z-10">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <div className="relative w-72 bg-white h-full shadow-xl z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100">
            <div className="space-y-1.5">
              <div className="w-5 h-0.5 bg-current" />
              <div className="w-5 h-0.5 bg-current" />
              <div className="w-5 h-0.5 bg-current" />
            </div>
          </button>
          <span className="text-lg">🧵</span>
          <span className="font-semibold text-gray-900 text-sm">Embroidery Coordinator</span>
        </div>

        <main className="flex-1 p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><Layout><OrderDetail /></Layout></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute check={can.viewCustomers}><Layout><Customers /></Layout></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute check={can.viewActivity}><Layout><ActivityLog /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute check={can.manageUsers}><Layout><Users /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
