# Arquitectura del Bot de Trading BTC

## Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  ConfigForm  │  │   Dashboard  │  │  PriceChart  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │TradeHistory  │  │  useWebSocket│                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WS
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express + WS)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  REST API    │  │  WebSocket   │  │  TradingBot  │      │
│  │  Endpoints   │  │  Server      │  │  Engine      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                            ↓                                │
│                    ┌──────────────┐                         │
│                    │KrakenClient  │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      KRAKEN API                             │
│  • Ticker (Precios)                                         │
│  • Balance (Saldo)                                          │
│  • Open Orders (Órdenes Abiertas)                          │
│  • Closed Orders (Órdenes Cerradas)                        │
│  • Add Order (Crear Orden)                                 │
│  • Cancel Order (Cancelar Orden)                           │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### Frontend (React)

#### 1. ConfigForm
- Formulario de configuración inicial
- Validación de credenciales
- Inicialización del bot

#### 2. TradingDashboard
- Panel de control principal
- Botones de inicio/parada
- Botones de compra/venta manual
- Visualización de balance y capital

#### 3. PriceChart
- Gráfica de precios en tiempo real
- Señales visuales de compra/venta
- Indicadores de cambio de precio
- Usa Recharts para visualización

#### 4. TradeHistory
- Historial completo de operaciones
- Diferenciación entre manual/automático
- Estados de confirmación

#### 5. useWebSocket (Hook)
- Conexión WebSocket al servidor
- Recepción de actualizaciones de precio
- Reconexión automática

### Backend (Node.js)

#### 1. REST API (Express)
Endpoints disponibles:
- `POST /api/initialize` - Inicializar bot
- `POST /api/start` - Iniciar trading automático
- `POST /api/stop` - Detener trading automático
- `POST /api/buy` - Compra manual
- `POST /api/sell` - Venta manual
- `GET /api/balance` - Obtener balance
- `GET /api/status` - Estado completo del bot
- `GET /api/price` - Precio actual de BTC

#### 2. WebSocket Server
- Broadcasting de precios en tiempo real
- Actualizaciones de balance cada 2 segundos
- Gestión de múltiples clientes

#### 3. TradingBot (Clase Principal)

**Propiedades:**
- `config`: Configuración del bot
- `krakenClient`: Cliente de Kraken
- `isRunning`: Estado del bot
- `lastSellPrice`: Último precio de venta
- `lastBuyPrice`: Último precio de compra
- `trades`: Historial de operaciones

**Métodos principales:**
- `initialize()`: Carga operaciones anteriores de Kraken
- `start()`: Inicia el ciclo de trading automático
- `stop()`: Detiene el trading automático
- `executeTradingCycle()`: Ciclo principal cada 10 segundos
- `checkBuyOpportunity()`: Verifica condiciones de compra
- `checkSellOpportunity()`: Verifica condiciones de venta
- `executeBuy()`: Ejecuta una compra
- `executeSell()`: Ejecuta una venta

#### 4. KrakenClient (Clase Utility)

**Responsabilidades:**
- Firma criptográfica de solicitudes privadas
- Manejo de rate limits
- Reconexión automática
- Cálculos de precisión con Big.js

**Métodos principales:**
- `getTicker()`: Obtiene precio actual
- `getBalance()`: Obtiene saldo de EUR y BTC
- `getClosedOrders()`: Historial de órdenes
- `getOpenOrders()`: Órdenes activas
- `placeBuyOrder()`: Crear orden de compra
- `placeSellOrder()`: Crear orden de venta
- `cancelOrder()`: Cancelar orden
- `calculateNetProfit()`: Calcula ganancia neta

## Flujo de Datos

### Inicialización
```
1. Usuario ingresa configuración → ConfigForm
2. ConfigForm → POST /api/initialize → TradingBot
3. TradingBot → KrakenClient.verifyConnection()
4. KrakenClient → Kraken API (Balance)
5. TradingBot.loadLastOperations() → Kraken API (ClosedOrders)
6. Respuesta → Frontend (Conexión exitosa)
```

### Trading Automático
```
Cada 10 segundos:
1. TradingBot.executeTradingCycle()
2. Obtiene balance actual → Kraken API
3. Verifica capital mínimo
4. Obtiene precio actual → Kraken API
5. checkBuyOpportunity():
   - Verifica condiciones
   - Revisa órdenes abiertas
   - Cancela y reemplaza si es necesario
   - Ejecuta compra
6. checkSellOpportunity():
   - Verifica BTC disponible
   - Calcula ganancia neta
   - Revisa órdenes abiertas
   - Cancela y reemplaza si es necesario
   - Ejecuta venta
```

### Actualización en Tiempo Real
```
Cada 2 segundos:
1. Backend → KrakenClient.getTicker()
2. Backend → KrakenClient.getBalance()
3. Backend → WebSocket.broadcast({
     price, balance, timestamp
   })
4. Frontend → useWebSocket recibe
5. Frontend → Actualiza estado
6. React → Re-renderiza componentes
```

## Seguridad

### Autenticación Kraken
```javascript
// Firma HMAC SHA-512
1. Crear nonce (timestamp)
2. Construir mensaje: nonce + postData
3. Hash SHA-256 del mensaje
4. HMAC SHA-512 con private key
5. Incluir en header API-Sign
```

### Rate Limiting
- Mínimo 1 segundo entre requests
- Retry con backoff exponencial
- Queue de requests
- Priorizar WebSocket para precios

## Manejo de Errores

### Estrategias:
1. **Latencia/Timeout**: Anular operación, continuar bot
2. **Rate Limit**: Esperar 3 segundos, reintentar
3. **Capital Insuficiente**: Detener bot automáticamente
4. **Error de API**: Log, anular operación, continuar
5. **WebSocket disconnect**: Reconectar cada 2 segundos

## Tecnologías Utilizadas

### Frontend:
- **React 18**: Framework UI
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Recharts**: Gráficas
- **Lucide React**: Iconos
- **Vite**: Build tool

### Backend:
- **Node.js**: Runtime
- **Express**: Servidor HTTP
- **ws**: WebSocket
- **TypeScript**: Tipado estático
- **Big.js**: Precisión decimal
- **crypto**: Firma HMAC

## Escalabilidad

### Mejoras Futuras:
1. ✅ Base de datos para persistencia (Supabase disponible)
2. ✅ Múltiples pares de trading (BTC/USD, ETH/EUR)
3. ✅ Stop-loss y take-profit configurables
4. ✅ Backtesting con datos históricos
5. ✅ Notificaciones por email/SMS
6. ✅ Dashboard multi-usuario
7. ✅ Estrategias de trading configurables
8. ✅ Machine Learning para predicciones

## Principios de Diseño

1. **OOP**: Clases con responsabilidades claras
2. **Separation of Concerns**: Frontend/Backend separados
3. **Single Responsibility**: Cada clase/componente tiene un propósito
4. **DRY**: Reutilización de código
5. **Type Safety**: TypeScript en todo el proyecto
6. **Real-time First**: Datos siempre de Kraken, nunca cached
7. **Fail-Safe**: Errores no detienen el bot completo
