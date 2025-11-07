import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { wsService } from '../../services/websocket';

export default function DashboardLayout() {
  const { user, isAuthenticated, logout, fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token && !isAuthenticated) {
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error('Failed to fetch user:', error);
          navigate('/login');
        }
      } else if (!token) {
        navigate('/login');
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, [isAuthenticated, navigate, fetchCurrentUser]);

  useEffect(() => {
    // Connect WebSocket when authenticated
    if (isAuthenticated && user) {
      wsService.connect();
    }

    return () => {
      if (isAuthenticated) {
        wsService.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-pitch-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-orange mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-pitch-black text-white">
      {/* Header */}
      <header className="bg-charcoal border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-premium-orange">Forex Master Pro</h1>
            <span className="px-2 py-1 bg-vegetarian-green/20 text-vegetarian-green text-xs rounded">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <span className="text-xs text-gray-500">({user.role})</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-bearish-red/20 text-bearish-red rounded-md hover:bg-bearish-red/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-charcoal border-r border-gray-700 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            <Link
              to="/dashboard"
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive('/dashboard')
                  ? 'bg-premium-orange/20 text-premium-orange'
                  : 'text-gray-400 hover:bg-deep-space'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/dashboard/charts"
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive('/dashboard/charts')
                  ? 'bg-premium-orange/20 text-premium-orange'
                  : 'text-gray-400 hover:bg-deep-space'
              }`}
            >
              Trading Charts
            </Link>
            <Link
              to="/dashboard/alerts"
              className={`block px-4 py-2 rounded-md transition-colors ${
                isActive('/dashboard/alerts')
                  ? 'bg-premium-orange/20 text-premium-orange'
                  : 'text-gray-400 hover:bg-deep-space'
              }`}
            >
              Alerts
            </Link>
            {user.role === 'Super Admin' && (
              <Link
                to="/dashboard/users"
                className={`block px-4 py-2 rounded-md transition-colors ${
                  isActive('/dashboard/users')
                    ? 'bg-premium-orange/20 text-premium-orange'
                    : 'text-gray-400 hover:bg-deep-space'
                }`}
              >
                User Management
              </Link>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

