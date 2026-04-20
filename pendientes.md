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
- [x] Mejoras de email: Link "mailto" abriendo en pestaña nueva (`_blank`) y dobles tabulaciones (`\t\t`) intercolumnas al copiar solicitud formato texto.
- [x] **Modularización (Refactorización de Código)**: El archivo `index.html` ya tiene demasiadas líneas, dificultando la lectura de la interfaz y la depuración; se dividió el código en `app.js` (procesos y lógicas) e `index.html` (vistas).

## Propuestas de Iteración
1. **Generación directa de reportes Excel específicos**: En vez de generar solo un volcado global del inventario, se podría agregar un módulo que exporte métricas de consumo por máquina o grupo a un dashboard con gráficas integradas para presentar a gerencia.
2. **Dashboard de Resumen Visual de Movimientos**: Construir una vista superior en la versión detallada con gráficas de pastel o barras de estado (por ejemplo, piezas Activas vs Inactivas, o ítems con nivel 0) utilizando alguna librería ligera como Chart.js.
5. **Background Sync para sincronización diferida**: Implementar la API `Background Sync` para encolar las solicitudes de compra generadas offline y enviarlas automáticamente al servidor en cuanto la PC recupere la conexión a internet, sin intervención del usuario.
3. **agregar una o dos vistas mas, vista categoria o vista maquina**
agregar una vista por categorias y hacer un arbol de fichas, puedes usar canvas y html in canvas para ir haciendo manualmente un arbol de categorias donde yo voy escribiendo las categorias que quiero y en esa categoria solo agregar el codigo de bodega y que jale todos los datos, o tambien agregar una vista de fichas o canvas por maquina y seccion de lo que hay en cada maquina y poder agregar manualmente, por ejemplo en categoria principal, por aplicacion donde las aplicaciones serian: sistema de control (botoneria, selectores, pulsadores; sensores, encoder, ), sistema de potencia (variadores, servos, motores, servomotores), sistema de emergencia (controles de seguridad, accesos, botoneria de emergencia, etc), sistema de plc(procesador, entradas, salidas, encoder, analigicas entrada, analogicas salidas, modulos de seguridad), sistema neumatico (valvulas de una via, de dos vias, de tres vias, de cinco vias, sensores de presion, sensores de flujo), sistema hidraulico (valvulas, sensores, etc.), entonces, puede ser una vista de arbol multidimensional de manera general sin importar a que maquina, con que se pueda ver el arbol de todos los tipos de repuesto de acuerdo a los sistemas, y para los que no tienen sistema, buscarle uno o sugerirle uno, ya sea hacerlo automatico o manualmente. 
4. **agregar un repuesto nuevo para solicitarlo**
permite una manera de agregar un item nuevo a la solicitud, pongamos que es un repuesto que nunca hemos tenido, permite agregar manualmente todos esos datos para solicitarlo y que se pueda incluir dentro de una solicitud y que se agregue en el campo nombre util: repuesto primera vez solicitado o nuevo o reciente registro o resistrado recientemente o solicidado recientemente.