# Habita Energía — demostración web

Tablero claro con tarjetas de equipos, gráficas, predicción académica y un ciclo sintético de 24 horas. **Ninguna cifra procede de sensores ni demuestra ahorro.** Los interruptores afectan solo la simulación.

## Abrir localmente

Con Node.js 20 o posterior:

```text
node server.mjs
```

Abre `http://localhost:8080`. No se necesitan paquetes externos. Sin clave de IA, el asistente da respuestas locales limitadas y así lo indica.

Para probar la conversación con DeepSeek, define `DEEPSEEK_API_KEY` como variable de entorno privada antes de arrancar el servidor. No la copies a `config.json`, HTML, JavaScript ni GitHub. El servidor hace la llamada a DeepSeek y limita la longitud y frecuencia de consultas. La API puede generar cargos en la cuenta del proveedor.

## Publicación en GitHub Pages

GitHub Pages publica los archivos estáticos (`index.html`, `styles.css`, `app.js`, `config.json` y `model.json`). La simulación, el inventario y la predicción funcionan allí. **GitHub Pages no ejecuta `server.mjs`**: para disponer de chat libre con DeepSeek desde la página pública hace falta alojar el servidor privado en otro servicio y configurar su URL HTTPS en `config.json`, además de permitir el origen de la página en `ALLOWED_ORIGINS`. Mientras no exista ese servidor, la interfaz identifica la respuesta como análisis local. Nunca publiques una clave compartida en el navegador.

## Supuestos

- Aire Wind Cool: 953 W nominales, según placa del piloto. La simulación aplica ciclos de encendido y una variación arbitraria cuando está encendido; no es una curva medida.
- Dos lámparas: 18 W nominales cada una, 36 W en grupo.
- Televisor de 32 pulgadas: 56 W provisional basado en una referencia Caixun similar, **no en el modelo identificado del usuario**. Reemplazar con la potencia de su etiqueta o una medición antes de evaluar el espacio.
- Temperatura, humedad, ocupación, horarios y estados de equipos: generados localmente para demostración. El día reinicia en bucle. La energía diaria se integra a partir de estas potencias supuestas.
- Regresión logística en `model.json`: entrenada y evaluada con datos sintéticos. En la prueba sintética, una regla simple tuvo mayor exactitud y menor costo de decisión supuesto. No automatiza equipos.

## Evolución prevista

Conectar ESP32, BME680, medición eléctrica por equipo y una fuente verificable de ocupación; almacenar lecturas con fecha, zona horaria, unidad y calidad; reevaluar el modelo con observaciones reales; comparar periodos antes y después de automatizar sin atribuir cambios al sistema sin control de factores externos.

