import { useEffect, useRef, useState } from 'react';
import { Balance } from '../types';

interface WebSocketMessage {
  type: string;
  data: {
    price: number;
    timestamp: number;
    balance: Balance;
    lastBuyPrice: number | null;
    lastSellPrice: number | null;
  };
}

export function useWebSocket(url: string) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (message.type === 'price_update') {
              setCurrentPrice(message.data.price);
              setBalance(message.data.balance);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 2000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { currentPrice, balance, isConnected };
}
