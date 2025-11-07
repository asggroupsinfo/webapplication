import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { wsService } from '../../services/websocket';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol || 'EURUSD');
  const selectedTimeframe = useTradingStore((state) => state.selectedTimeframe || '1H');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // TradingView Advanced Charts Widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    
    script.onload = () => {
      if (!chartContainerRef.current || !window.TradingView) return;

      // Clean up existing widget
      if (widgetRef.current) {
        widgetRef.current.remove();
      }

      // Create new widget
      widgetRef.current = new window.TradingView.widget({
        symbol: selectedSymbol,
        interval: selectedTimeframe,
        container_id: chartContainerRef.current,
        datafeed: {
          onReady: (callback: any) => {
            callback({
              supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
              supports_marks: true,
              supports_timescale_marks: true,
              supports_time: true,
            });
          },
          searchSymbols: (_userInput: string, _exchange: string, _symbolType: string, onResultReadyCallback: any) => {
            // Placeholder for symbol search
            onResultReadyCallback([]);
          },
          resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any, _onResolveErrorCallback: any) => {
            // Resolve symbol
            const symbolInfo = {
              name: symbolName,
              ticker: symbolName,
              description: symbolName,
              type: 'forex',
              session: '24x7',
              timezone: 'Etc/UTC',
              exchange: '',
              minmov: 1,
              pricescale: 100000,
              has_intraday: true,
              has_weekly_and_monthly: true,
              supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
              volume_precision: 0,
              data_status: 'streaming',
            };
            onSymbolResolvedCallback(symbolInfo);
          },
          getBars: async (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any, onErrorCallback: any, _firstDataRequest: boolean) => {
            // Map TradingView resolution to our timeframe format
            const resolutionMap: { [key: string]: string } = {
              '1': 'M1',
              '5': 'M5',
              '15': 'M15',
              '30': 'M30',
              '60': 'H1',
              '240': 'H4',
              '1D': 'D1',
              '1W': 'W1',
              '1M': '1M',
            };
            
            const timeframe = resolutionMap[resolution] || 'M15';
            const symbol = symbolInfo.name || symbolInfo.ticker;
            
            try {
              // Import chartsAPI dynamically
              const { chartsAPI } = await import('../../services/api');
              
              // Calculate count based on time range
              const timeDiff = to - from;
              const resolutionMinutes = parseInt(resolution) || 15;
              const count = Math.min(Math.max(Math.ceil(timeDiff / (resolutionMinutes * 60)), 100), 500);
              
              const response = await chartsAPI.getHistoricalData(symbol, timeframe, count);
              
              // Filter and sort data by time range
              const filteredData = response.data
                .filter((bar: any) => {
                  return bar.time >= from * 1000 && bar.time <= to * 1000;
                })
                .sort((a: any, b: any) => a.time - b.time);
              
              if (filteredData.length === 0) {
                onHistoryCallback([], { noData: true });
              } else {
                onHistoryCallback(filteredData, { noData: false });
              }
            } catch (error) {
              console.error('Error fetching historical data:', error);
              onErrorCallback('Failed to fetch historical data');
            }
          },
          subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any, subscriberUID: string, _onResetCacheNeededCallback: any) => {
            // Subscribe to real-time data via WebSocket
            const symbol = symbolInfo.name || symbolInfo.ticker;
            
            // Store callback for this subscription
            if (!widgetRef.current.subscriptions) {
              widgetRef.current.subscriptions = new Map();
            }
            widgetRef.current.subscriptions.set(subscriberUID, { onRealtimeCallback, symbol, resolution });
            
            // Listen for price updates
            const handlePriceUpdate = (data: any) => {
              if (data.symbol === symbol) {
                const bar = {
                  time: Math.floor(Date.now() / 1000),
                  open: data.bid,
                  high: data.bid,
                  low: data.bid,
                  close: data.bid,
                  volume: 0,
                };
                onRealtimeCallback(bar);
              }
            };
            
            wsService.on('price_update', handlePriceUpdate);
            widgetRef.current.subscriptions.get(subscriberUID).handler = handlePriceUpdate;
          },
          unsubscribeBars: (subscriberUID: string) => {
            // Unsubscribe from real-time data
            if (widgetRef.current.subscriptions) {
              const subscription = widgetRef.current.subscriptions.get(subscriberUID);
              if (subscription && subscription.handler) {
                wsService.off('price_update', subscription.handler);
              }
              widgetRef.current.subscriptions.delete(subscriberUID);
            }
          },
        },
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: ['use_localstorage_for_settings'],
        enabled_features: ['study_templates'],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        fullscreen: false,
        studies_overrides: {},
        theme: 'dark',
      });

      setIsLoading(false);
    };

    script.onerror = () => {
      setIsLoading(false);
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <p class="text-lg mb-2 text-red-400">Failed to load TradingView Chart</p>
              <p class="text-sm">Please check your internet connection</p>
            </div>
          </div>
        `;
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
    };
  }, [selectedSymbol, selectedTimeframe]);

  return (
    <div className="bg-charcoal rounded-lg border border-gray-700 h-[600px] p-4">
      {isLoading && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-2">Loading TradingView Chart...</p>
            <p className="text-sm">Symbol: {selectedSymbol}</p>
            <p className="text-sm">Timeframe: {selectedTimeframe}</p>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full"></div>
    </div>
  );
}

