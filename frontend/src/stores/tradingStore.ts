import { create } from 'zustand';
import type { PriceData, MT5ConnectionStatus, Symbol } from '../types';

interface TradingState {
  selectedSymbol: string | null;
  selectedTimeframe: string;
  currentPrice: PriceData | null;
  mt5Status: MT5ConnectionStatus;
  symbols: Symbol[];
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setCurrentPrice: (price: PriceData) => void;
  setMT5Status: (status: MT5ConnectionStatus) => void;
  setSymbols: (symbols: Symbol[]) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  selectedSymbol: 'EURUSD',
  selectedTimeframe: 'M15',
  currentPrice: null,
  mt5Status: 'disconnected',
  symbols: [],

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setCurrentPrice: (price) => set({ currentPrice: price }),
  setMT5Status: (status) => set({ mt5Status: status }),
  setSymbols: (symbols) => set({ symbols }),
}));

