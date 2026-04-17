# Tareas del Proyecto Proyección

## Completadas
- [x] Vista sencilla y detallada operativas con layout dividido.
- [x] Carretilla por solicitud global (máquina, modelo, serie y sección unificadas).
- [x] Campo Ubicación y Nombre Útil persistentes localmente, expandidos a todo el ancho y listos para dos líneas.
- [x] Botones explícitos de `+1` y `➕` agregados en ambas vistas, desactivando el click intrusivo de toda la fila.
- [x] Compactadas al máximo las columnas de la Vista Detallada, incluyendo Cuartiles y Fechas en formato multilinea.

## Nuevas Epicas de Funcionalidad (Completadas)
- [x] **Ingresos Manuales:** Añadido campo extra `Ing. Manual` en la tabla persistente entre cargas. Al hacer clic abre un pequeño Modal pidiendo Cantidad y Fecha, y se dibuja inmediatamente como un bloque verde. (Fila 1)
- [x] **Salidas Rápidas Locales (Bypass):** Añadido columna final `🏃 Salidas` con mini-botones `-` y `+` para registro rápido. 
- [x] **Modal de Salida Rápida:** Al oprimir `-` a un registro, solicita "Máquina" y "Sección" al igual que las solicitudes de compra. El botón central muestra la suma de los bypass locales.
- [x] **Historial y Limpieza Automática de Salidas Locales:** Al dar clic en el número de salidas de un repuesto, se despliega el registro histórico de esa máquina/sección. Este registro se reiniciará/limpiará automáticamente cuando se suba un nuevo CSV de inventario que ya tenga reflejado los cambios de stock.

## Propuestas para iterar
- (Inventario rápido local desplegado. Listo para etapa de auditoría.)