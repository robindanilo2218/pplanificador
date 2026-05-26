# Tareas del Proyecto Proyección

## Completadas
- [x] Vista sencilla y detallada operativas con layout dividido.
- [x] Carretilla por solicitud global (máquina, modelo, serie y sección unificadas).
- [x] Campo Ubicación y Nombre Útil persistentes localmente.
- [x] Botones explícitos de +1 y + agregados en ambas vistas.
- [x] Gestión de solicitudes: Edición, reenvío multiformato e inclusión de máquina en asunto.
- [x] Vista sencilla inteligente: Algoritmo de score mixto y paginación dinámica.
- [x] UI Refinada: Historial por repuesto, licencia MIT y filtros de ingresos locales.
- [x] Historial de Búsquedas: Modal emergente y persistencia local para recuperación de términos.
- [x] Autocompletado Predictivo: Sugerencias automáticas y vinculación de campos (máquina-sección-modelo) mediante historial.
- [x] Sanidad de Repo: .gitignore y limpieza de archivos temporales.
- [x] Filtro de Sistemas de Planta: Visualización ad-hoc global por tipo de sistema (Potencia/Motores, Control, Neumático, Hidráulico, Seguridad y Otros) respetado dinámicamente en el árbol de máquinas, conteo de desabastecimientos y reportes PDF.
- [x] Modularización de app.js: Separación del código monolítico en 7 módulos de scripts Javascript altamente integrados y secuenciales, eliminando código residual y optimizando rendimiento.
- [x] Visibilidad de Urgencia y Observaciones para Repuestos Nuevos: Integración de lógica en `js/cart-requests.js` para inyectar la prioridad/urgencia y las observaciones/uso en correos plano, HTML, PDF y log histórico.

## Próximas Propuestas
1. **Analítica de Rotación y Pronósticos Visuales:** Desarrollar gráficas interactivas integradas en el modal de detalles usando charts SVG nativos para predecir con mayor precisión las fechas estimadas de stock crítico.
2. **Servicio de Alertas Locales PWA:** Notificar a través de alertas del navegador (Push Notifications offline) al usuario cuando un repuesto vinculado a un sistema de potencia prioritario se encuentre desabastecido o en stock crítico.