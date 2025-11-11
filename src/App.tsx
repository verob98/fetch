import { useState, useEffect } from 'react';
import { ConfigForm } from './components/ConfigForm';
import { TradingDashboard } from './components/TradingDashboard';
import { PriceChart } from './components/PriceChart';
import { TradeHistory } from './components/TradeHistory';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './services/api';
import { BotConfig, BotStatus, PricePoint } from './types';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<BotStatus>({
    initialized: false,
    isRunning: false,
  });
  const [initialCapital, setInitialCapital] = useState(0);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { currentPrice, isConnected } = useWebSocket('ws://localhost:3001');

  useEffect(() => {
    if (currentPrice && isInitialized) {
      setPriceHistory((prev) => {
        const newPoint: PricePoint = {
          timestamp: Date.now(),
          price: currentPrice,
          change: prev.length > 0 ? currentPrice - prev[prev.length - 1].price : 0,
        };

        if (status.lastSellPrice && currentPrice < status.lastSellPrice) {
          const drop = status.lastSellPrice - currentPrice;
          newPoint.signal = 'buy';
          newPoint.changeAmount = drop;
        }

        if (status.lastBuyPrice && currentPrice > status.lastBuyPrice) {
          const rise = currentPrice - status.lastBuyPrice;
          newPoint.signal = 'sell';
          newPoint.changeAmount = rise;
        }

        const updated = [...prev, newPoint];
        return updated.slice(-50);
      });
    }
  }, [currentPrice, isInitialized, status.lastBuyPrice, status.lastSellPrice]);

  useEffect(() => {
    if (isInitialized) {
      const interval = setInterval(async () => {
        try {
          const newStatus = await api.getStatus();
          setStatus(newStatus);
        } catch (error) {
          console.error('Failed to fetch status:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const handleInitialize = async (config: BotConfig) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await api.initialize(config);

      if (result.success) {
        setIsInitialized(true);
        setInitialCapital(config.inversionInicial);

        const newStatus = await api.getStatus();
        setStatus(newStatus);

        setSuccess('Bot inicializado correctamente y conectado a Kraken');
      } else {
        setError('No se pudo conectar a Kraken. Verifica tus credenciales API.');
      }
    } catch (err: any) {
      setError(`Error al inicializar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await api.start();
      const newStatus = await api.getStatus();
      setStatus(newStatus);
      setSuccess('Bot iniciado correctamente');
    } catch (err: any) {
      setError(`Error al iniciar bot: ${err.message}`);
    }
  };

  const handleStop = async () => {
    try {
      await api.stop();
      const newStatus = await api.getStatus();
      setStatus(newStatus);
      setSuccess('Bot detenido');
    } catch (err: any) {
      setError(`Error al detener bot: ${err.message}`);
    }
  };

  const handleBuyManual = async () => {
    try {
      if (!status.balance || !currentPrice) {
        setError('No hay datos disponibles para ejecutar la compra');
        return;
      }

      const investmentAmount = (status.balance.eur * 10) / 100;
      const btcAmount = investmentAmount / currentPrice;

      if (btcAmount < 0.0001) {
        setError('Monto de compra muy pequeño');
        return;
      }

      await api.buyManual(btcAmount, currentPrice);
      const newStatus = await api.getStatus();
      setStatus(newStatus);
      setSuccess('Compra manual ejecutada');
    } catch (err: any) {
      setError(`Error en compra manual: ${err.message}`);
    }
  };

  const handleSellManual = async () => {
    try {
      if (!status.balance || !currentPrice) {
        setError('No hay datos disponibles para ejecutar la venta');
        return;
      }

      if (status.balance.btc <= 0) {
        setError('No hay BTC disponible para vender');
        return;
      }

      await api.sellManual(status.balance.btc, currentPrice);
      const newStatus = await api.getStatus();
      setStatus(newStatus);
      setSuccess('Venta manual ejecutada');
    } catch (err: any) {
      setError(`Error en venta manual: ${err.message}`);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <Activity className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Bot de Trading BTC</h1>
            <p className="text-gray-600">Conectado a Kraken</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <ConfigForm onSubmit={handleInitialize} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Activity className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Bot de Trading BTC</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-gray-600">
              {isConnected ? 'Conectado a Kraken' : 'Desconectado'}
            </span>
            {currentPrice && (
              <span className="ml-4 font-semibold text-gray-800">
                Precio actual: €{currentPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-6xl mx-auto">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-6xl mx-auto">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-6">
          <TradingDashboard
            status={status}
            onStart={handleStart}
            onStop={handleStop}
            onBuyManual={handleBuyManual}
            onSellManual={handleSellManual}
            initialCapital={initialCapital}
          />

          <div className="max-w-6xl mx-auto">
            <PriceChart data={priceHistory} />
          </div>

          <div className="max-w-6xl mx-auto">
            <TradeHistory trades={status.trades || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
