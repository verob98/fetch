import { useState } from 'react';
import { BotConfig } from '../types';
import { Settings, Lock, Key } from 'lucide-react';

interface ConfigFormProps {
  onSubmit: (config: BotConfig) => void;
  isLoading: boolean;
}

export function ConfigForm({ onSubmit, isLoading }: ConfigFormProps) {
  const [config, setConfig] = useState<BotConfig>({
    inversionInicial: 100,
    montoMinimoSeguridad: 50,
    porcentajeInversion: 10,
    apiKey: '',
    privateKey: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Bot</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inversión Inicial (EUR)
          </label>
          <input
              type="number"
  step="0.01"
  value={config.inversionInicial}
  onChange={(e) => {
    const value = e.target.value;
    setConfig({
      ...config,
      inversionInicial: value === '' ? 0 : parseFloat(value),
    });
  }}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto Mínimo de Seguridad (EUR)
          </label>
          <input
            type="number"
            step="0.01"
            value={config.montoMinimoSeguridad}
            onChange={(e) =>
              setConfig({ ...config, montoMinimoSeguridad: parseFloat(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Porcentaje de Inversión (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.porcentajeInversion}
            onChange={(e) =>
              setConfig({ ...config, porcentajeInversion: parseFloat(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key de Kraken
            </div>
          </label>
          <input
            type="text"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Clave Privada de Kraken
            </div>
          </label>
          <input
            type="password"
            value={config.privateKey}
            onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Conectando...' : 'Inicializar Bot'}
        </button>
      </form>
    </div>
  );
}
