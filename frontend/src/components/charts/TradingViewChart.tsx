import { useEffect, useRef } from 'react';
import { useTradingStore } from '../../stores/tradingStore';

export default function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const selectedSymbol = useTradingStore((state) => state.selectedSymbol);
  const selectedTimeframe = useTradingStore((state) => state.selectedTimeframe);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // TradingView Advanced Charts Widget
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.onload = () => {
      // Initialize chart here
      // For now, we'll use a placeholder
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <p class="text-lg mb-2">TradingView Chart</p>
              <p class="text-sm">Symbol: ${selectedSymbol}</p>
              <p class="text-sm">Timeframe: ${selectedTimeframe}</p>
              <p class="text-xs mt-4 text-gray-500">Chart integration will be implemented with TradingView Advanced Charts Widget</p>
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
    };
  }, [selectedSymbol, selectedTimeframe]);

  return (
    <div className="bg-charcoal rounded-lg border border-gray-700 h-[600px] p-4">
      <div ref={chartContainerRef} className="w-full h-full"></div>
    </div>
  );
}

