import crypto from 'crypto';
import Big from 'big.js';
import fs from 'fs';
import path from 'path';


interface KrakenRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export class KrakenClient {
  private apiKey: string;
  private privateKey: string;
  private apiUrl = 'https://api.kraken.com';
  private lastRequestTime = 0;
  private minRequestInterval = 1000;
  private nonceFile = path.join(process.cwd(), 'lastNonce.json');
  private lastBuyPrice: number | null = null;
  private lastSellPrice: number | null = null;

  // Cargar el nonce al iniciar
private loadLastNonce() {
  try {
    if (fs.existsSync(this.nonceFile)) {
      const data = JSON.parse(fs.readFileSync(this.nonceFile, 'utf8'));
      this.lastNonce = data.lastNonce ?? this.lastNonce;
    }
  } catch (err) {
    console.warn('No se pudo cargar el nonce guardado:', err);
  }
}

// Guardar el nonce después de usarlo
private saveLastNonce() {
  try {
    fs.writeFileSync(this.nonceFile, JSON.stringify({ lastNonce: this.lastNonce }, null, 2));
  } catch (err) {
    console.error('No se pudo guardar el nonce:', err);
  }
}


  // 🔹 Cola de peticiones privadas para evitar nonce duplicado
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  // 🔹 Nonce seguro
  private lastNonce = Date.now() * 1000;
  private nonceIncrement = 0;





 private operationsFile = path.join(process.cwd(), 'lastOperations.json');

async saveLastOperations(lastBuyPrice: number | null, lastSellPrice: number | null) {
  const data = {
    lastBuyPrice,
    lastSellPrice,
    timestamp: Date.now(),
  };

  fs.writeFileSync(this.operationsFile, JSON.stringify(data, null, 2));
}


async loadLastOperations(): Promise<{ lastBuyPrice: number | null; lastSellPrice: number | null }> {
  try {
    if (!fs.existsSync(this.operationsFile)) {
      return { lastBuyPrice: null, lastSellPrice: null };
    }

    const raw = fs.readFileSync(this.operationsFile, 'utf8');
    if (!raw) {
      return { lastBuyPrice: null, lastSellPrice: null };
    }

    const data = JSON.parse(raw);

    return {
      lastBuyPrice: data.lastBuyPrice ?? null,
      lastSellPrice: data.lastSellPrice ?? null,
    };
  } catch (error) {
    console.error("Error loading last operations:", error);
    return { lastBuyPrice: null, lastSellPrice: null };
  }
}



private getNonce(): number {
  const now = Date.now() * 1000;
  if (now <= this.lastNonce) {
    this.lastNonce += 1;
  } else {
    this.lastNonce = now;
    this.nonceIncrement = 0;
  }
  this.nonceIncrement += 1;
  return this.lastNonce + this.nonceIncrement;
}


 constructor(apiKey: string, privateKey: string) {
  this.apiKey = apiKey;
  this.privateKey = privateKey;
  this.loadLastNonce(); // <-- carga el último nonce guardado al iniciar
}


  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.delay(this.minRequestInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  private getMessageSignature(path: string, request: Record<string, string | number>, secret: string, nonce: number): string {
    const postData = new URLSearchParams(request as Record<string, string>).toString();
    const message = nonce + postData;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(secret, 'base64'));
    return hmac.update(Buffer.concat([Buffer.from(path, 'utf8'), hash])).digest('base64');
  }

