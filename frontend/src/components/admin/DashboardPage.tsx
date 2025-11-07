import { useEffect, useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { wsService } from '../../services/websocket';
import { dashboardAPI } from '../../services/api';
import type { MT5ConnectionStatus } from '../../types';

interface DashboardStats {
  mt5_status: string;
  active_alerts: number;
  total_alerts: number;
  strategies: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const setMT5Status = useTradingStore((state) => state.setMT5Status);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await dashboardAPI.getStats();
        setStats(data);
        setMT5Status(data.mt5_status as MT5ConnectionStatus);
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load dashboard data';
        setError(errorMessage);
        // Set default values on error so UI still shows
        setStats({
          mt5_status: 'disconnected',
          active_alerts: 0,
          total_alerts: 0,
          strategies: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    // Listen for MT5 status updates via WebSocket
    const handleStatus = (status: MT5ConnectionStatus) => {
      setMT5Status(status);
      setStats((prevStats) => {
        if (prevStats) {
          return { ...prevStats, mt5_status: status };
        }
        return prevStats;
      });
    };

    wsService.on('mt5_status', handleStatus);

    return () => {
      clearInterval(interval);
      wsService.off('mt5_status', handleStatus);
    };
  }, [setMT5Status]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
        return 'text-vegetarian-green';
      case 'connecting':
        return 'text-premium-orange';
      case 'disconnected':
        return 'text-bearish-red';
      default:
        return 'text-gray-400';
    }
  };

  // Show loading only on initial load
  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-orange mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    mt5_status: 'disconnected',
    active_alerts: 0,
    total_alerts: 0,
    strategies: 0,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-premium-orange mb-6">Dashboard</h1>

      {error && (
        <div className="bg-bearish-red/20 border border-bearish-red text-bearish-red px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">MT5 Connection</h3>
          <p className={`text-2xl font-bold ${getStatusColor(displayStats.mt5_status)}`}>
            {displayStats.mt5_status.toUpperCase()}
          </p>
        </div>

        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Active Alerts</h3>
          <p className="text-2xl font-bold text-premium-orange">{displayStats.active_alerts}</p>
          <p className="text-xs text-gray-500 mt-1">Total: {displayStats.total_alerts}</p>
        </div>

        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Strategies</h3>
          <p className="text-2xl font-bold text-premium-orange">{displayStats.strategies}</p>
        </div>
      </div>

      <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-premium-orange mb-4">Welcome to Forex Master Pro</h2>
        <p className="text-gray-400 mb-4">
          Your professional trading platform with real-time MT5 data, custom alerts, and Pine Script indicators.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Quick Actions</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Create custom alerts with webhook URLs</li>
              <li>• View real-time TradingView charts</li>
              <li>• Monitor MT5 connection status</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Features</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Real-time market data streaming</li>
              <li>• Multi-timeframe support</li>
              <li>• Custom alert system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

