import crypto from 'crypto';
import Big from 'big.js';

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

  // 🔹 Cola de peticiones privadas para evitar nonce duplicado
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  // 🔹 Nonce seguro
  private lastNonce = Date.now() * 1000;
  private nonceIncrement = 0;

  private getNonce(): number {
    const now = Date.now() * 1000;
    if (now <= this.lastNonce) {
      this.lastNonce += 1;
    } else {
      this.lastNonce = now;
      this.nonceIncrement = 0; // resetear increment si avanzó el tiempo
    }
    this.nonceIncrement += 1;
    return this.lastNonce + this.nonceIncrement;
  }

  constructor(apiKey: string, privateKey: string) {
    this.apiKey = apiKey;
    this.privateKey = privateKey;
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

  private async _makePrivateRequest<T>(endpoint: string, data: Record<string, string | number>): Promise<T> {
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
      body: new URLSearchParams(Object.fromEntries(Object.entries(postData).map(([k, v]) => [k, String(v)]))).toString(),
    };

    await this.rateLimit();

    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, options);
    const result: any = await response.json();

    if (result.error && result.error.length > 0) {
      if (result.error.includes('EAPI:Rate limit exceeded')) {
        await this.delay(3000);
        return this._makePrivateRequest<T>(endpoint, data);
      }
      throw new Error(`Kraken API Error: ${result.error.join(', ')}`);
    }

    return result as T;
  }

  // 🔹 Cola para evitar nonce duplicado en concurrencia
  private async enqueuePrivateRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      if (!this.isProcessingQueue) this.processQueue();
    });
  }

  private async processQueue() {
    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const task = this.requestQueue.shift();
      if (task) await task();
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
    const response = await this.makeRequest<any>('/0/private/Balance', {}, true);
    const btc = response.result.XXBT ? parseFloat(response.result.XXBT) : 0;
    const eur = response.result.ZEUR ? parseFloat(response.result.ZEUR) : 0;
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
    const params: Record<string, string> = {
      pair: 'XXBTZEUR',
      type: 'buy',
      ordertype: price ? 'limit' : 'market',
      volume: amount.toFixed(8),
    };
    if (price) params.price = price.toFixed(2);
    const response = await this.makeRequest<any>('/0/private/AddOrder', params, true);
    return response.result.txid[0];
  }

  async placeSellOrder(amount: number, price?: number): Promise<string> {
    const params: Record<string, string> = {
      pair: 'XXBTZEUR',
      type: 'sell',
      ordertype: price ? 'limit' : 'market',
      volume: amount.toFixed(8),
    };
    if (price) params.price = price.toFixed(2);
    const response = await this.makeRequest<any>('/0/private/AddOrder', params, true);
    return response.result.txid[0];
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
