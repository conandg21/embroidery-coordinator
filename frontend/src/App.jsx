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

// Role helpers
const can = {
  manageUsers:  (role) => role === 'admin',
  viewActivity: (role) => ['admin', 'manager'].includes(role),
  viewCustomers:(role) => ['admin', 'manager', 'production_tech'].includes(role),
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

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  digitizer: 'Digitizer',
  production_tech: 'Production Tech',
};

function NavLink({ to, icon, label }) {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <Link to={to} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
      ${active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const role = user?.role;
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col p-4 gap-1 fixed h-full z-10">
        <div className="flex items-center gap-2 px-3 py-3 mb-3">
          <span className="text-2xl">🧵</span>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Embroidery</p>
            <p className="text-xs text-gray-500">Production Coordinator</p>
          </div>
        </div>

        <NavLink to="/" icon="📊" label="Dashboard" />
        <NavLink to="/orders" icon="📋" label="Orders" />

        {/* Customers — hidden from digitizers */}
        {can.viewCustomers(role) && (
          <NavLink to="/customers" icon="👥" label="Customers" />
        )}

        <NavLink to="/chat" icon="💬" label="Team Chat" />

        {/* Activity Log — admin and manager only */}
        {can.viewActivity(role) && (
          <NavLink to="/activity" icon="📝" label="Activity Log" />
        )}

        {/* Manage Users — admin only */}
        {can.manageUsers(role) && (
          <NavLink to="/users" icon="⚙️" label="Manage Users" />
        )}

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
      </aside>
      <main className="ml-60 flex-1 p-6 min-h-screen bg-gray-50">
        {children}
      </main>
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
          <Route path="/customers" element={
            <ProtectedRoute check={can.viewCustomers}>
              <Layout><Customers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
          <Route path="/activity" element={
            <ProtectedRoute check={can.viewActivity}>
              <Layout><ActivityLog /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute check={can.manageUsers}>
              <Layout><Users /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
