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
}

export interface OpenOrder {
  orderId: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
}

export interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: {
      a: string[];
      b: string[];
      c: string[];
      v: string[];
      p: string[];
      t: number[];
      l: string[];
      h: string[];
      o: string;
    };
  };
}

export interface KrakenBalanceResponse {
  error: string[];
  result: {
    [currency: string]: string;
  };
}

export interface KrakenOrderResponse {
  error: string[];
  result: {
    txid?: string[];
    descr?: {
      order: string;
    };
  };
}

export interface KrakenClosedOrdersResponse {
  error: string[];
  result: {
    closed: {
      [orderId: string]: {
        status: string;
        type: string;
        descr: {
          pair: string;
          type: string;
          ordertype: string;
          price: string;
        };
        vol: string;
        price: string;
        cost: string;
        fee: string;
        closetm: number;
      };
    };
  };
}

export interface KrakenOpenOrdersResponse {
  error: string[];
  result: {
    open: {
      [orderId: string]: {
        status: string;
        type: string;
        descr: {
          pair: string;
          type: string;
          ordertype: string;
          price: string;
        };
        vol: string;
        price: string;
      };
    };
  };
}
