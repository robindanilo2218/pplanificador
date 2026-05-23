# Pendientes y Propuestas

## En Progreso / Completado
- [x] Corregir la conectividad offline (PWA Service Worker) cacheando el motor del app para que no reporte error de red y siga 100% funcional.
- [x] **Arranque en frío offline (Cold Start)**: Service Worker v3 con pre-caché solo local (Promise.allSettled), Cache-First y fallback a index.html. La app arranca sin internet desde un reinicio de Windows.
- [x] Persistir lista de la "Solicitud Actual" en LocalStorage para evitar recargas perdidas en caso de actualizar la PWA inadvertidamente.
- [x] Modal de "Agregar Repuesto Nuevo" con campos completos (descripción, No. Parte, cantidad, máquina, sección, urgencia, observaciones) y diferenciación visual verde con badge ✨ NUEVO en el carrito.
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
- [x] **Fix persistencia de historial en Backup JSON**: `guardarCompraEnHistorial` no esperaba `tx.oncomplete` de IndexedDB, las solicitudes enviadas nunca se guardaban y el backup salía vacío en historial. Corregido.
- [x] **Integridad de datos en email, PDF e impresiones**: `fechaSug` ahora aparece en todos los formatos de salida (texto ASCII, tabla HTML, mailto body, PDF historial); `nombreUtil` incluido en objetos del carrito y visible en email/PDF; repuestos nuevos guardan `urgencia` como campo propio; re-envío con editor muestra `fechaSug` y `nombreUtil`.
- [x] Mejoras de email: Link "mailto" abriendo en pestaña nueva (`_blank`) y dobles tabulaciones (`\t\t`) intercolumnas al copiar solicitud formato texto.
- [x] **Modularización (Refactorización de Código)**: El archivo `index.html` ya tiene demasiadas líneas, dificultando la lectura de la interfaz y la depuración; se dividió el código en `app.js` (procesos y lógicas) e `index.html` (vistas).
- [x] **Vinculación de imágenes locales y Vista Catálogo**: Selección y reconexión de carpetas locales (vía File System Access API persistido en IndexedDB), con escaneo recursivo completo (incluyendo marcas/números de parte y soporte para imágenes adicionales en carrusel). Se creó la Vista Catálogo (tipo tienda online con grid adaptativo y botones rápidos de añadir al carrito) e integración en detalles y nuevos ítems.
- [x] **Repuestos en Máquina (Árbol Multidimensional)**: Estructura jerárquica colapsable pre-poblada (`Corrugadora Guatemala S.A.` -> Líneas LC/LI -> Máquinas -> Equipos -> Sistemas -> Aplicaciones) que vincula códigos de bodega, con persistencia en IndexedDB e integración en el backup/restaurar JSON, y con panel derecho que dibuja fichas técnicas en tiempo real (fotos, stock y carrito) con autocompletado rápido.
- [x] **Diagnóstico de Repuestos en Máquina**: Sistema de diagnóstico en tiempo real que propaga y muestra de forma recursiva la cantidad de piezas faltantes en bodega (rojo) y subnodos no vinculados (amarillo) desde las hojas hasta la raíz del árbol, con soporte para el tipo de nodo repuesto (🧩) bajo aplicaciones (ej. botoneras), edición/clonación/persistencia del campo de cantidad requerida (cantReq), redireccionamiento interactivo click-to-detailed-view de cualquier repuesto al inventario consolidado, y ampliación completa del Backup JSON para salvaguardar el carrito activo y el historial de búsquedas.

## Propuestas de Iteración
1. **Generador de Órdenes de Compra Automáticas por Desabastecimiento**: Agregar un botón rápido en el panel del árbol para añadir al carrito automáticamente todos los repuestos diagnosticados en rojo (faltantes) de la máquina o sistema seleccionado, agilizando solicitudes completas de abastecimiento.
2. **Módulo de Mantenimiento Preventivo Planificado**: Generar alertas visuales (badges de colores) en el árbol de máquinas en base a ciclos de vida sugeridos para los repuestos asociados, indicando qué partes del sistema necesitan recambio inminente.