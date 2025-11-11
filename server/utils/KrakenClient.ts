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
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

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
    const message = `${nonce}${new URLSearchParams(request as Record<string, string>).toString()}`;
    const hash = crypto.createHash('sha256').update(message).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(secret, 'base64'));
    hmac.update(path + hash.toString('binary'), 'binary');
    return hmac.digest('base64');
  }

  private async makeRequest<T>(endpoint: string, data: Record<string, string | number> = {}, isPrivate = false): Promise<T> {
    await this.rateLimit();

    const url = `${this.apiUrl}${endpoint}`;
    const options: KrakenRequestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (isPrivate) {
      const nonce = Date.now() * 1000;
      const postData: Record<string, string | number> = { ...data, nonce };
      const signature = this.getMessageSignature(endpoint, postData, this.privateKey, nonce);

      options.headers = {
        ...options.headers,
        'API-Key': this.apiKey,
        'API-Sign': signature,
      };

      const formData: Record<string, string> = {};
      Object.entries(postData).forEach(([key, value]) => {
        formData[key] = String(value);
      });
      options.body = new URLSearchParams(formData).toString();
    } else if (Object.keys(data).length > 0) {
      const formData: Record<string, string> = {};
      Object.entries(data).forEach(([key, value]) => {
        formData[key] = String(value);
      });
      options.body = new URLSearchParams(formData).toString();
    }

    try {
      const response = await fetch(url, options);
      const result: any = await response.json();

      if (result.error && result.error.length > 0) {
        if (result.error.includes('EAPI:Rate limit exceeded')) {
          await this.delay(3000);
          return this.makeRequest<T>(endpoint, data, isPrivate);
        }
        throw new Error(`Kraken API Error: ${result.error.join(', ')}`);
      }

      return result as T;
    } catch (error) {
      console.error('Kraken API request failed:', error);
      throw error;
    }
  }

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
    const response = await this.makeRequest<any>(
      '/0/private/ClosedOrders',
      { trades: 'true' },
      true
    );
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

    if (price) {
      params.price = price.toFixed(2);
    }

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

    if (price) {
      params.price = price.toFixed(2);
    }

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
