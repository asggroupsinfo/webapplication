import { useEffect, useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { wsService } from '../../services/websocket';
import type { MT5ConnectionStatus } from '../../types';

export default function DashboardPage() {
  const mt5Status = useTradingStore((state) => state.mt5Status);
  const setMT5Status = useTradingStore((state) => state.setMT5Status);

  useEffect(() => {
    // Listen for MT5 status updates
    const handleStatus = (status: MT5ConnectionStatus) => {
      setMT5Status(status);
    };

    wsService.on('mt5_status', handleStatus);

    return () => {
      wsService.off('mt5_status', handleStatus);
    };
  }, [setMT5Status]);

  const getStatusColor = (status: MT5ConnectionStatus) => {
    switch (status) {
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-premium-orange mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">MT5 Connection</h3>
          <p className={`text-2xl font-bold ${getStatusColor(mt5Status)}`}>
            {mt5Status.toUpperCase()}
          </p>
        </div>

        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Active Alerts</h3>
          <p className="text-2xl font-bold text-premium-orange">0</p>
        </div>

        <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Strategies</h3>
          <p className="text-2xl font-bold text-premium-orange">0</p>
        </div>
      </div>

      <div className="bg-charcoal p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-premium-orange mb-4">Welcome to Forex Master Pro</h2>
        <p className="text-gray-400">
          Your professional trading platform with real-time MT5 data, custom alerts, and Pine Script indicators.
        </p>
      </div>
    </div>
  );
}

