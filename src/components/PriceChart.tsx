import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PricePoint } from '../types';

interface PriceChartProps {
  data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getStrokeColor = (point: PricePoint, index: number): string => {
    if (index === 0) return '#fbbf24';

    const prevPoint = data[index - 1];
    const change = point.price - prevPoint.price;

    if (change > 0) return '#ef4444';
    if (change < 0) return '#10b981';
    return '#fbbf24';
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;

    if (!payload.signal) return null;

    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={payload.signal === 'buy' ? '#10b981' : '#ef4444'} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {payload.signal === 'buy' ? 'C' : 'V'}
        </text>
        {payload.changeAmount && (
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            fill={payload.signal === 'buy' ? '#10b981' : '#ef4444'}
            fontSize="10"
            fontWeight="600"
          >
            {payload.signal === 'buy' ? '-' : '+'}€{Math.abs(payload.changeAmount).toFixed(2)}
          </text>
        )}
      </g>
    );
  };

  const CustomLabel = (props: any) => {
    const { x, y, index, value } = props;

    if (index === 0) return null;

    const prevPoint = data[index - 1];
    const change = value - prevPoint.price;

    if (Math.abs(change) < 0.01) {
      return (
        <text x={x} y={y - 10} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="600">
          0
        </text>
      );
    }

    return (
      <text
        x={x}
        y={y - 10}
        textAnchor="middle"
        fill={change > 0 ? '#ef4444' : '#10b981'}
        fontSize="10"
        fontWeight="600"
      >
        {change > 0 ? '+' : ''}€{change.toFixed(2)}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Precio BTC en Tiempo Real</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <Tooltip
            formatter={(value: number) => [`€${value.toFixed(2)}`, 'Precio']}
            labelFormatter={formatTime}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px',
            }}
          />
          {data.map((point, index) => {
            if (index === 0) return null;

            const prevPoint = data[index - 1];
            const segmentData = [prevPoint, point];
            const color = getStrokeColor(point, index);

            return (
              <Line
                key={`segment-${index}`}
                data={segmentData}
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}
          <Line
            dataKey="price"
            stroke="transparent"
            strokeWidth={0}
            dot={<CustomDot />}
            label={<CustomLabel />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500"></div>
          <span className="text-gray-600">Subida</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500"></div>
          <span className="text-gray-600">Bajada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-yellow-400"></div>
          <span className="text-gray-600">Sin Cambio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">C</div>
          <span className="text-gray-600">Señal Compra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">V</div>
          <span className="text-gray-600">Señal Venta</span>
        </div>
      </div>
    </div>
  );
}
