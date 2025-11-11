import { BotConfig, Balance, BotStatus } from '../types';

const API_URL = 'http://localhost:3001/api';

export const api = {
  async initialize(config: BotConfig): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async start(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/start`, {
      method: 'POST',
    });
    return response.json();
  },

  async stop(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/stop`, {
      method: 'POST',
    });
    return response.json();
  },

  async buyManual(amount: number, price: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, price }),
    });
    return response.json();
  },

  async sellManual(amount: number, price: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, price }),
    });
    return response.json();
  },

  async getBalance(): Promise<Balance> {
    const response = await fetch(`${API_URL}/balance`);
    return response.json();
  },

  async getStatus(): Promise<BotStatus> {
    const response = await fetch(`${API_URL}/status`);
    return response.json();
  },

  async getPrice(): Promise<{ price: number }> {
    const response = await fetch(`${API_URL}/price`);
    return response.json();
  },
};
