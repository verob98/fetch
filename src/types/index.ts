export interface BotConfig {
  inversionInicial: number;
  montoMinimoSeguridad: number;
  porcentajeInversion: number;
  apiKey: string;
  privateKey: string;
}

export interface Balance {
  btc: number;
  eur: number;
  totalCapital: number;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
  isManual: boolean;
  fee: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface PricePoint {
  timestamp: number;
  price: number;
  change: number;
  signal?: 'buy' | 'sell';
  changeAmount?: number;
}

export interface BotStatus {
  initialized: boolean;
  isRunning: boolean;
  balance?: Balance;
  currentPrice?: number;
  lastBuyPrice?: number | null;
  lastSellPrice?: number | null;
  trades?: Trade[];
}
