import { useState } from 'react';
import { BotStatus } from '../types';
import { Play, Pause, TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';

interface TradingDashboardProps {
  status: BotStatus;
  onStart: () => void;
  onStop: () => void;
  onBuyManual: () => void;
  onSellManual: () => void;
  initialCapital: number;
}

export function TradingDashboard({
  status,
  onStart,
  onStop,
  onBuyManual,
  onSellManual,
  initialCapital,
}: TradingDashboardProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    await onStart();
    setIsStarting(false);
  };

  const tradingResults = status.balance
    ? (status.balance.totalCapital - initialCapital).toFixed(2)
    : '0.00';

  const isProfit = parseFloat(tradingResults) >= 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-medium text-gray-600">BTC en Cartera</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {status.balance?.btc.toFixed(8) || '0.00000000'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-medium text-gray-600">Liquidez (EUR)</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            €{status.balance?.eur.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-600">Capital Total</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            €{status.balance?.totalCapital.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            {isProfit ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <h3 className="text-sm font-medium text-gray-600">Resultados</h3>
          </div>
          <p
            className={`text-2xl font-bold ${
              isProfit ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isProfit ? '+' : ''}€{tradingResults}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Control del Bot</h3>
            <p className="text-sm text-gray-600">
              Estado:{' '}
              <span
                className={`font-semibold ${
                  status.isRunning ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {status.isRunning ? 'Activo' : 'Detenido'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            {!status.isRunning ? (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
              >
                <Play className="w-5 h-5" />
                Iniciar Bot
              </button>
            ) : (
              <button
                onClick={onStop}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                <Pause className="w-5 h-5" />
                Detener Bot
              </button>
            )}
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Operaciones Manuales</h4>
          <div className="flex gap-3">
            <button
              onClick={onBuyManual}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              Comprar BTC
            </button>
            <button
              onClick={onSellManual}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <TrendingDown className="w-5 h-5" />
              Vender BTC
            </button>
          </div>
        </div>

        <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Último Precio de Compra</p>
            <p className="text-lg font-semibold text-gray-800">
              €{status.lastBuyPrice?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Último Precio de Venta</p>
            <p className="text-lg font-semibold text-gray-800">
              €{status.lastSellPrice?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
