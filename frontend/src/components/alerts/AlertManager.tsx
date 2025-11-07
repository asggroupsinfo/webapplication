import { useState, useEffect } from 'react';
import { alertAPI } from '../../services/api';
import { wsService } from '../../services/websocket';
import type { Alert, AlertCreate } from '../../types';

export default function AlertManager() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AlertCreate>({
    symbol: 'EURUSD',
    condition_type: 'PRICE_ABOVE',
    timeframe: 'M15',
    webhook_url: '',
    trigger_type: 'ONCE',
    is_active: true,
  });

  useEffect(() => {
    fetchAlerts();

    // Listen for real-time alert updates via WebSocket
    const handleAlertUpdate = (data: any) => {
      if (data.type === 'alert_created' || data.type === 'alert_updated') {
        fetchAlerts();
      } else if (data.type === 'alert_deleted') {
        setAlerts((prev) => prev.filter((a) => a.id !== data.alert_id));
      } else if (data.type === 'alert_triggered') {
        // Update alert last_triggered time
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === data.alert_id ? { ...a, last_triggered: data.timestamp } : a
          )
        );
      }
    };

    wsService.on('alert_update', handleAlertUpdate);

    return () => {
      wsService.off('alert_update', handleAlertUpdate);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await alertAPI.getAlerts();
      setAlerts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate webhook URL
    if (!formData.webhook_url.startsWith('http://') && !formData.webhook_url.startsWith('https://')) {
      setError('Webhook URL must start with http:// or https://');
      return;
    }

    try {
      await alertAPI.createAlert(formData);
      setShowModal(false);
      setFormData({
        symbol: 'EURUSD',
        condition_type: 'PRICE_ABOVE',
        timeframe: 'M15',
        webhook_url: '',
        trigger_type: 'ONCE',
        is_active: true,
      });
      fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create alert');
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await alertAPI.deleteAlert(alertId);
      fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete alert');
    }
  };

  const handleToggle = async (alert: Alert) => {
    try {
      await alertAPI.updateAlert(alert.id, { is_active: !alert.is_active });
      fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update alert');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-premium-orange">Alert Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-premium-orange text-pitch-black px-4 py-2 rounded-md hover:bg-golden-glow transition-colors"
        >
          Create Alert
        </button>
      </div>

      {error && (
        <div className="bg-bearish-red/20 border border-bearish-red text-bearish-red px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-orange mx-auto mb-4"></div>
            <p className="text-gray-400">Loading alerts...</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-charcoal rounded-lg border border-gray-700 p-12 text-center">
          <p className="text-gray-400 mb-4">No alerts created yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-premium-orange text-pitch-black px-4 py-2 rounded-md hover:bg-golden-glow transition-colors"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="bg-charcoal rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-deep-space">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Symbol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Condition</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Timeframe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Webhook URL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-deep-space">
                  <td className="px-4 py-3 text-sm text-gray-300">{alert.symbol}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{alert.condition_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{alert.timeframe}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate" title={alert.webhook_url}>
                    {alert.webhook_url}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleToggle(alert)}
                      className={`px-2 py-1 rounded text-xs ${
                        alert.is_active
                          ? 'bg-vegetarian-green/20 text-vegetarian-green'
                          : 'bg-bearish-red/20 text-bearish-red'
                      }`}
                    >
                      {alert.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-bearish-red hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-charcoal p-6 rounded-lg border border-premium-orange/20 max-w-md w-full">
            <h2 className="text-xl font-bold text-premium-orange mb-4">Create Alert</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                  placeholder="EURUSD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition Type</label>
                <select
                  value={formData.condition_type}
                  onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                >
                  <option value="PRICE_ABOVE">Price Above</option>
                  <option value="PRICE_BELOW">Price Below</option>
                  <option value="PINE_CONDITION">Pine Script Condition</option>
                </select>
              </div>

              {(formData.condition_type === 'PRICE_ABOVE' || formData.condition_type === 'PRICE_BELOW') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Condition Value (Price)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.condition_value || ''}
                    onChange={(e) => setFormData({ ...formData, condition_value: parseFloat(e.target.value) || undefined })}
                    required
                    className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                    placeholder="1.08500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the price threshold for the alert</p>
                </div>
              )}

              {formData.condition_type === 'PINE_CONDITION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pine Script Condition Code</label>
                  <textarea
                    value={formData.condition_code || ''}
                    onChange={(e) => setFormData({ ...formData, condition_code: e.target.value })}
                    className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                    rows={4}
                    placeholder="// Pine Script condition code here"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter Pine Script condition code</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timeframe</label>
                <select
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                >
                  <option value="M5">5 Minutes</option>
                  <option value="M15">15 Minutes</option>
                  <option value="H1">1 Hour</option>
                  <option value="H4">4 Hours</option>
                  <option value="D1">Daily</option>
                  <option value="W1">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                  placeholder="https://your-webhook-url.com/endpoint"
                />
                <p className="text-xs text-gray-500 mt-1">Enter your custom webhook URL for alerts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Type</label>
                <select
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                >
                  <option value="ONCE">Once</option>
                  <option value="RECURRING">Recurring</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-premium-orange text-pitch-black rounded-md hover:bg-golden-glow"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

