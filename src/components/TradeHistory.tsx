import { Trade } from '../types';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Historial de Operaciones</h3>

      {sortedTrades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay operaciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tipo
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Modo
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Precio (EUR)
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Cantidad (BTC)
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Comisión (EUR)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade, index) => (
                <tr
                  key={trade.id || index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {trade.type === 'buy' ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-600">Compra</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-600">Venta</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        trade.isManual
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {trade.isManual ? 'Manual' : 'Automático'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    €{trade.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {trade.amount.toFixed(8)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-600">
                    €{trade.fee.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(trade.timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        trade.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : trade.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {trade.status === 'confirmed'
                        ? 'Confirmado'
                        : trade.status === 'pending'
                        ? 'Pendiente'
                        : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
