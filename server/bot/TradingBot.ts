import { KrakenClient } from '../utils/KrakenClient';
import { BotConfig, Trade, Balance, OpenOrder } from '../types';
import Big from 'big.js';

export class TradingBot {
  private config: BotConfig;
  private krakenClient: KrakenClient;
  private isRunning = false;
  private lastSellPrice: number | null = null;
  private lastBuyPrice: number | null = null;
  private trades: Trade[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 10000;
  private readonly KRAKEN_FEE_PERCENTAGE = 0.0026;

  constructor(config: BotConfig) {
    this.config = config;
    this.krakenClient = new KrakenClient(config.apiKey, config.privateKey);
  }

  async initialize(): Promise<boolean> {
    try {
      const isConnected = await this.krakenClient.verifyConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Kraken API');
      }

      await this.loadLastOperations();
      return true;
    } catch (error) {
      console.error('Bot initialization failed:', error);
      return false;
    }
  }

  private async loadLastOperations(): Promise<void> {
    try {
      const closedOrders = await this.krakenClient.getClosedOrders();
      const orders = Object.entries(closedOrders).map(([id, order]: [string, any]) => ({
        id,
        ...order,
      }));

      orders.sort((a, b) => b.closetm - a.closetm);

      for (const order of orders) {
        if (order.descr.pair === 'XXBTZEUR') {
          if (order.descr.type === 'sell' && !this.lastSellPrice) {
            this.lastSellPrice = parseFloat(order.price);
          }
          if (order.descr.type === 'buy' && !this.lastBuyPrice) {
            this.lastBuyPrice = parseFloat(order.price);
          }
        }

        if (this.lastSellPrice && this.lastBuyPrice) {
          break;
        }
      }

      console.log('Last operations loaded:', {
        lastBuyPrice: this.lastBuyPrice,
        lastSellPrice: this.lastSellPrice,
      });
    } catch (error) {
      console.error('Failed to load last operations:', error);
    }
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.executeTradingCycle();
    }, this.CHECK_INTERVAL_MS);

    console.log('Trading bot started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('Trading bot stopped');
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      const balance = await this.getBalance();

      if (balance.totalCapital < this.config.montoMinimoSeguridad) {
        console.log('Capital below minimum security threshold. Stopping bot.');
        this.stop();
        return;
      }

      const currentPrice = await this.krakenClient.getTicker();

      await this.checkBuyOpportunity(balance, currentPrice);
      await this.checkSellOpportunity(balance, currentPrice);
    } catch (error) {
      console.error('Trading cycle error:', error);
    }
  }

  private async checkBuyOpportunity(balance: Balance, currentPrice: number): Promise<void> {
    if (balance.totalCapital < this.config.montoMinimoSeguridad) {
      return;
    }

    if (this.lastSellPrice && currentPrice > this.lastSellPrice) {
      return;
    }

    const openOrders = await this.krakenClient.getOpenOrders();
    const buyOrders = Object.entries(openOrders)
      .filter(([_, order]: [string, any]) => order.descr.type === 'buy')
      .map(([id, order]: [string, any]) => ({
        orderId: id,
        price: parseFloat(order.descr.price),
        amount: parseFloat(order.vol),
      }));

    for (const order of buyOrders) {
      if (order.price > currentPrice) {
        await this.krakenClient.cancelOrder(order.orderId);
        await this.delay(1000);
      }
    }

    const freshBalance = await this.krakenClient.getBalance();
    const investmentAmount = new Big(freshBalance.eur)
      .times(this.config.porcentajeInversion)
      .div(100);
    const btcAmount = investmentAmount.div(currentPrice);

    if (btcAmount.gte(0.0001)) {
      await this.executeBuy(parseFloat(btcAmount.toFixed(8)), currentPrice, false);
    }
  }

  private async checkSellOpportunity(balance: Balance, currentPrice: number): Promise<void> {
    if (balance.btc <= 0) {
      return;
    }

    if (!this.lastBuyPrice) {
      return;
    }

    const closedOrders = await this.krakenClient.getClosedOrders();
    const lastBuyOrder = this.findLastBuyOrder(closedOrders);

    if (!lastBuyOrder) {
      return;
    }

    const purchasePrice = parseFloat(lastBuyOrder.price);
    const btcAmount = parseFloat(lastBuyOrder.vol);
    const purchaseFeeBTC = parseFloat(lastBuyOrder.fee);

    const netProfit = this.krakenClient.calculateNetProfit(
      currentPrice,
      purchasePrice,
      btcAmount,
      purchaseFeeBTC,
      this.KRAKEN_FEE_PERCENTAGE
    );

    if (netProfit <= 0) {
      return;
    }

    const openOrders = await this.krakenClient.getOpenOrders();
    const sellOrders = Object.entries(openOrders)
      .filter(([_, order]: [string, any]) => order.descr.type === 'sell')
      .map(([id, order]: [string, any]) => ({
        orderId: id,
        price: parseFloat(order.descr.price),
        amount: parseFloat(order.vol),
      }));

    let shouldPlaceNewOrder = sellOrders.length === 0;

    for (const order of sellOrders) {
      const existingNetProfit = this.krakenClient.calculateNetProfit(
        order.price,
        purchasePrice,
        btcAmount,
        purchaseFeeBTC,
        this.KRAKEN_FEE_PERCENTAGE
      );

      if (existingNetProfit < netProfit) {
        await this.krakenClient.cancelOrder(order.orderId);
        await this.delay(1000);
        shouldPlaceNewOrder = true;
      }
    }

    if (shouldPlaceNewOrder) {
      const freshBalance = await this.krakenClient.getBalance();
      if (freshBalance.btc > 0) {
        await this.executeSell(freshBalance.btc, currentPrice, false);
      }
    }
  }

  private findLastBuyOrder(closedOrders: any): any {
    const buyOrders = Object.entries(closedOrders)
      .filter(([_, order]: [string, any]) =>
        order.descr.type === 'buy' && order.descr.pair === 'XXBTZEUR'
      )
      .map(([id, order]: [string, any]) => ({ id, ...order }));

    buyOrders.sort((a, b) => b.closetm - a.closetm);

    return buyOrders[0] || null;
  }

  async executeBuy(amount: number, price: number, isManual: boolean): Promise<boolean> {
    try {
      const balance = await this.getBalance();

      if (balance.totalCapital < this.config.montoMinimoSeguridad) {
        throw new Error('Capital below minimum security threshold');
      }

      if (!isManual && this.lastSellPrice && price > this.lastSellPrice) {
        throw new Error('Price is higher than last sell price');
      }

      const orderId = await this.krakenClient.placeBuyOrder(amount);

      this.lastBuyPrice = price;

      const trade: Trade = {
        id: orderId,
        type: 'buy',
        price,
        amount,
        timestamp: Date.now(),
        isManual,
        fee: amount * this.KRAKEN_FEE_PERCENTAGE,
        status: 'confirmed',
      };

      this.trades.push(trade);

      console.log('Buy order executed:', trade);
      return true;
    } catch (error) {
      console.error('Buy execution failed:', error);
      return false;
    }
  }

  async executeSell(amount: number, price: number, isManual: boolean): Promise<boolean> {
    try {
      const balance = await this.krakenClient.getBalance();

      if (balance.btc <= 0) {
        throw new Error('No BTC available to sell');
      }

      const orderId = await this.krakenClient.placeSellOrder(amount);

      this.lastSellPrice = price;

      const trade: Trade = {
        id: orderId,
        type: 'sell',
        price,
        amount,
        timestamp: Date.now(),
        isManual,
        fee: amount * price * this.KRAKEN_FEE_PERCENTAGE,
        status: 'confirmed',
      };

      this.trades.push(trade);

      console.log('Sell order executed:', trade);
      return true;
    } catch (error) {
      console.error('Sell execution failed:', error);
      return false;
    }
  }

  async getBalance(): Promise<Balance> {
    const { btc, eur } = await this.krakenClient.getBalance();
    const currentPrice = await this.krakenClient.getTicker();
    const totalCapital = this.krakenClient.calculateTotalCapital(btc, eur, currentPrice);

    return { btc, eur, totalCapital };
  }

  async getCurrentPrice(): Promise<number> {
    return await this.krakenClient.getTicker();
  }

  getLastSellPrice(): number | null {
    return this.lastSellPrice;
  }

  getLastBuyPrice(): number | null {
    return this.lastBuyPrice;
  }

  getTrades(): Trade[] {
    return this.trades;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getTradingResults(initialCapital: number, currentCapital: number): number {
    return parseFloat(new Big(currentCapital).minus(initialCapital).toFixed(2));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