 private async _makePrivateRequest<T>(
  endpoint: string,
  data: Record<string, string | number>,
  retries = 3
): Promise<T> {
  const nonce = this.getNonce();
  const postData = { ...data, nonce };
  const signature = this.getMessageSignature(endpoint, postData, this.privateKey, nonce);

  const options: KrakenRequestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'API-Key': this.apiKey,
      'API-Sign': signature,
    },
    body: new URLSearchParams(
      Object.fromEntries(Object.entries(postData).map(([k, v]) => [k, String(v)]))
    ).toString(),
  };

  await this.rateLimit();

  try {
    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, options);
    const result: any = await response.json();

    if (result.error && result.error.length > 0) {
      if (result.error.includes('EAPI:Rate limit exceeded')) {
        await this.delay(3000);
        return this._makePrivateRequest<T>(endpoint, data, retries);
      }
      throw new Error(`Kraken API Error: ${result.error.join(', ')}`);
    }

    return result as T;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Request failed, reintentando... (${retries} restantes)`, err);
      await this.delay(1000);
      return this._makePrivateRequest<T>(endpoint, data, retries - 1);
    }
    throw new Error(`Request failed after retries: ${err}`);
  }
}


  // 🔹 Cola para evitar nonce duplicado en concurrencia
 private async enqueuePrivateRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    this.requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        console.error('Error en petición privada de Kraken:', err);
        // No rechazamos la promesa de la cola, para que siga
        reject(err); // sí notificamos al que llamó a la función
      }
    });
    if (!this.isProcessingQueue) this.processQueue();
  });
}


private async processQueue() {
  this.isProcessingQueue = true;
  while (this.requestQueue.length > 0) {
    const task = this.requestQueue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error('Error en task de la cola Kraken, se continuará con la siguiente:', err);
      }
    }
  }
  this.isProcessingQueue = false;
}



  // 🔹 Función pública que usa la cola
  private async makeRequest<T>(endpoint: string, data: Record<string, string | number> = {}, isPrivate = false): Promise<T> {
    if (isPrivate) {
      return this.enqueuePrivateRequest(() => this._makePrivateRequest<T>(endpoint, data));
    }

    // Public request
    await this.rateLimit();
    const url = `${this.apiUrl}${endpoint}`;
    const options: KrakenRequestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: Object.keys(data).length ? new URLSearchParams(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))).toString() : undefined,
    };

    try {
      const response = await fetch(url, options);
      const result: any = await response.json();
      if (result.error && result.error.length > 0) {
        throw new Error(`Kraken API Error: ${result.error.join(', ')}`);
      }
      return result as T;
    } catch (error) {
      console.error('Kraken API request failed:', error);
      throw error;
    }
  }

  // 🔹 Todas tus funciones existentes se mantienen intactas
  async getTicker(pair = 'XXBTZEUR'): Promise<number> {
    const response = await this.makeRequest<any>('/0/public/Ticker', { pair });
    const pairData = response.result[pair];
    return parseFloat(pairData.c[0]);
  }

  async getBalance(): Promise<{ btc: number; eur: number }> {
    // 1️⃣ Obtener balances
    const balanceResp = await this.makeRequest<any>('/0/private/Balance', {}, true);
    const btc = balanceResp.result.XXBT ? parseFloat(balanceResp.result.XXBT) : 0;
    const eur = balanceResp.result.ZEUR ? parseFloat(balanceResp.result.ZEUR) : 0;

    // 2️⃣ Obtener historial de trades
    const tradesResp = await this.makeRequest<any>('/0/private/TradesHistory', {}, true);
    const trades = Object.values(tradesResp.result.trades) as any[];

    // 3️⃣ Filtrar últimas operaciones
    const lastBuy = trades.filter((t: any) => t.type === 'buy').pop() as any;
    const lastSell = trades.filter((t: any) => t.type === 'sell').pop() as any;

    // 4️⃣ Guardar precios en la clase
    this.lastBuyPrice = lastBuy && lastBuy.price ? parseFloat(lastBuy.price) : null;
    this.lastSellPrice = lastSell && lastSell.price ? parseFloat(lastSell.price) : null;

    return { btc, eur };
}


  async getClosedOrders(): Promise<any> {
    const response = await this.makeRequest<any>('/0/private/ClosedOrders', { trades: 'true' }, true);
    return response.result.closed || {};
  }

  async getOpenOrders(): Promise<any> {
    const response = await this.makeRequest<any>('/0/private/OpenOrders', {}, true);
    return response.result.open || {};
  }

  async placeBuyOrder(amount: number, price?: number): Promise<string> {
  // Validaciones
  if (amount <= 0) throw new Error("Amount debe ser mayor que 0");
  if (price !== undefined && price <= 0) throw new Error("Price debe ser mayor que 0 si es límite");

  const params: Record<string, string> = {
    pair: 'XXBTZEUR',
    type: 'buy',
    ordertype: price ? 'limit' : 'market',
    volume: amount.toFixed(8),
  };
  if (price) params.price = price.toFixed(2);

  console.log("Ejecutando orden de compra:", params);

  try {
    const response = await this.makeRequest<any>('/0/private/AddOrder', params, true);
    if (!response.result?.txid?.length) throw new Error("No se recibió txid de Kraken");

    const txid = response.result.txid[0];
    console.log("Orden de compra ejecutada, txid:", txid);

    // Guardar el último precio de compra
    await this.saveLastOperations(price ?? null, null);

    return txid;
  } catch (err: any) {
    console.error("Error en placeBuyOrder:", err);
    throw err;
  }
}

async placeSellOrder(amount: number, price?: number): Promise<string> {
  // Validaciones
  if (amount <= 0) throw new Error("Amount debe ser mayor que 0");
  if (price !== undefined && price <= 0) throw new Error("Price debe ser mayor que 0 si es límite");

  const params: Record<string, string> = {
    pair: 'XXBTZEUR',
    type: 'sell',
    ordertype: price ? 'limit' : 'market',
    volume: amount.toFixed(8),
  };
  if (price) params.price = price.toFixed(2);

  console.log("Ejecutando orden de venta:", params);

  try {
    const response = await this.makeRequest<any>('/0/private/AddOrder', params, true);
    if (!response.result?.txid?.length) throw new Error("No se recibió txid de Kraken");

    const txid = response.result.txid[0];
    console.log("Orden de venta ejecutada, txid:", txid);

    // Guardar el último precio de venta
    await this.saveLastOperations(null, price ?? null);

    return txid;
  } catch (err: any) {
    console.error("Error en placeSellOrder:", err);
    throw err;
  }
}



  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.makeRequest<any>('/0/private/CancelOrder', { txid: orderId }, true);
      await this.delay(500);
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      return false;
    }
  }

  calculateTotalCapital(btc: number, eur: number, btcPrice: number): number {
    const btcBig = new Big(btc);
    const priceBig = new Big(btcPrice);
    const eurBig = new Big(eur);
    const btcValue = btcBig.times(priceBig);
    return parseFloat(btcValue.plus(eurBig).toFixed(2));
  }

  calculateNetProfit(
    currentPrice: number,
    purchasePrice: number,
    btcAmount: number,
    purchaseFeeBTC: number,
    sellFeePercentage: number
  ): number {
    const currentPriceBig = new Big(currentPrice);
    const purchasePriceBig = new Big(purchasePrice);
    const btcAmountBig = new Big(btcAmount);
    const purchaseFeeBTCBig = new Big(purchaseFeeBTC);
    const sellFeePercentageBig = new Big(sellFeePercentage);

    const purchaseFeeEUR = purchaseFeeBTCBig.times(purchasePriceBig);
    const sellFeeEUR = currentPriceBig.times(btcAmountBig).times(sellFeePercentageBig);

    const revenue = currentPriceBig.times(btcAmountBig);
    const cost = purchasePriceBig.times(btcAmountBig);
    const totalFees = purchaseFeeEUR.plus(sellFeeEUR);

    const netProfit = revenue.minus(cost).minus(totalFees);

    return parseFloat(netProfit.toFixed(2));
  }
}
