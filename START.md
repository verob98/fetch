# Guía Rápida de Inicio

## Pasos para ejecutar el Bot de Trading BTC

### 1. Instalar dependencias (solo la primera vez)
```bash
npm install
```

### 2. Iniciar el servidor backend
Abre una terminal y ejecuta:
```bash
npm run server
```

El servidor se iniciará en `http://localhost:3001`

**IMPORTANTE**: Deja esta terminal abierta

### 3. Iniciar la aplicación frontend
Abre una NUEVA terminal (sin cerrar la anterior) y ejecuta:
```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

### 4. Configurar el Bot

En tu navegador verás un formulario con los siguientes campos:

1. **Inversión Inicial (EUR)**: Tu capital inicial total (ej: 100)
2. **Monto Mínimo de Seguridad (EUR)**: Capital mínimo para seguir operando (ej: 50)
3. **Porcentaje de Inversión (%)**: Qué % de tu liquidez usar por compra (ej: 10)
4. **API Key de Kraken**: Tu clave pública de Kraken
5. **Clave Privada de Kraken**: Tu clave privada de Kraken

### 5. Obtener credenciales de Kraken

1. Ve a https://www.kraken.com
2. Inicia sesión en tu cuenta
3. Ve a **Configuración → API**
4. Crea una nueva API Key con estos permisos:
   - ✅ Query Funds
   - ✅ Create & Modify Orders
   - ✅ Query Open/Closed Orders
5. Copia tu **API Key** y **Private Key**

### 6. Inicializar el Bot

1. Pega tus credenciales en el formulario
2. Haz clic en **"Inicializar Bot"**
3. Espera la confirmación de conexión exitosa

### 7. Usar el Bot

Una vez inicializado, verás el panel de trading con:

#### Controles Principales:
- **Iniciar Bot**: Activa el trading automático
- **Detener Bot**: Desactiva el trading automático
- **Comprar BTC Manualmente**: Ejecuta una compra inmediata
- **Vender BTC Manualmente**: Ejecuta una venta inmediata

#### Información en Tiempo Real:
- BTC en cartera
- Liquidez en EUR
- Capital total
- Resultados del trading (ganancia/pérdida)
- Gráfica de precios con señales de compra/venta
- Historial completo de operaciones

## Reglas del Bot Automático

### Compra:
- ✅ Solo si el capital total ≥ monto mínimo de seguridad
- ✅ Solo si el precio actual ≤ último precio de venta
- ✅ Usa el % de inversión configurado
- ✅ Cancela órdenes con peor precio y crea mejores

### Venta:
- ✅ Solo si hay BTC en cartera
- ✅ Solo si la ganancia neta > 0 (después de comisiones)
- ✅ Vende todo el BTC disponible
- ✅ Cancela órdenes con menor ganancia y crea mejores

### Detención Automática:
- 🛑 Se detiene si capital < monto mínimo de seguridad

## Operaciones Manuales

Los botones de compra y venta manual están SIEMPRE disponibles, incluso con el bot detenido.

- **Comprar BTC Manualmente**: Usa las mismas reglas de compra automática
- **Vender BTC Manualmente**: Usa las mismas reglas de venta automática

## Gráfica de Precios

La gráfica muestra:
- **Línea Roja**: Precio subió
- **Línea Verde**: Precio bajó
- **Línea Amarilla**: Precio sin cambios
- **C (verde)**: Señal de compra (precio bajo ideal)
- **V (roja)**: Señal de venta (precio alto ideal)

## Solución de Problemas

### Error de conexión:
- Verifica que el servidor backend esté corriendo
- Verifica tus credenciales de Kraken
- Verifica que los permisos de la API Key sean correctos

### El bot no opera:
- Verifica que el bot esté iniciado (botón verde "Iniciar Bot")
- Verifica que tengas saldo suficiente en Kraken
- Verifica que el capital total ≥ monto mínimo de seguridad

### Desconexión de WebSocket:
- El sistema se reconecta automáticamente cada 2 segundos
- Si persiste, reinicia el servidor backend

## Seguridad

- ❌ NUNCA compartas tus API Keys
- ✅ Las credenciales se usan solo para conectar a Kraken
- ✅ No se almacenan en ningún archivo
- ✅ Todo se mantiene en memoria durante la sesión
- ✅ Al cerrar la aplicación, todo se borra

## Notas Importantes

- El bot opera con datos 100% en tiempo real de Kraken
- Las operaciones pueden tardar unos segundos en procesarse
- Las comisiones de Kraken (~0.26%) se calculan automáticamente
- El bot verifica que todas las operaciones sean rentables antes de ejecutar
