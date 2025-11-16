import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { TradingBot } from './bot/TradingBot';
import { BotConfig } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let tradingBot: TradingBot | null = null;
let wsClients: Set<WebSocket> = new Set();

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  wsClients.add(ws);
  console.log('WebSocket client connected');

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

function broadcastToClients(data: any): void {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

app.post('/api/initialize', async (req, res) => {
  try {
    const config: BotConfig = req.body;

    tradingBot = new TradingBot(config);
    const success = await tradingBot.initialize();

    if (!success) {
      return res.status(400).json({ error: 'Failed to initialize bot' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/start', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    tradingBot.start();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stop', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    tradingBot.stop();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/buy', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    const { amount, price } = req.body;
    const success = await tradingBot.executeBuy(amount, price, true);

    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sell', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    const { amount, price } = req.body;
    const success = await tradingBot.executeSell(amount, price, true);

    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/balance', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    const balance = await tradingBot.getBalance();
    res.json(balance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.json({
        initialized: false,
        isRunning: false,
      });
    }

    let balance = { btc: 0, eur: 0 };
    let currentPrice = 0;
    let lastBuyPrice = null;
    let lastSellPrice = null;
    let trades: any[] = [];

    try { balance = await tradingBot.getBalance(); } catch {}
    try { currentPrice = await tradingBot.getCurrentPrice(); } catch {}
    try { lastBuyPrice = tradingBot.getLastBuyPrice(); } catch {}
    try { lastSellPrice = tradingBot.getLastSellPrice(); } catch {}
    try { trades = tradingBot.getTrades() || []; } catch {}

    res.json({
      initialized: true,
      isRunning: tradingBot.isActive(),
      balance,
      currentPrice,
      lastBuyPrice,
      lastSellPrice,
      trades,
    });
  } catch (error: any) {
    console.error('Error en /api/status:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


app.get('/api/price', async (req, res) => {
  try {
    if (!tradingBot) {
      return res.status(400).json({ error: 'Bot not initialized' });
    }

    const price = await tradingBot.getCurrentPrice();
    res.json({ price });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Trading bot server running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

let priceUpdateInterval: NodeJS.Timeout;

async function startPriceUpdates() {
  priceUpdateInterval = setInterval(async () => {
    if (tradingBot) {
      try {
        const price = await tradingBot.getCurrentPrice();
        const balance = await tradingBot.getBalance();

        broadcastToClients({
          type: 'price_update',
          data: {
            price,
            timestamp: Date.now(),
            balance,
            lastBuyPrice: tradingBot.getLastBuyPrice(),
            lastSellPrice: tradingBot.getLastSellPrice(),
          },
        });
      } catch (error) {
        console.error('Failed to update price:', error);
      }
    }
  }, 2000);
}

startPriceUpdates();

process.on('SIGINT', () => {
  if (tradingBot) {
    tradingBot.stop();
  }
  clearInterval(priceUpdateInterval);
  server.close();
  process.exit(0);
});
