# Bot de Trading BTC - Kraken

Bot de trading automático de Bitcoin conectado a Kraken con interfaz visual en tiempo real.

## Características

- Trading automático basado en reglas configurables
- Control manual de compra/venta de BTC
- Visualización en tiempo real de precios y operaciones
- Gráfica de precios con señales de compra/venta
- Historial completo de operaciones
- Conexión segura a Kraken API
- Manejo de rate limits y reconexión automática

## Requisitos Previos

1. Node.js 18 o superior
2. Cuenta de Kraken con API Key y Private Key
3. Saldo en EUR y/o BTC en tu cuenta de Kraken

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Obtener credenciales de Kraken:
   - Inicia sesión en tu cuenta de Kraken
   - Ve a Configuración → API
   - Crea una nueva API Key con permisos de:
     - Query Funds
     - Create & Modify Orders
     - Query Open/Closed Orders

## Ejecución

### Modo Desarrollo

1. Iniciar el servidor backend:
```bash
npm run server
```

2. En otra terminal, iniciar el frontend:
```bash
npm run dev
```

3. Abrir el navegador en `http://localhost:5173`

### Configuración Inicial

1. Ingresa los siguientes parámetros:
   - **Inversión Inicial**: Capital total con el que inicias
   - **Monto Mínimo de Seguridad**: Capital mínimo para seguir operando
   - **Porcentaje de Inversión**: % de liquidez a usar por compra (ej: 10%)
   - **API Key**: Tu clave pública de Kraken
   - **Clave Privada**: Tu clave privada de Kraken

2. Haz clic en "Inicializar Bot"

3. Una vez conectado, podrás:
   - Iniciar/Detener el bot automático
   - Comprar BTC manualmente
   - Vender BTC manualmente
   - Ver el historial de operaciones
   - Monitorear la gráfica de precios en tiempo real

## Reglas de Trading

### Compra Automática
- Solo si el capital total ≥ monto mínimo de seguridad
- Solo si precio actual ≤ último precio de venta
- Usa el % de inversión configurado sobre liquidez actual
- Cancela y reemplaza órdenes con mejor precio

### Venta Automática
- Solo si hay BTC en cartera
- Solo si la ganancia neta (después de comisiones) > 0
- Vende todo el BTC disponible
- Cancela y reemplaza órdenes con mejor ganancia

### Detención Automática
- Se detiene si capital total < monto mínimo de seguridad

## Estructura del Proyecto

```
├── server/              # Backend Node.js
│   ├── bot/            # Motor del trading bot
│   ├── utils/          # Cliente de Kraken
│   ├── types.ts        # Tipos TypeScript
│   └── index.ts        # Servidor Express + WebSocket
├── src/                # Frontend React
│   ├── components/     # Componentes UI
│   ├── hooks/          # Hooks personalizados
│   ├── services/       # Servicios API
│   └── types/          # Tipos TypeScript
```

## Seguridad

- Las credenciales nunca se almacenan localmente
- Todas las operaciones requieren autenticación firmada
- Manejo seguro de rate limits de Kraken
- Reconexión automática en caso de desconexión

## Notas Importantes

- El bot opera en tiempo real con datos directos de Kraken
- No se usa ninguna base de datos externa
- Todas las operaciones se registran en memoria
- Las comisiones de Kraken se calculan automáticamente
- El bot puede tardar unos segundos en procesar órdenes

## Build de Producción

```bash
npm run build
```

El build compila el backend y frontend en el directorio `dist/`.
