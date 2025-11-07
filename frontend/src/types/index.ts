// User Types
export interface User {
  id: string;
  email: string;
  role: 'Super Admin' | 'Admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  role: 'Super Admin' | 'Admin';
  full_name?: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  role?: 'Super Admin' | 'Admin';
  is_active?: boolean;
  full_name?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Alert Types
export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  condition_type: string;
  condition_value?: number;
  condition_code?: string;
  timeframe: string;
  webhook_url: string;
  trigger_type: string;
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertCreate {
  symbol: string;
  condition_type: string;
  condition_value?: number;
  condition_code?: string;
  timeframe: string;
  webhook_url: string;
  trigger_type?: string;
  is_active?: boolean;
}

export interface AlertUpdate {
  symbol?: string;
  condition_type?: string;
  condition_value?: number;
  condition_code?: string;
  timeframe?: string;
  webhook_url?: string;
  trigger_type?: string;
  is_active?: boolean;
}

// Trading Types
export interface Symbol {
  name: string;
  description?: string;
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
}

// MT5 Connection Status
export type MT5ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

