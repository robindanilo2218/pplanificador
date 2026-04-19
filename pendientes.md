# Pendientes y Propuestas

## En Progreso / Completado
- [x] Restaurar barras verticales en Solicitud Actual (estética de barras dobles).
- [x] Implementar Sparklines de tendencia de consumo en columna Proyección.
- [x] Restaurar vincularDatosMaquina (autocompletado inteligente).
- [x] Limpiar duplicados de IDs y Modales en el DOM.
- [x] Corregir errores de sintaxis y limpiar fragmentos de código rotos en Proyección.
- [x] Verificación de preservación de componentes (Datalists, Modal Historial Busquedas, Licencia MIT) y fix en onclick handlers.
- [x] Restaurar sugerencias de autocompletado nativas en los campos de Máquina y Sección (Datalists).
- [x] Corregir desbordamiento visual en "Solicitud" (scroll independiente para items del carrito).
- [x] Eliminar solicitudes históricas con PIN de seguridad.
- [x] Campos Nombre Útil y Ubicación: textarea multilínea (max 3 filas) en Vista Sencilla y Vista Detallada.
- [x] Restaurar event listeners de barra de búsqueda y filtros globales.
- [x] Restaurar funcionalidad de Salidas (Bypass) e Ingresos Manuales directos desde la tabla.
- [x] Restaurar funcionalidades de gestión: Botón "Borrar Todo" (PIN de Suguridad 1234), exportar Backup JSON y restaurar Backup JSON.
- [x] Mejoras de email: Link "mailto" abriendo en pestaña nueva (`_blank`) y dobles tabulaciones (`\t\t`) intercolumnas al copiar solicitud formato texto.

## Propuestas de Iteración
1. **Modularización (Refactorización de Código)**: El archivo `index.html` ya tiene demasiadas líneas, dificultando la lectura de la interfaz y la depuración; se sugiere dividirlo mínimo en `app.js` (procesos y lógicas) e `index.html` (vistas).
2. **Generación directa de reportes Excel específicos**: En vez de generar solo un volcado global del inventario, se podría agregar un módulo que exporte métricas de consumo por máquina o grupo a un dashboard con gráficas integradas para presentar a gerencia.
