# Habita Energía — monitoreo y comparación simulados

Aplicación académica de José Iván Rosado Serrano, Universidad de La Guajira.

**Todos los datos son sintéticos. No hay sensores ni actuadores conectados y las diferencias de consumo no demuestran ahorros reales.**

## Usar la aplicación

Enlace: https://jhosepivanof-ai.github.io/habita-energia/

1. Al abrir, el motor reproduce el día de 00:00 a 19:30 y muestra esas lecturas. Luego avanza dos minutos simulados por segundo; puede pausarse o acelerarse.
2. Cambia entre rutina, espacio vacío, visita de tres personas y descanso. Movimiento, conteo simulado y probabilidad futura se muestran por separado. El modelo usa presencia binaria; el conteo no se atribuye a un sensor PIR.
3. Los interruptores aplican órdenes manuales desde ese instante. Añadir, retirar o apagar equipos no reescribe lecturas anteriores. Los equipos añadidos se guardan en este navegador.
4. La automatización apaga el aire cuando el modelo estima probabilidad menor que su umbral de validación (37,5 %), no se detecta actividad durante la espera configurada y no está activo el escenario descanso. La orden manual o un cambio de regla comienza un nuevo tiempo de espera. El registro explica cada apagado. Cuando vuelve el movimiento, se libera el bloqueo y se recupera el horario o estado manual; esto no obliga a encender el aire fuera de su horario.
5. La gráfica muestra únicamente el tiempo registrado; el tramo futuro queda vacío. Cada día completo conserva 1440 lecturas; el selector permite revisar hasta siete días completos de la sesión y el actual.
6. Descarga CSV para conservar las lecturas. **Recargar la página o pulsar Reiniciar borra el historial de la sesión.** Reiniciar comienza a las 00:00 y conserva inventario, escenario y preferencias de control.

## Qué compara el tablero

Se ejecutan dos escenarios con igual inventario, horarios y acciones manuales: una referencia sin automatización y otro que recibe las acciones automáticas. La referencia no cambia retrospectivamente cuando actúa un control. Energía por minuto: `potencia_W / 60000`, sumada a lo largo del periodo registrado. La diferencia es `referencia_kWh - control_kWh` y su valoración monetaria usa la tarifa supuesta actual, editable. Esto es una comparación dentro de una simulación, no un experimento físico antes/después. No estima eficiencia térmica ni cuantifica confort; menos energía puede representar menos climatización.

Potencias: aire 953 W nominales según placa; dos lámparas 18 W supuestos por unidad; televisor 56 W provisional de una referencia Caixun similar, sin identificación del modelo del piloto. Los factores de variación de potencia y el ambiente son funciones de demostración, no curvas medidas. El horario del día se repite. Los cambios de ocupación constituyen escenarios ilustrativos, no una validación del modelo con nuevas observaciones.

## Modelo y rúbrica

`model.json` conserva la regresión logística entrenada con 4031 registros sintéticos, partición cronológica 60/20/20 y comparación contra persistencia. La aplicación carga coeficientes reales del modelo y muestra entrada → probabilidad → regla → acción, con sus limitaciones. La automatización y la recomendación usan el mismo umbral. Las métricas publicadas pertenecen al conjunto sintético de prueba, no al día del tablero: persistencia tuvo mayor exactitud y menor costo supuesto en prueba; el modelo tuvo mejor Brier y menos apagados con ocupantes. La mejora del tablero no implica superioridad demostrada del modelo ni permite cambiar esas métricas.

## Ejecutar y verificar localmente

Con Node.js 20 o posterior, sin instalar paquetes:

```text
node server.mjs
```

Abre `http://localhost:8080`. Pruebas del motor:

```text
node --test tests/simulation.test.cjs
```

La prueba opcional `tests/browser-smoke.cjs` usa Playwright y Edge. Define `HABITA_PLAYWRIGHT` con el nombre o ruta del paquete Playwright disponible en tu equipo antes de ejecutarla.

## Asistente

Con `apiBase` vacío en `config.json`, el asistente da análisis local limitado y lo identifica. Si existe un servidor privado, configura su URL HTTPS y el código de acceso solicitado por ese servicio. Una URL o un código guardado solo muestran “Conexión pendiente de comprobar”. El indicador “Respuesta de DeepSeek” aparece al recibir una respuesta válida; si falla, se identifica explícitamente el análisis local.

GitHub Pages sirve archivos estáticos y no ejecuta `server.mjs`. La clave de DeepSeek debe mantenerse en variables privadas del servidor, nunca en HTML, JavaScript, CSV ni GitHub. Esta actualización no publica claves ni habilita un nuevo servicio de pago. El servidor local opcional puede usar `DEEPSEEK_API_KEY` y `ALLOWED_ORIGINS` para pruebas controladas; no debe desplegarse públicamente sin protección y límites adecuados.

## Evolución física

Conectar ESP32, BME680, detección de movimiento/presencia y medición por equipo; elegir por separado el método de conteo de personas; guardar fecha, zona horaria, calidad y unidad de las lecturas; validar el modelo con datos reales; incorporar objetivos de confort, protecciones del compresor y control manual; comparar periodos físicos con y sin automatización considerando clima, ocupación y uso del espacio.
