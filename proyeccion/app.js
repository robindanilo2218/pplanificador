            // -----------------------------------------------------
            // 1. CONFIGURACIÓN INICIAL Y UTILIDADES GLOBALES
            // -----------------------------------------------------
            const codeRegex = /^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$/;

            let TODOS_LOS_DATOS = [];
            let DATOS_FILTRADOS = [];
            let PUNTERO_PAGINA = 0;
            const REGISTROS_POR_PAGINA = 50;
            let sortAscendente = true;

            let _datosSencillaCurrent = [];
            let _punteroSencilla = 0;
            const _paginaSencilla = 50;
            let _tabSencilla = 'destacados';

            let carrito = [];
            function guardarCarritoLocal() { localStorage.setItem('carritoActivo', JSON.stringify(carrito)); }
            function cargarCarritoLocal() { try { const g = localStorage.getItem('carritoActivo'); if(g) carrito = JSON.parse(g); } catch(e) { carrito = []; } }
            let itemActualSeleccionado = null;
            let _editorSolCache = null;

            let isBodeguero = sessionStorage.getItem('isBodeguero') === 'true';

            const formatQ = (val) => val !== null && val !== undefined ? Math.round(val) : '-';
            function formatFechaCorto(timestamp) {
                if (!timestamp || isNaN(timestamp)) return "-";
                const d = new Date(timestamp);
                if (isNaN(d.getTime())) return "-";
                const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                return localDate.toLocaleDateString('es-GT');
            }

            function renderSparkline(values) {
                if (!values || values.length < 2) return "";
                const width = 80; const height = 15;
                const max = Math.max(...values, 1);
                const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(" ");
                return `<svg width="${width}" height="${height}" class="mt-1 opacity-70"><polyline points="${pts}" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
            }

            function generarNombreUtil(desc) {
                if (!desc) return "";
                let n = desc.toUpperCase();
                const ruido = [/DE BOLAS /g, /NSK/g, /SKF/g, /MARCA /g, /TIPO /g, /RODILLOS /g, /DE AGUJAS /g, /NTN/g, /FAG/g, /TIMKEN/g, /DE CONTACTO ANGULAR/g];
                ruido.forEach(r => n = n.replace(r, ""));
                return n.replace(/\s+/g, ' ').trim();
            }

            function setVista(v) {
                const btnS = document.getElementById('btnTabSencilla');
                const btnD = document.getElementById('btnTabDetallada');
                const secS = document.getElementById('vistaSencilla');
                const secD = document.getElementById('vistaDetallada');

                if (v === 'sencilla') {
                    secS.classList.remove('hidden');
                    secD.classList.add('hidden');
                    secD.classList.remove('w-full');
                    btnS.classList.replace('bg-gray-200', 'bg-blue-600'); btnS.classList.replace('text-gray-800', 'text-white');
                    btnD.classList.replace('bg-blue-600', 'bg-gray-200'); btnD.classList.replace('text-white', 'text-gray-800');
                    if (document.getElementById('busqSencilla') && document.getElementById('busqSencilla').value.trim() !== '') {
                        buscarSencilla();
                    } else {
                        renderSencilla(calcularDatosSencilla());
                    }
                    renderHistorialSencillo();
                    actualizarMiniCarrito();
                } else {
                    secS.classList.add('hidden');
                    secD.classList.remove('hidden');
                    btnD.classList.replace('bg-gray-200', 'bg-blue-600'); btnD.classList.replace('text-gray-800', 'text-white');
                    btnS.classList.replace('bg-blue-600', 'bg-gray-200'); btnS.classList.replace('text-white', 'text-gray-800');
                    ejecutarBusqueda();
                }
            }

            // -----------------------------------------------------
            // 2. BASE DE DATOS LOCAL E HISTORIAL
            // -----------------------------------------------------
            const DB_NAME = 'BodegaDB';
            const STORE_ANALISIS = 'analisisStore';
            const STORE_HISTORIAL = 'historialStore';

            function initDB() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, 3);
                    request.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(STORE_ANALISIS)) db.createObjectStore(STORE_ANALISIS);
                        if (!db.objectStoreNames.contains(STORE_HISTORIAL)) db.createObjectStore(STORE_HISTORIAL, { keyPath: 'id_solicitud' });
                    };
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async function guardarDatos(datos) {
                const db = await initDB();
                const tx = db.transaction(STORE_ANALISIS, 'readwrite');
                tx.objectStore(STORE_ANALISIS).put(datos, 'datosGuardados');
                return new Promise(r => tx.oncomplete = r);
            }

            async function cargarDatos() {
                const db = await initDB();
                return new Promise(r => {
                    const req = db.transaction(STORE_ANALISIS, 'readonly').objectStore(STORE_ANALISIS).get('datosGuardados');
                    req.onsuccess = () => r(req.result);
                    req.onerror = () => r(null);
                });
            }

            async function borrarDatosLocales() {
                const db = await initDB();
                return new Promise(r => {
                    const tx = db.transaction([STORE_ANALISIS, STORE_HISTORIAL], 'readwrite');
                    tx.objectStore(STORE_ANALISIS).delete('datosGuardados');
                    tx.objectStore(STORE_HISTORIAL).clear();
                    tx.oncomplete = r;
                });
            }

            async function exportarBackup() {
                try {
                    const inventario = await cargarDatos() || null;
                    const historial = await obtenerHistorial() || [];
                    const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');

                    const backupObj = {
                        version: "2.0",
                        fecha: new Date().toISOString(),
                        inventario: inventario,
                        historial: historial,
                        borradores: borradores
                    };

                    const nItems = inventario?.resultadosTabla?.length || 0;
                    const nHist = historial.length;
                    const nBorr = borradores.length;

                    const json = JSON.stringify(backupObj);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Backup_Proyeccion_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);

                    alert(`✅ Backup generado correctamente.\n\n📦 Inventario: ${nItems} repuestos\n📜 Historial solicitudes: ${nHist} registros\n📝 Borradores: ${nBorr} guardados\n\nGuarda este archivo en un lugar seguro.`);
                } catch (e) {
                    alert("Error al exportar backup: " + e);
                }
            }

            function restaurarBackup(input) {
                const file = input.files[0];
                if (!file) return;

                const pin = prompt('Ingrese el PIN de seguridad (1234) para restaurar el Backup. Esto REEMPLAZARÁ la base de datos actual en su totalidad:');
                if (pin !== '1234') {
                    if (pin !== null) alert('PIN Incorrecto. Restauración abortada.');
                    input.value = "";
                    return;
                }

                if (!confirm("Restaurar un backup SOBREESCRIBIRÁ todos los datos actuales. ¿Deseas continuar?")) {
                    input.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (!backup.inventario && !backup.historial) {
                            alert("El archivo JSON no tiene el formato de backup válido de esta aplicación.");
                            return;
                        }

                        document.getElementById('zonaImportacion').classList.add('hidden');
                        document.getElementById('pantallaCarga').classList.remove('hidden');
                        document.getElementById('vistaDetallada').classList.add('hidden');
                        document.getElementById('vistaSencilla').classList.add('hidden');

                        const db = await initDB();
                        await new Promise(r => {
                            const tx = db.transaction([STORE_ANALISIS, STORE_HISTORIAL], 'readwrite');
                            if (backup.inventario) tx.objectStore(STORE_ANALISIS).put(backup.inventario, 'datosGuardados');
                            if (backup.historial) {
                                const storeHist = tx.objectStore(STORE_HISTORIAL);
                                storeHist.clear();
                                backup.historial.forEach(h => storeHist.put(h));
                            }
                            tx.oncomplete = r;
                        });

                        // Restaurar borradores desde localStorage
                        if (backup.borradores && Array.isArray(backup.borradores)) {
                            localStorage.setItem('cartBorradores', JSON.stringify(backup.borradores));
                        }

                        // Limpiar carrito activo para evitar mezcla con datos restaurados
                        localStorage.removeItem('carritoActivo');

                        const nItems = backup.inventario?.resultadosTabla?.length || 0;
                        const nHist = (backup.historial || []).length;
                        const nBorr = (backup.borradores || []).length;

                        alert(`✅ Backup restaurado correctamente.\n\n📦 Inventario: ${nItems} repuestos\n📜 Historial: ${nHist} registros\n📝 Borradores: ${nBorr} recuperados\n\nEl sistema se recargará ahora.`);
                        location.reload();
                    } catch (err) {
                        alert("Error al procesar el archivo JSON: " + err);
                    }
                    input.value = "";
                };
                reader.readAsText(file);
            }

            async function procesarGuardadoLocalRapido() {
                const setGrupos = new Set();
                const setMaquinas = new Set();
                TODOS_LOS_DATOS.forEach(d => { setGrupos.add(d.inv.grupo); if (d.maquinasUnicas) d.maquinasUnicas.split(', ').forEach(m => setMaquinas.add(m)); });

                await guardarDatos({ resultadosTabla: TODOS_LOS_DATOS, gruposUnicos: Array.from(setGrupos), maquinasUnicas: Array.from(setMaquinas) });

                if (!document.getElementById('vistaDetallada').classList.contains('hidden')) {
                    document.getElementById('tableBody').innerHTML = "";
                    PUNTERO_PAGINA = 0;
                    renderizarBloqueTabla();
                } else {
                    buscarSencilla(false);
                }
            }

            async function guardarCompraEnHistorial(solicitudId, items, formInfo) {
                try {
                    const db = await initDB();
                    const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                    const store = tx.objectStore(STORE_HISTORIAL);
                    store.put({ id_solicitud: solicitudId, fecha_log: new Date().getTime(), items: items, form: formInfo || {} });
                } catch (error) { console.error("Error guardando historial", error); }
            }

            async function obtenerHistorial() {
                try {
                    const db = await initDB();
                    return new Promise((resolve) => {
                        const tx = db.transaction(STORE_HISTORIAL, 'readonly');
                        const store = tx.objectStore(STORE_HISTORIAL);
                        const req = store.getAll();
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    });
                } catch (error) { return []; }
            }

            function guardarHistorialBusqueda(termino) {
                if (!termino || termino.trim() === '') return;
                let historial = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');
                historial = historial.filter(t => t !== termino);
                historial.unshift(termino);
                if (historial.length > 20) historial.pop();
                localStorage.setItem('historialBusquedas', JSON.stringify(historial));
            }

            function abrirHistorialBusquedas() {
                let historial = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');
                let html = '';
                if (historial.length === 0) {
                    html = '<p class="text-gray-500 text-center py-6 text-sm">No hay búsquedas recientes.</p>';
                } else {
                    html = historial.map(t => {
                        const escaped = t.replace(/'/g, "\\'");
                        return `
                    <div class="flex justify-between items-center p-3 hover:bg-blue-50 cursor-pointer rounded border-b border-gray-100 last:border-0 group transition" onclick="usarBusquedaHistorial('${escaped}')">
                        <span class="text-sm text-gray-700 flex items-center gap-2">🔍 ${t}</span>
                        <button class="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition" onclick="event.stopPropagation(); eliminarHistorialBusqueda('${escaped}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>`;
                    }).join('');
                }
                document.getElementById('historialBusquedaBody').innerHTML = html;
                document.getElementById('modalHistorialBusquedas').classList.remove('hidden');
            }

            function cerrarHistorialBusquedas() {
                const m = document.getElementById('modalHistorialBusquedas');
                if (m) m.classList.add('hidden');
            }

            function usarBusquedaHistorial(t) {
                const vistaActual = !document.getElementById('vistaSencilla').classList.contains('hidden') ? 'sencilla' : 'detallada';
                if (vistaActual === 'sencilla') {
                    document.getElementById('busqSencilla').value = t;
                    buscarSencilla();
                } else {
                    document.getElementById('busquedaTexto').value = t;
                    ejecutarBusqueda();
                }
                cerrarHistorialBusquedas();
            }

            function eliminarHistorialBusqueda(t) {
                let historial = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');
                historial = historial.filter(x => x !== t);
                localStorage.setItem('historialBusquedas', JSON.stringify(historial));
                abrirHistorialBusquedas();
            }

            function limpiarTodoHistorialBusqueda() {
                if (confirm('¿Deseas eliminar todo tu historial de búsquedas?')) {
                    localStorage.removeItem('historialBusquedas');
                    abrirHistorialBusquedas();
                }
            }

            // -----------------------------------------------------
            // 3. MANEJO DE VISTAS (CATÁLOGO SENCILLO Y TABLA DETALLADA)
            // -----------------------------------------------------
            function setSencillaTab(tab) {
                _tabSencilla = tab;
                document.getElementById('busqSencilla').value = '';
                document.getElementById('btnVerTodoSencillo').classList.add('hidden');
                renderSencilla(calcularDatosSencilla());
            }

            function calcularDatosSencilla() {
                const ahora = Date.now();
                const mesMs = 30 * 24 * 3600 * 1000;

                if (_tabSencilla === 'proximos') {
                    return [...TODOS_LOS_DATOS].filter(f => f.proyeccionMs).sort((a, b) => (a.proyeccionMs || Infinity) - (b.proyeccionMs || Infinity));
                }
                if (_tabSencilla === 'todos') {
                    return [...TODOS_LOS_DATOS].sort((a, b) => (a.inv.descripcion || '').localeCompare(b.inv.descripcion || ''));
                }

                return [...TODOS_LOS_DATOS]
                    .map(f => {
                        let score = 0;
                        if (f.demandaAnual) score += Math.min(f.demandaAnual * 2, 40);
                        if (f.inv.ultimaCompra && (ahora - f.inv.ultimaCompra) < mesMs * 2) score += 20;
                        if (f.proyeccionMs) {
                            const diasRestantes = (f.proyeccionMs - ahora) / (24 * 3600 * 1000);
                            if (diasRestantes < 0) score += 35;
                            else if (diasRestantes < 30) score += 25;
                            else if (diasRestantes < 90) score += 10;
                        }
                        if (f.inv.cantidad > 0) score += 5;
                        return { fila: f, score };
                    })
                    .sort((a, b) => b.score - a.score)
                    .map(x => x.fila);
            }

            function buscarSencilla() {
                const term = document.getElementById('busqSencilla').value.toLowerCase().trim();
                if (!term) {
                    document.getElementById('btnVerTodoSencillo').classList.add('hidden');
                    renderSencilla(calcularDatosSencilla());
                    return;
                }
                guardarHistorialBusqueda(term);
                const terms = term.split(/\s+/);
                const filtrados = TODOS_LOS_DATOS.filter(fila => {
                    const text = `${fila.inv.codigo} ${fila.inv.descripcion} ${fila.inv.noParte || ''} ${fila.inv.nombreUtil || ''} ${fila.inv.ubicacion || ''}`.toLowerCase();
                    return terms.every(t => text.includes(t));
                });
                renderSencilla(filtrados);
                document.getElementById('btnVerTodoSencillo').classList.remove('hidden');
            }

            function limpiarBusquedaSencilla() {
                document.getElementById('busqSencilla').value = '';
                document.getElementById('btnVerTodoSencillo').classList.add('hidden');
                renderSencilla(calcularDatosSencilla());
            }

            function _filasSencillaHtml(datos) {
                return datos.map(fila => {
                    return `
                <tr class="border-b hover:bg-blue-50 transition">
                    <td class="p-1">
                        <div class="flex gap-0.5 justify-center items-center">
                            <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Añadir 1 rápido" onclick="simpleAddToCart('${fila.inv.codigo}', 1)">+1</button>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Personalizar" onclick="abrirModalDetalleSencillo('${fila.inv.codigo}')">+</button>
                            <button class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-1 py-1 rounded text-[10px]" title="Ver historial de solicitudes de este repuesto" onclick="verHistorialRepuesto('${fila.inv.codigo}')">📄</button>
                        </div>
                    </td>
                    <td class="p-2 max-w-[100px] break-words"><b>${fila.inv.codigo}</b><br><span class="text-[10px] text-gray-500">${fila.inv.noParte || '-'}</span></td>
                    <td class="p-1 max-w-[200px] align-top">
                        <div class="w-full min-w-[160px] p-1 text-[11px] leading-tight text-gray-800 break-words whitespace-normal break-all">${fila.inv.descripcion}</div>
                    </td>
                    <td class="p-2"><textarea data-codigo="${fila.inv.codigo}" class="in-util w-full border rounded p-1 text-[10px] resize-none leading-tight ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" rows="3" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}>${fila.inv.nombreUtil || ''}</textarea></td>
                    <td class="p-2"><textarea data-codigo="${fila.inv.codigo}" class="in-ubic w-full border rounded p-1 text-[10px] resize-none leading-tight ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" rows="3" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}>${fila.inv.ubicacion || ''}</textarea></td>
                    <td class="p-2 text-center font-bold text-blue-800">${fila.inv.cantidad}</td>
                </tr>`;
                }).join('');
            }

            function renderSencilla(datos) {
                _datosSencillaCurrent = datos || [];
                _punteroSencilla = 0;
                const tbody = document.getElementById('tbodySencilla');
                if (!_datosSencillaCurrent.length) {
                    tbody.innerHTML = "<tr><td colspan='6' class='text-center p-4'>Sin resultados.</td></tr>";
                    document.getElementById('trMostrarMasSencilla').classList.add('hidden');
                    return;
                }
                const bloque = _datosSencillaCurrent.slice(0, _paginaSencilla);
                tbody.innerHTML = _filasSencillaHtml(bloque);
                _punteroSencilla = bloque.length;
                const total = _datosSencillaCurrent.length;
                document.getElementById('trMostrarMasSencilla').classList.toggle('hidden', _punteroSencilla >= total);
            }

            function mostrarMasSencilla() {
                const tbody = document.getElementById('tbodySencilla');
                const bloque = _datosSencillaCurrent.slice(_punteroSencilla, _punteroSencilla + _paginaSencilla);
                tbody.innerHTML += _filasSencillaHtml(bloque);
                _punteroSencilla += bloque.length;
                const total = _datosSencillaCurrent.length;
                document.getElementById('trMostrarMasSencilla').classList.toggle('hidden', _punteroSencilla >= total);
            }

            function renderizarBloqueTabla() {
                const tbody = document.getElementById('tableBody');
                const bloque = DATOS_FILTRADOS.slice(PUNTERO_PAGINA, PUNTERO_PAGINA + REGISTROS_POR_PAGINA);

                bloque.forEach(fila => {
                    const { inv, maquinasUnicas, estado, estadoClase, vecesUsado, primeraSalida, ultimaSalida, qDiasSalidas, proyeccionTexto, proyeccionMs, qConsumo, solFecha, solOrigen } = fila;
                    const tr = document.createElement('tr');

                    tr.className = "hover:bg-blue-50 transition duration-150";

                    tr.innerHTML = `
                    <td class="p-1">
                        <div class="flex gap-1 justify-center items-center">
                            <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px] shadow-sm" title="Añadir 1 rápido" onclick="simpleAddToCart('${inv.codigo}', 1)">+1</button>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px] shadow-sm" title="Personalizar (Máquina, etc)" onclick="abrirModalDetalleSencillo('${inv.codigo}')">➕</button>
                            <button class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-1 py-1 rounded text-[10px] shadow-sm" title="Historial de solicitudes" onclick="verHistorialRepuesto('${inv.codigo}')">📄</button>
                        </div>
                    </td>
                    <td class="p-2 max-w-[120px] break-words"><b>${inv.codigo}</b><br><span class="text-[10px] text-gray-500">${inv.noParte || '-'}</span></td>
                    <td class="p-1 max-w-[200px] align-top">
                        <div class="w-full min-w-[160px] p-1 text-[11px] leading-tight text-gray-800 break-words whitespace-normal break-all">${inv.descripcion}</div>
                    </td>
                    <td><textarea data-codigo="${inv.codigo}" class="in-util w-full min-w-[100px] border rounded p-1 text-xs resize-none leading-tight ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" rows="3" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}>${inv.nombreUtil || ''}</textarea></td>
                    <td><textarea data-codigo="${inv.codigo}" class="in-ubic w-full min-w-[100px] border rounded p-1 text-xs resize-none leading-tight ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" rows="3" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}>${inv.ubicacion || ''}</textarea></td>
                    
                    <td class="text-center p-1 cursor-pointer hover:bg-yellow-50 w-[44px]" data-ingreso-codigo="${inv.codigo}" onclick="abrirModalIngreso('${inv.codigo}')">
                        ${inv.ingresoManual ? `<span class="font-bold text-green-700 text-xs">${inv.ingresoManual.cantidad}</span><br><span class="text-[9px] text-gray-500">${inv.ingresoManual.fecha}</span>` : `<span class="text-[10px] text-gray-300 italic">+</span>`}
                    </td>

                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>
                    
                    <td class="sol-col p-2 text-center text-xs">
                        <span class="inline-block w-2.5 h-2.5 rounded-full shadow-sm mb-1 ${estadoClase.includes('green') ? 'bg-green-400' : estadoClase.includes('yellow') ? 'bg-yellow-400' : estadoClase.includes('red') ? 'bg-red-400' : 'bg-gray-300'}" title="${estado}"></span>
                        <b class="block">${formatFechaCorto(solFecha)}</b>
                        <span class="text-[10px] text-gray-500 font-semibold">${solOrigen}</span>
                    </td>
                    <td class="q-col text-center text-[10px] whitespace-normal max-w-[60px] leading-tight text-gray-600 font-mono tracking-tighter">
                        ${formatQ(qConsumo[0])}<span class="text-gray-300 mx-0.5">|</span>${formatQ(qConsumo[1])}<br>
                        <span class="font-bold text-blue-700 bg-blue-50 px-1 rounded inline-block my-0.5">${formatQ(qConsumo[2])}</span><br>
                        ${formatQ(qConsumo[3])}<span class="text-gray-300 mx-0.5">|</span>${formatQ(qConsumo[4])}
                    </td>
                    <td class="p-2 whitespace-normal"><div class="line-clamp-4 leading-tight text-[10px]" title="${maquinasUnicas}">${maquinasUnicas}</div></td>
                    <td class="text-center p-1 text-xs"><span class="font-bold text-gray-800">${vecesUsado}</span><br><span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-1 rounded">${fila.demandaAnual !== null ? fila.demandaAnual : '-'}</span></td>
                    <td class="text-center p-1 text-xs"><span class="text-gray-500 text-[10px]">P: ${formatFechaCorto(primeraSalida)}</span><br><span class="font-bold border-t mt-1 pt-1 block">U: ${formatFechaCorto(ultimaSalida)}</span></td>
                    <td class="q-col text-center text-[10px] whitespace-normal max-w-[60px] leading-tight text-gray-600 font-mono tracking-tighter">
                        ${qDiasSalidas[0] !== null ? Math.round(qDiasSalidas[0]) : '-'}<span class="text-gray-300 mx-0.5">|</span>${qDiasSalidas[1] !== null ? Math.round(qDiasSalidas[1]) : '-'}<br>
                        <span class="font-bold text-red-600 bg-red-50 px-1 rounded inline-block my-0.5">${qDiasSalidas[2] !== null ? Math.round(qDiasSalidas[2]) : '-'}</span><br>
                        ${qDiasSalidas[3] !== null ? Math.round(qDiasSalidas[3]) : '-'}<span class="text-gray-300 mx-0.5">|</span>${qDiasSalidas[4] !== null ? Math.round(qDiasSalidas[4]) : '-'}
                    </td>
                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight no-print" data-val="${proyeccionMs || 0}">
                        <div class="flex flex-col">
                            <span class="font-bold text-gray-800">${proyeccionTexto}</span>
                            ${fila.resumenMensual ? renderSparkline(fila.resumenMensual) : ''}
                        </div>
                    </td>
                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight hidden print:table-cell">${proyeccionTexto}</td>
                    
                    <td class="text-center p-1 w-20 bg-red-50">
                        <div class="flex items-center justify-between gap-1 w-full relative">
                            <button class="bg-red-500 hover:bg-red-600 text-white rounded w-5 h-5 text-sm font-bold flex items-center justify-center -mt-0.5" onclick="abrirModalSalidaLocal('${inv.codigo}')" title="Registrar una salida">-</button>
                            <span class="font-bold text-gray-800 text-xs cursor-pointer px-1 block w-full text-center hover:bg-red-200 rounded" onclick="verHistorialSalidasLocales('${inv.codigo}')" title="Ver devoluciones / historial">${inv.salidasLocales ? inv.salidasLocales.reduce((acc, s) => acc + s.cantidad, 0) : 0}</span>
                            <button class="bg-gray-400 hover:bg-gray-500 text-white rounded w-5 h-5 text-xs font-bold flex items-center justify-center -mt-0.5" onclick="corregirSalidaLocal('${inv.codigo}')" title="Revertir (Eliminar última salida)">+</button>
                        </div>
                    </td>
                `;
                    tbody.appendChild(tr);
                });

                PUNTERO_PAGINA += bloque.length;
                document.getElementById('countVisibles').innerText = PUNTERO_PAGINA;
                document.getElementById('countTotalFiltrados').innerText = DATOS_FILTRADOS.length;

                if (PUNTERO_PAGINA < DATOS_FILTRADOS.length) { document.getElementById('controlesPaginacion').classList.remove('hidden'); }
                else { document.getElementById('controlesPaginacion').classList.add('hidden'); }
            }

            function ejecutarBusqueda() {
                const fBusqueda = document.getElementById('busquedaTexto').value.toLowerCase().trim();
                if (fBusqueda !== "") guardarHistorialBusqueda(fBusqueda);

                const tipoBusqueda = document.getElementById('tipoBusqueda').value;
                const fStock = document.getElementById('filtroStock').value;
                const fProy = document.getElementById('filtroProyeccion').value;
                const fGrupo = document.getElementById('filtroGrupo').value;
                const fMaquina = document.getElementById('filtroMaquina').value;
                const fEstado = document.getElementById('filtroEstado').value;
                const fUltimaSalida = document.getElementById('filtroUltimaSalida').value;
                const fUltimoIngreso = document.getElementById('filtroUltimoIngreso').value;
                const fDesde = document.getElementById('filtroSalidaDesde').value;
                const fHasta = document.getElementById('filtroSalidaHasta').value;

                const contRango = document.getElementById('contenedorRangoSalidas');
                if (fUltimaSalida === 'rango') { contRango.classList.remove('hidden'); contRango.classList.add('flex'); }
                else { contRango.classList.add('hidden'); contRango.classList.remove('flex'); }

                const now = new Date(); const currentYear = now.getFullYear(); const currentMonth = now.getMonth();

                DATOS_FILTRADOS = TODOS_LOS_DATOS.filter(fila => {
                    let mostrar = true;

                    if (fBusqueda !== "") {
                        const terminos = fBusqueda.split(/\s+/).filter(t => t.length > 0);
                        const textoFila = `${fila.inv.codigo} ${fila.inv.descripcion} ${fila.inv.noParte}`.toLowerCase();
                        if (tipoBusqueda === 'and') { if (!terminos.every(term => textoFila.includes(term))) mostrar = false; }
                        else { if (!terminos.some(term => textoFila.includes(term))) mostrar = false; }
                    }

                    if (mostrar && fGrupo !== 'todos' && fila.inv.grupo !== fGrupo) mostrar = false;
                    if (mostrar && fMaquina !== 'todas' && !fila.maquinasUnicas.toLowerCase().includes(fMaquina.toLowerCase())) mostrar = false;
                    if (mostrar && fEstado !== 'todos' && fila.estado !== fEstado) mostrar = false;

                    if (mostrar) {
                        if (fStock === 'cero' && fila.inv.cantidad !== 0) mostrar = false;
                        else if (fStock === 'uno' && fila.inv.cantidad !== 1) mostrar = false;
                        else if (fStock === 'resto' && fila.inv.cantidad <= 0) mostrar = false;
                    }

                    if (mostrar && fUltimaSalida !== 'todas') {
                        if (!fila.ultimaSalida) mostrar = false;
                        else {
                            const dSalida = new Date(parseFloat(fila.ultimaSalida));
                            const localSalida = new Date(dSalida.getTime() + dSalida.getTimezoneOffset() * 60000);
                            const sYear = localSalida.getFullYear(); const sMonth = localSalida.getMonth();

                            if (fUltimaSalida === 'este_mes' && (sYear !== currentYear || sMonth !== currentMonth)) mostrar = false;
                            else if (fUltimaSalida === 'mes_anterior') {
                                let lMonth = currentMonth - 1; let lYear = currentYear;
                                if (lMonth < 0) { lMonth = 11; lYear--; }
                                if (sYear !== lYear || sMonth !== lMonth) mostrar = false;
                            }
                            else if (fUltimaSalida === 'este_anio' && sYear !== currentYear) mostrar = false;
                            else if (fUltimaSalida === 'anio_anterior' && sYear !== currentYear - 1) mostrar = false;
                            else if (fUltimaSalida === 'rango') {
                                if (fDesde && localSalida.getTime() < new Date(fDesde + "T00:00:00").getTime()) mostrar = false;
                                if (fHasta && localSalida.getTime() > new Date(fHasta + "T23:59:59").getTime()) mostrar = false;
                            }
                        }
                    }

                    if (mostrar && fProy !== 'todas') {
                        if (!fila.proyeccionMs) mostrar = false;
                        else {
                            const dProy = new Date(parseFloat(fila.proyeccionMs));
                            if (fProy === 'este_mes' && (dProy.getFullYear() !== currentYear || dProy.getMonth() !== currentMonth)) mostrar = false;
                            else if (fProy === 'mes_anterior') {
                                let lMonth = currentMonth - 1; let lYear = currentYear;
                                if (lMonth < 0) { lMonth = 11; lYear--; }
                                if (dProy.getFullYear() !== lYear || dProy.getMonth() !== lMonth) mostrar = false;
                            }
                            else if (fProy === 'este_anio' && dProy.getFullYear() !== currentYear) mostrar = false;
                            else if (fProy === 'vencidas') {
                                const todayTS = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                const proyTS = new Date(dProy.getFullYear(), dProy.getMonth(), dProy.getDate()).getTime();
                                if (proyTS > todayTS) mostrar = false;
                            }
                        }
                    }

                    if (mostrar && fUltimoIngreso !== 'todas') {
                        if (!fila.inv.ultimaCompra || fila.inv.ultimaCompra === null) mostrar = false;
                        else {
                            const dIngreso = new Date(parseFloat(fila.inv.ultimaCompra));
                            const iYear = dIngreso.getFullYear(); const iMonth = dIngreso.getMonth();

                            if (fUltimoIngreso === 'este_mes' && (iYear !== currentYear || iMonth !== currentMonth)) mostrar = false;
                            else if (fUltimoIngreso === 'mes_anterior') {
                                let lMonth = currentMonth - 1; let lYear = currentYear;
                                if (lMonth < 0) { lMonth = 11; lYear--; }
                                if (iYear !== lYear || iMonth !== lMonth) mostrar = false;
                            }
                            else if (fUltimoIngreso === 'este_anio' && iYear !== currentYear) mostrar = false;
                            else if (fUltimoIngreso === 'anio_anterior' && iYear !== currentYear - 1) mostrar = false;
                        }
                    }

                    if (mostrar) {
                        const fIngMan = document.getElementById('filtroIngresoManual').value;
                        if (fIngMan !== 'todos') {
                            const im = fila.inv.ingresoManual;
                            if (!im || !im.fecha) { mostrar = false; }
                            else if (fIngMan !== 'con_ingreso') {
                                const parts = im.fecha.split('/');
                                const imYear = parseInt(parts[2]); const imMonth = parseInt(parts[1]) - 1;
                                if (fIngMan === 'este_mes' && (imYear !== currentYear || imMonth !== currentMonth)) mostrar = false;
                                else if (fIngMan === 'mes_anterior') {
                                    let lM = currentMonth - 1; let lY = currentYear;
                                    if (lM < 0) { lM = 11; lY--; }
                                    if (imYear !== lY || imMonth !== lM) mostrar = false;
                                }
                                else if (fIngMan === 'este_anio' && imYear !== currentYear) mostrar = false;
                                else if (fIngMan === 'anio_anterior' && imYear !== currentYear - 1) mostrar = false;
                            }
                        }
                    }

                    return mostrar;
                });

                document.getElementById('tableBody').innerHTML = "";
                PUNTERO_PAGINA = 0;
                renderizarBloqueTabla();
            }

            // -----------------------------------------------------
            // 3b. SALIDAS LOCALES (BYPASS) E INGRESOS MANUALES
            // -----------------------------------------------------
            let currentItemForSalidaLocal = null;

            function abrirModalSalidaLocal(codigo) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (!fila) return;
                currentItemForSalidaLocal = fila;
                document.getElementById('tituloModalSalida').innerText =
                    `Registrar Salida — ${fila.inv.nombreUtil || fila.inv.codigo}`;
                document.getElementById('inputSalidaMaquina').value = '';
                document.getElementById('inputSalidaSeccion').value = '';
                document.getElementById('modalSalidaRapida').classList.remove('hidden');
                setTimeout(() => document.getElementById('inputSalidaMaquina').focus(), 100);
            }

            function cerrarModalSalida() {
                document.getElementById('modalSalidaRapida').classList.add('hidden');
                currentItemForSalidaLocal = null;
            }

            function guardarSalidaRapida() {
                if (!currentItemForSalidaLocal) return;
                const maq = document.getElementById('inputSalidaMaquina').value.trim().toUpperCase() || 'N/A';
                const sec = document.getElementById('inputSalidaSeccion').value.trim().toUpperCase() || 'N/A';
                const inv = currentItemForSalidaLocal.inv;

                if (!inv.salidasLocales) inv.salidasLocales = [];
                inv.salidasLocales.push({ cantidad: 1, maquina: maq, seccion: sec, timestamp: Date.now() });

                // Actualizar cantidad en TODOS_LOS_DATOS
                inv.cantidad = Math.max(0, (inv.cantidad || 0) - 1);

                procesarGuardadoLocalRapido();
                cerrarModalSalida();

                // Refrescar celda de salidas en la tabla activa
                const spanSalida = document.querySelector(`[onclick*="abrirModalSalidaLocal('${inv.codigo}')"]`)
                    ?.closest('td')?.querySelector('span.font-bold');
                if (spanSalida) {
                    spanSalida.innerText = inv.salidasLocales.reduce((a, s) => a + s.cantidad, 0);
                }
            }

            function corregirSalidaLocal(codigo) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (!fila || !fila.inv.salidasLocales || fila.inv.salidasLocales.length === 0)
                    return alert('No hay salidas registradas para revertir.');
                if (!confirm('¿Revertir la ÚLTIMA salida registrada para este ítem?')) return;
                fila.inv.salidasLocales.pop();
                fila.inv.cantidad = (fila.inv.cantidad || 0) + 1;
                procesarGuardadoLocalRapido();
            }

            function verHistorialSalidasLocales(codigo) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (!fila || !fila.inv.salidasLocales || !fila.inv.salidasLocales.length) {
                    return alert('No hay salidas locales registradas para este ítem.');
                }
                const rows = fila.inv.salidasLocales
                    .slice().reverse()
                    .map(s => {
                        const d = new Date(s.timestamp || s.fecha);
                        const ds = isNaN(d) ? '-' : d.toLocaleString('es-GT');
                        return `<tr class="border-b text-xs"><td class="p-1">${ds}</td><td class="p-1 text-center font-bold text-red-600">-${s.cantidad}</td><td class="p-1">${s.maquina || 'N/A'}</td><td class="p-1">${s.seccion || 'N/A'}</td></tr>`;
                    }).join('');

                let m = document.getElementById('modalSalidasLocalesHist');
                if (!m) {
                    m = document.createElement('div');
                    m.id = 'modalSalidasLocalesHist';
                    m.className = 'fixed inset-0 bg-gray-900 bg-opacity-70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm no-print';
                    m.innerHTML = `
                    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div class="bg-red-700 text-white p-3 flex justify-between items-center rounded-t-xl">
                            <h3 class="font-bold text-sm" id="salidasHistTitulo"></h3>
                            <button onclick="document.getElementById('modalSalidasLocalesHist').classList.add('hidden')" class="text-white text-xl font-bold leading-none hover:text-red-200">&times;</button>
                        </div>
                        <div class="overflow-y-auto flex-1 custom-scrollbar p-3">
                            <table class="w-full text-left">
                                <thead class="bg-gray-100 text-xs font-bold sticky top-0">
                                    <tr><th class="p-1">Fecha</th><th class="p-1 text-center">Cant.</th><th class="p-1">Máquina</th><th class="p-1">Sección</th></tr>
                                </thead>
                                <tbody id="salidasHistBody"></tbody>
                            </table>
                        </div>
                    </div>`;
                    document.body.appendChild(m);
                }
                document.getElementById('salidasHistTitulo').innerText = `📤 Salidas: ${codigo}`;
                document.getElementById('salidasHistBody').innerHTML = rows;
                m.classList.remove('hidden');
            }

            // ── Ingreso Manual ─────────────────────────────────────
            let currentItemForIngreso = null;

            function abrirModalIngreso(codigo) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (!fila) return;
                currentItemForIngreso = fila;
                document.getElementById('tituloModalIngreso').innerText =
                    `Ingreso Manual — ${fila.inv.nombreUtil || fila.inv.codigo}`;
                document.getElementById('inputIngresoCant').value = '';
                document.getElementById('inputIngresoFecha').value = new Date().toISOString().slice(0, 10);
                document.getElementById('modalIngresoManual').classList.remove('hidden');
                setTimeout(() => document.getElementById('inputIngresoCant').focus(), 100);
            }

            function cerrarModalIngreso() {
                document.getElementById('modalIngresoManual').classList.add('hidden');
                currentItemForIngreso = null;
            }

            function guardarIngresoManual() {
                if (!currentItemForIngreso) return;
                const cant = parseInt(document.getElementById('inputIngresoCant').value);
                const fecha = document.getElementById('inputIngresoFecha').value;
                if (isNaN(cant) || cant <= 0) return alert('Ingrese una cantidad válida.');
                if (!fecha) return alert('Seleccione la fecha del ingreso.');

                const inv = currentItemForIngreso.inv;
                const [y, m, d] = fecha.split('-');
                inv.ingresoManual = { cantidad: cant, fecha: `${d}/${m}/${y}` };
                inv.cantidad = (inv.cantidad || 0) + cant;

                procesarGuardadoLocalRapido();

                // Actualizar celda de ingreso en la fila visible
                const celdaIngreso = document.querySelector(`td[data-ingreso-codigo="${inv.codigo}"]`);
                if (celdaIngreso) {
                    celdaIngreso.innerHTML = `<span class="font-bold text-green-700 text-xs">${cant}</span><br><span class="text-[9px] text-gray-500">${d}/${m}/${y}</span>`;
                }
                cerrarModalIngreso();
            }

            function borrarIngresoManual() {
                if (!currentItemForIngreso) return;
                if (!confirm('¿Eliminar el ingreso manual de este ítem?')) return;
                const inv = currentItemForIngreso.inv;
                if (inv.ingresoManual) {
                    inv.cantidad = Math.max(0, (inv.cantidad || 0) - inv.ingresoManual.cantidad);
                    inv.ingresoManual = null;
                }
                procesarGuardadoLocalRapido();
                cerrarModalIngreso();
            }

            // -----------------------------------------------------
            // 4. HISTORIAL DE PEDIDOS, PDF Y CARRITO
            // -----------------------------------------------------
            async function verHistorialRepuesto(codigo) {
                const todosHist = await obtenerHistorial();
                const relacionados = todosHist
                    .filter(h => h.items && h.items.some(it => it.codigo === codigo))
                    .sort((a, b) => b.fecha_log - a.fecha_log);

                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                const desc = fila ? (fila.inv.nombreUtil || fila.inv.descripcion) : codigo;

                let html;
                if (!relacionados.length) {
                    html = `<p class="text-gray-400 text-center py-6">No hay solicitudes de compra que inclu&shy;yan este repuesto.</p>`;
                } else {
                    html = relacionados.map(h => {
                        const it = h.items.find(x => x.codigo === codigo);
                        const d = new Date(h.fecha_log);
                        return `<div class="border rounded p-2 mb-1 bg-white text-xs">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-mono font-bold text-indigo-700">${h.id_solicitud}</span>
                            <span class="text-gray-500">${d.toLocaleDateString('es-GT')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>⚙️ ${h.form?.maquina || '-'} | 📍 ${h.form?.seccion || '-'}</span>
                            <span class="font-bold text-orange-600">x${it?.cant || '?'}</span>
                        </div>
                        ${h.form?.tecnico ? `<div class="text-gray-500 mt-0.5">👤 ${h.form.tecnico}</div>` : ''}
                    </div>`;
                    }).join('');
                }

                let modal = document.getElementById('modalHistRepuesto');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'modalHistRepuesto';
                    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print';
                    modal.innerHTML = `
                    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                        <div class="bg-indigo-700 text-white p-3 flex justify-between items-center rounded-t-xl">
                            <h3 class="font-bold text-sm" id="modalHistRepTitle"></h3>
                            <button onclick="document.getElementById('modalHistRepuesto').classList.add('hidden')" class="text-white text-xl font-bold leading-none hover:text-indigo-200">&times;</button>
                        </div>
                        <div id="modalHistRepBody" class="overflow-y-auto p-3 flex-1 bg-indigo-50 custom-scrollbar"></div>
                    </div>`;
                    document.body.appendChild(modal);
                }
                document.getElementById('modalHistRepTitle').innerText = `📄 Historial: ${codigo} — ${desc}`;
                document.getElementById('modalHistRepBody').innerHTML = html;
                modal.classList.remove('hidden');
            }

            function abrirModalDetalleSencillo(codigo) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (fila) abrirModalDetalle(fila);
            }

            function simpleAddToCart(codigo, cant) {
                const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
                if (!fila) return;

                carrito.push({
                    codigo: fila.inv.codigo,
                    noParte: fila.inv.noParte || "-",
                    descripcion: fila.inv.descripcion,
                    cant: parseFloat(cant)
                });
                guardarCarritoLocal();
                actualizarMiniCarrito();
                actualizarBadgeCarrito();
            }

            function actualizarMiniCarrito() {
                const contSenc = document.getElementById('sencillaCarritoItems');
                if (!contSenc) return;
                document.getElementById('sencCount').innerText = carrito.length;

                if (carrito.length === 0) {
                    contSenc.innerHTML = '<div class="text-gray-400 text-center mt-4">Carrito vacío</div>';
                    return;
                }

                const htmlItems = carrito.map((it, i) => `
                <div class="flex items-center gap-2 border-b py-2 pl-1 hover:bg-orange-100/50 transition-all group">
                    <div class="w-1 h-8 bg-orange-400 rounded-full group-hover:bg-orange-600 transition-colors shrink-0"></div>
                    <div class="leading-tight flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <span class="font-bold text-[11px] text-blue-800">${it.codigo}</span>
                            <span class="font-black text-orange-600 bg-orange-100 px-1.5 rounded-sm text-[11px]">${it.cant}</span>
                        </div>
                        <span class="text-[10px] text-gray-600 truncate block" title="${it.descripcion}">${it.descripcion}</span>
                    </div>
                    <div class="w-1 h-8 bg-orange-200 rounded-full group-hover:bg-orange-400 transition-colors mr-1 shrink-0"></div>
                    <button onclick="eliminarDelCarrito('${i}')" class="text-red-400 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-all">❌</button>
                </div>
            `).join('');
                contSenc.innerHTML = htmlItems;
            }

            async function renderHistorialSencillo() {
                const cont = document.getElementById('sencillaHistorialItems');
                if (!cont) return;
                const data = await obtenerHistorial();
                if (data.length === 0) {
                    cont.innerHTML = '<div class="text-gray-400 text-center mt-4">Sin historial</div>';
                    return;
                }

                data.sort((a, b) => b.fecha_log - a.fecha_log);
                const recientes = data.slice(0, 20);

                cont.innerHTML = recientes.map(h => {
                    const d = new Date(h.fecha_log);
                    const itemsCount = h.items ? h.items.length : 0;
                    return `
                <div class="border rounded p-2 hover:bg-indigo-50 transition mb-1 bg-white shadow-sm" data-sol-data='${JSON.stringify(h.items).replace(/'/g, "&#39;")}' data-sol-form='${JSON.stringify(h.form || {}).replace(/'/g, "&#39;")}' data-sol-id="${h.id_solicitud}">
                    <div class="flex justify-between items-center border-b border-indigo-100 pb-1 mb-1 cursor-pointer" onclick="cargarItemsHistorial(this.closest('[data-sol-id]'), '${h.id_solicitud}')">
                        <span class="font-mono font-bold text-indigo-700 text-[10px]">${h.id_solicitud}</span>
                        <span class="text-[9px] text-gray-500">${d.toLocaleDateString()}</span>
                    </div>
                    <div class="text-[10px] flex justify-between items-center mt-1 pt-1 border-t border-indigo-50">
                        <div class="flex flex-col w-1/2 cursor-pointer" onclick="cargarItemsHistorial(this.closest('[data-sol-id]'), '${h.id_solicitud}')">
                            <span class="font-bold text-gray-700 truncate" title="${h.form?.maquina || '-'}">⚙️ ${h.form?.maquina || '-'}</span>
                            <span class="text-gray-500 truncate mt-0.5" title="${h.form?.tecnico || 'Sin técnico'}">👤 ${h.form?.tecnico || 'Sin técnico'}</span>
                            ${h.form?.fechaSug ? `<span class="text-blue-500 truncate mt-0.5">📅 ${h.form.fechaSug}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="bg-indigo-100 text-indigo-800 font-bold px-1 rounded">${itemsCount} ítem(s)</span>
                            <button onclick="reenviarSolicitudHistorial(event, this)" class="bg-blue-500 hover:bg-blue-700 text-white font-bold px-1 py-0.5 rounded text-[9px] transition" title="Reenviar esta solicitud por correo">↩@</button>
                            <button onclick="abrirEditorSolicitud(event, this)" class="text-indigo-500 hover:text-indigo-800 px-1 transition" title="Editar datos">✏️</button>
                            <button onclick="generarPdfHistorial(event, this)" class="text-gray-500 hover:text-blue-700 transition px-1" title="Imprimir PDF">🖨️</button>
                            <button onclick="repetirOrden(event, this)" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-0.5 rounded shadow-sm text-[9px] active:scale-95 transition-transform">Repetir</button>
                            <button onclick="eliminarSolicitudHistorial(event, '${h.id_solicitud}')" class="text-red-500 hover:text-red-700 transition px-1" title="Eliminar registro">🗑️</button>
                        </div>
                    </div>
                </div>`;
                }).join('');
            }

            async function eliminarSolicitudHistorial(event, idSol) {
                event.stopPropagation();
                const pwd = prompt('Ingrese PIN de seguridad para eliminar (1234):');
                if (pwd !== '1234') {
                    if (pwd !== null) alert('PIN Incorrecto. Eliminación abortada.');
                    return;
                }
                if (!confirm('¿Está seguro de eliminar la solicitud ' + idSol + ' de este historial? Esta acción no se puede deshacer.')) return;
                
                try {
                    const db = await initDB();
                    const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                    const store = tx.objectStore(STORE_HISTORIAL);
                    store.delete(idSol);
                    
                    tx.oncomplete = () => {
                        renderHistorialSencillo();
                        if (typeof renderizarHistorial === 'function' && document.getElementById('modalHistorial') && !document.getElementById('modalHistorial').classList.contains('hidden')) {
                            renderizarHistorial();
                        }
                    };
                } catch(e) {
                    alert('Error al eliminar: ' + e);
                }
            }

            function generarPdfHistorial(event, btnElement) {
                event.stopPropagation();
                const card = btnElement.closest('div[data-sol-data]');
                if (!card) return;

                const items = JSON.parse(card.getAttribute('data-sol-data') || "[]");
                const form = JSON.parse(card.getAttribute('data-sol-form') || "{}");
                const idSolSpan = card.querySelector('.font-mono.text-indigo-700').innerText;
                const dateSpan = card.querySelector('span.text-gray-500').innerText;

                const conMetricas = confirm("¿Desea incluir información de análisis (Demanda anual y frecuencia de uso histórico) en el PDF?");

                let printDiv = document.createElement('div');
                printDiv.id = 'cartPrintArea';
                printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 20px;">
                    <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
                        <h1 style="color: #1e3a8a; font-size: 24px; margin:0;">EMPRESAS GALINDO</h1>
                        <h2 style="font-size: 16px; margin: 5px 0 0 0; color:#555;">COPIA SOLICITUD TÉCNICA - ${idSolSpan}</h2>
                    </div>
                    
                    <div style="margin-bottom: 20px; font-size:12px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; background-color: #fdfcf9;">
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            <div style="flex: 1 1 45%;"><strong>No. Solicitud (Ref):</strong> ${idSolSpan}</div>
                            <div style="flex: 1 1 45%;"><strong>Fecha Original:</strong> ${dateSpan}</div>
                            <div style="flex: 1 1 45%;"><strong>Máquina / Destino:</strong> ${form.maquina || 'No especificada'}</div>
                            <div style="flex: 1 1 45%;"><strong>Sección:</strong> ${form.seccion || 'No especificada'}</div>
                            ${form.tecnico ? `<div style="flex: 1 1 45%;"><strong>Técnico Solicita:</strong> ${form.tecnico}</div>` : ''}
                            ${form.modelo ? `<div style="flex: 1 1 45%;"><strong>Modelo:</strong> ${form.modelo}</div>` : ''}
                            ${form.serie ? `<div style="flex: 1 1 45%;"><strong>Serie:</strong> ${form.serie}</div>` : ''}
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background-color: #f3f4f6; text-align: left;">
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">#</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Código / Parte</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Descripción</th>
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">Cant.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${construirFilasParaPdf(items, conMetricas)}
                        </tbody>
                    </table>
                    <div style="margin-top: 60px; text-align: center;">
                        <p>___________________________________</p>
                        <p style="margin-top:5px; font-size:12px;">Copia Histórica de Respaldo</p>
                    </div>
                </div>
            `;

                document.body.appendChild(printDiv);
                document.body.classList.add('printing-cart');
                window.print();
                document.body.classList.remove('printing-cart');
                document.body.removeChild(printDiv);
            }

            function cargarItemsHistorial(el, idSol) {
                document.querySelectorAll('#sencillaHistorialItems > div').forEach(d => {
                    d.classList.remove('bg-indigo-100', 'border-indigo-400');
                    d.classList.add('bg-white');
                });
                el.classList.add('bg-indigo-100', 'border-indigo-400');
                el.classList.remove('bg-white');

                const jsondata = el.getAttribute('data-sol-data');
                const items = JSON.parse(jsondata);

                const codes = items.map(i => i.codigo);
                const filtrados = TODOS_LOS_DATOS.filter(fila => codes.includes(fila.inv.codigo));

                document.getElementById('btnVerTodoSencillo').classList.remove('hidden');
                renderSencilla(filtrados);
            }

            function abrirModalDetalle(fila) {
                itemActualSeleccionado = fila;
                document.getElementById('detDesc').innerText = fila.inv.descripcion;
                document.getElementById('detCodigo').innerText = `COD: ${fila.inv.codigo} | PN: ${fila.inv.noParte || '-'}`;
                document.getElementById('detStock').innerText = fila.inv.cantidad;
                document.getElementById('detEstado').innerHTML = `<span class="badge ${fila.estadoClase} text-xs shadow-sm">${fila.estado}</span>`;
                document.getElementById('detDemanda').innerText = fila.demandaAnual !== null ? fila.demandaAnual : "N/A";
                document.getElementById('detProyeccion').innerText = fila.proyeccionTexto;
                document.getElementById('detPrimeraSalida').innerText = formatFechaCorto(fila.primeraSalida);
                document.getElementById('detUltimaSalida').innerText = formatFechaCorto(fila.ultimaSalida);
                document.getElementById('detQ0').innerText = formatQ(fila.qConsumo[0]);
                document.getElementById('detQ1').innerText = formatQ(fila.qConsumo[1]);
                document.getElementById('detQ2').innerText = formatQ(fila.qConsumo[2]);
                document.getElementById('detQ3').innerText = formatQ(fila.qConsumo[3]);
                document.getElementById('detQ4').innerText = formatQ(fila.qConsumo[4]);
                document.getElementById('detMaquinas').innerText = fila.maquinasUnicas;

                document.getElementById('inpCant').value = 1;
                document.getElementById('inpMaquina').value = '';
                document.getElementById('inpSerie').value = '';
                document.getElementById('inpModelo').value = '';
                document.getElementById('inpSeccion').value = '';
                document.getElementById('inpTecnico').value = '';
                document.getElementById('inpFechaSug').value = new Date().toISOString().split('T')[0];

                document.getElementById('modalDetalle').classList.remove('hidden');
                setTimeout(() => document.getElementById('inpCant').focus(), 100);
            }

            function cerrarModalDetalle() { document.getElementById('modalDetalle').classList.add('hidden'); itemActualSeleccionado = null; }

            function actualizarBadgeCarrito() {
                const badge = document.getElementById('cartBadge');
                const totalItems = carrito.length;
                if (totalItems > 0) { badge.innerText = totalItems; badge.classList.remove('hidden'); }
                else { badge.classList.add('hidden'); }

                const sencBadge = document.getElementById('sencCount');
                if (sencBadge) sencBadge.innerText = totalItems;
            }

            function repetirOrden(event, btnElement) {
                event.stopPropagation();
                const card = btnElement.closest('[data-sol-data]');
                if (!card) return;

                const jsondata = card.getAttribute('data-sol-data');
                const items = JSON.parse(jsondata);

                items.forEach(i => {
                    const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === i.codigo);
                    if (fila) {
                        carrito.push({
                            codigo: fila.inv.codigo,
                            noParte: fila.inv.noParte || "-",
                            descripcion: fila.inv.descripcion,
                            cant: parseFloat(i.cant || 1)
                        });
                    } else if (i.codigo === "CREAR CODIGO NUEVO" || i.codigo === "NUEVO-REGISTRO") {
                        carrito.push({ ...i });
                    }
                });
                guardarCarritoLocal();

                const jsonform = card.getAttribute('data-sol-form');
                if (jsonform) {
                    try {
                        const formObj = JSON.parse(jsonform);
                        if (document.getElementById('gMaquina')) document.getElementById('gMaquina').value = formObj.maquina || '';
                        if (document.getElementById('gModelo')) document.getElementById('gModelo').value = formObj.modelo || '';
                        if (document.getElementById('gSerie')) document.getElementById('gSerie').value = formObj.serie || '';
                        if (document.getElementById('gSeccion')) document.getElementById('gSeccion').value = formObj.seccion || '';
                    } catch (e) { }
                }

                actualizarMiniCarrito();
                actualizarBadgeCarrito();

                const originalText = btnElement.innerText;
                btnElement.innerText = "¡Copiado!";
                btnElement.classList.replace('bg-orange-500', 'bg-green-500');
                btnElement.classList.replace('hover:bg-orange-600', 'hover:bg-green-600');
                setTimeout(() => {
                    btnElement.innerText = originalText;
                    btnElement.classList.replace('bg-green-500', 'bg-orange-500');
                    btnElement.classList.replace('hover:bg-green-600', 'hover:bg-orange-600');
                }, 2000);
            }

            function construirFilasParaPdf(items, conMetricas) {
                let html = "";
                items.forEach((it, idx) => {
                    html += `<tr>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${idx + 1}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;"><b>${it.codigo}</b><br><span style="font-size:10px;">PN: ${it.noParte || '-'}</span></td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${it.descripcion}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center; font-weight:bold;">${it.cant || 1}</td>
                </tr>`;

                    if (conMetricas) {
                        const filaDatos = TODOS_LOS_DATOS.find(f => f.inv.codigo === it.codigo);
                        if (filaDatos) {
                            const deAn = filaDatos.demandaAnual !== null ? filaDatos.demandaAnual : '-';
                            const cVal = filaDatos.qConsumo ? formatQ(filaDatos.qConsumo[2]) : '-';
                            const fVal = filaDatos.qDiasSalidas && filaDatos.qDiasSalidas[2] !== null ? Math.round(filaDatos.qDiasSalidas[2]) : '-';
                            const proxD = filaDatos.proyeccionTexto || '-';

                            html += `<tr><td colspan="4" style="border: 1px solid #ccc; border-top: none; padding: 4px 8px; background-color: #fdfdfd; font-size: 10px; color: #444;">
                            <i>📊 Análisis: Demanda Anual: <b>${deAn}</b> | Consumo Típico (Mediana): <b>${cVal}</b> | Días entre Salidas (Mediana): <b>${fVal} días</b> | Proy. de Agotamiento: <b>${proxD}</b></i>
                        </td></tr>`;
                        }
                    }
                });
                return html;
            }

            function abrirHistorialBypassGlobal() {
                let todasLasSalidas = [];
                TODOS_LOS_DATOS.forEach(fila => {
                    if (fila.inv.salidasLocales && fila.inv.salidasLocales.length > 0) {
                        fila.inv.salidasLocales.forEach(salida => {
                            let ms = salida.timestamp || salida.fecha;
                            let d = new Date(ms);
                            let dateStr = isNaN(d) ? '-' : d.toLocaleString('es-GT');

                            todasLasSalidas.push({
                                codigo: fila.inv.codigo,
                                noParte: fila.inv.noParte,
                                descripcion: fila.inv.descripcion,
                                cantidad: salida.cantidad,
                                timestamp: ms,
                                fechaStr: dateStr,
                                maquina: salida.maquina || 'N/A',
                                seccion: salida.seccion || 'N/A'
                            });
                        });
                    }
                });

                todasLasSalidas.sort((a, b) => b.timestamp - a.timestamp);

                const contenedor = document.getElementById('historialBypassContenedor');
                if (todasLasSalidas.length === 0) {
                    contenedor.innerHTML = '<p class="text-center text-gray-500 py-10">No hay salidas rápidas locales registradas.</p>';
                } else {
                    contenedor.innerHTML = `<table class="min-w-full text-xs text-left mb-4">
                    <thead class="bg-gray-100 shadow-sm sticky top-0"><tr>
                        <th class="p-2 border">Fecha</th>
                        <th class="p-2 border">Código</th>
                        <th class="p-2 border">Descripción</th>
                        <th class="p-2 border text-center">Cant</th>
                        <th class="p-2 border">Destino</th>
                    </tr></thead>
                    <tbody>
                        ${todasLasSalidas.map(s => `
                            <tr class="hover:bg-red-50 transition border-b">
                                <td class="p-2 text-[10px] whitespace-nowrap text-gray-600">${s.fechaStr}</td>
                                <td class="p-2 font-bold text-blue-700 max-w-[80px] truncate" title="${s.noParte}">${s.codigo}</td>
                                <td class="p-2"><div class="line-clamp-2 leading-tight" title="${s.descripcion}">${s.descripcion}</div></td>
                                <td class="p-2 text-center font-bold text-red-600 text-sm">-${s.cantidad}</td>
                                <td class="p-2 text-[10px] leading-tight"><b>Máq:</b> ${s.maquina}<br><b>Sec:</b> ${s.seccion}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
                }

                document.getElementById('modalHistorialBypassGlobal').classList.remove('hidden');
            }

            function cerrarHistorialBypassGlobal() {
                document.getElementById('modalHistorialBypassGlobal').classList.add('hidden');
            }

            async function vincularDatosMaquina(val, prefix) {
                if (!val) return;
                const maq = val.trim().toUpperCase();
                const historial = await obtenerHistorial();

                let match = historial
                    .filter(h => h.form && h.form.maquina && h.form.maquina.toUpperCase() === maq)
                    .sort((a, b) => b.fecha_log - a.fecha_log)[0];

                let formToFill = match ? match.form : null;

                if (!formToFill) {
                    let ultSalida = null;
                    TODOS_LOS_DATOS.forEach(f => {
                        if (f.inv.salidasLocales) {
                            f.inv.salidasLocales.forEach(s => {
                                if (s.maquina && s.maquina.toUpperCase() === maq) {
                                    let t = s.timestamp || s.fecha || 0;
                                    if (!ultSalida || t > ultSalida.timestamp) {
                                        ultSalida = { sec: s.seccion, timestamp: t };
                                    }
                                }
                            });
                        }
                    });
                    if (ultSalida) {
                        formToFill = { seccion: ultSalida.sec, serie: '', modelo: '', tecnico: '' };
                    }
                }

                if (formToFill) {
                    const f = formToFill;
                    const setVal = (idSuffix, value) => {
                        const el = document.getElementById(prefix + idSuffix);
                        if (el && !el.value && value) {
                            el.value = value;
                            el.classList.add('bg-blue-50');
                            setTimeout(() => el.classList.remove('bg-blue-50'), 1500);
                        }
                    };

                    if (prefix === 'inputSalida') {
                        setVal('Seccion', f.seccion);
                    } else if (prefix === 'g') {
                        setVal('Seccion', f.seccion);
                        setVal('Serie', f.serie);
                        setVal('Modelo', f.modelo);
                        setVal('Tecnico', f.tecnico);
                    } else if (prefix === 'inp') {
                        setVal('Seccion', f.seccion);
                        setVal('Serie', f.serie);
                        setVal('Modelo', f.modelo);
                        setVal('Tecnico', f.tecnico);
                    } else if (prefix === 'ed') {
                        setVal('Seccion', f.seccion);
                        setVal('Serie', f.serie);
                        setVal('Modelo', f.modelo);
                        setVal('Tecnico', f.tecnico);
                    }
                }
            }

            function agregarAlCarrito() {
                if (!itemActualSeleccionado) return;
                const cant = parseFloat(document.getElementById('inpCant').value);
                const maq = document.getElementById('inpMaquina').value.trim();
                const sec = document.getElementById('inpSeccion').value.trim() || "-";

                if (isNaN(cant) || cant <= 0) { alert("Ingrese una cantidad válida."); return; }
                if (!maq) { alert("Especifique la máquina o destino."); return; }

                carrito.push({
                    codigo: itemActualSeleccionado.inv.codigo,
                    noParte: itemActualSeleccionado.inv.noParte || "-",
                    descripcion: itemActualSeleccionado.inv.descripcion,
                    cant: cant
                });
                guardarCarritoLocal();
                if (maq) document.getElementById('gMaquina').value = maq;
                if (sec !== "-") document.getElementById('gSeccion').value = sec;
                const ser = document.getElementById('inpSerie').value.trim();
                if (ser) document.getElementById('gSerie').value = ser;
                const mod = document.getElementById('inpModelo').value.trim();
                if (mod) document.getElementById('gModelo').value = mod;
                const tec = document.getElementById('inpTecnico').value.trim();
                if (tec) document.getElementById('gTecnico').value = tec;
                const fec = document.getElementById('inpFechaSug').value;
                if (fec) document.getElementById('gFechaSug').value = fec;

                actualizarMiniCarrito();
                actualizarBadgeCarrito();
                cerrarModalDetalle();
            }

            function guardarBorrador() {
                if (carrito.length === 0) return alert("El carrito está vacío");
                const maqReq = document.getElementById('gMaquina') ? document.getElementById('gMaquina').value : 'Sin_Maquina';
                const name = prompt("Nombre corto para este borrador:", maqReq || "Borrador");
                if (!name) return;
                const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
                borradores.push({
                    id: Date.now(),
                    nombre: name,
                    items: carrito,
                    form: {
                        maq: document.getElementById('gMaquina') ? document.getElementById('gMaquina').value : '',
                        sec: document.getElementById('gSeccion') ? document.getElementById('gSeccion').value : '',
                        tec: document.getElementById('gTecnico') ? document.getElementById('gTecnico').value : '',
                        ser: document.getElementById('gSerie') ? document.getElementById('gSerie').value : '',
                        mod: document.getElementById('gModelo') ? document.getElementById('gModelo').value : '',
                        fec: document.getElementById('gFechaSug') ? document.getElementById('gFechaSug').value : ''
                    }
                });
                localStorage.setItem('cartBorradores', JSON.stringify(borradores));
                carrito = [];
                guardarCarritoLocal();
                actualizarMiniCarrito();
                actualizarBadgeCarrito();
            }

            function verBorradores() {
                const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
                if (borradores.length === 0) return alert("No hay borradores guardados.");

                const cont = document.getElementById('sencillaHistorialItems');
                if (!cont) return;

                const borradoresHtml = borradores.map((b, i) => `
                <div class="border rounded p-2 hover:bg-yellow-50 cursor-pointer transition mb-1 bg-yellow-100 shadow-sm" onclick="cargarBorrador(${i})">
                    <div class="flex justify-between items-center border-b border-yellow-200 pb-1 mb-1">
                        <span class="font-bold text-yellow-800 text-[10px]">${b.nombre}</span>
                        <button onclick="event.stopPropagation(); borrarBorrador(${i})" class="text-red-500 hover:text-red-700 text-xs text-[10px] bg-red-50 px-1 rounded">X</button>
                    </div>
                    <div class="text-[10px] flex justify-between items-center">
                        <span class="text-gray-500">${new Date(b.id).toLocaleDateString()}</span>
                        <span class="bg-yellow-200 text-yellow-800 font-bold px-1 rounded border border-yellow-300 shadow-sm">${b.items.length} ítems</span>
                    </div>
                </div>
            `).join('');

                cont.innerHTML = `
                <div class="font-bold text-gray-600 mb-2 border-b pb-1">Borradores Guardados</div>
                ${borradoresHtml}
                <button onclick="renderHistorialSencillo()" class="mt-3 w-full text-[10px] bg-indigo-50 border border-indigo-200 p-1 text-indigo-700 font-bold rounded">Volver al Historial</button>
            `;
            }

            window.cargarBorrador = function (idx) {
                const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
                const b = borradores[idx];
                if (!b) return;
                if (carrito.length > 0 && !confirm("Tienes items activos en el carrito. Cargarlo lo sobrescribirá. ¿Continuar?")) return;

                carrito = b.items;
                guardarCarritoLocal();
                if (document.getElementById('gMaquina')) document.getElementById('gMaquina').value = b.form.maq || '';
                if (document.getElementById('gSeccion')) document.getElementById('gSeccion').value = b.form.sec || '';
                if (document.getElementById('gTecnico')) document.getElementById('gTecnico').value = b.form.tec || '';
                if (document.getElementById('gSerie')) document.getElementById('gSerie').value = b.form.ser || '';
                if (document.getElementById('gModelo')) document.getElementById('gModelo').value = b.form.mod || '';
                if (document.getElementById('gFechaSug')) document.getElementById('gFechaSug').value = b.form.fec || '';

                borradores.splice(idx, 1);
                localStorage.setItem('cartBorradores', JSON.stringify(borradores));

                actualizarMiniCarrito();
                actualizarBadgeCarrito();
                renderHistorialSencillo();
            }

            window.borrarBorrador = function (idx) {
                const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
                borradores.splice(idx, 1);
                localStorage.setItem('cartBorradores', JSON.stringify(borradores));
                verBorradores();
            }

            function agregarArticuloNuevoCarro() {
                // Limpiar campos del modal
                ['nrDescripcion','nrNoParte','nrObservaciones'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                const cantEl = document.getElementById('nrCantidad');
                if (cantEl) cantEl.value = '1';
                const urgEl = document.getElementById('nrUrgencia');
                if (urgEl) urgEl.value = 'Normal';
                // Precargar máquina/sección de los campos globales si están llenos
                const maqEl = document.getElementById('nrMaquina');
                const secEl = document.getElementById('nrSeccion');
                if (maqEl) maqEl.value = document.getElementById('gMaquina')?.value || '';
                if (secEl) secEl.value = document.getElementById('gSeccion')?.value || '';
                document.getElementById('modalNuevoRepuesto').classList.remove('hidden');
                setTimeout(() => document.getElementById('nrDescripcion')?.focus(), 100);
            }

            function cerrarModalNuevoRepuesto() {
                document.getElementById('modalNuevoRepuesto').classList.add('hidden');
            }

            function confirmarNuevoRepuesto() {
                const desc = document.getElementById('nrDescripcion').value.trim();
                if (!desc) {
                    document.getElementById('nrDescripcion').focus();
                    document.getElementById('nrDescripcion').classList.add('border-red-400');
                    return;
                }
                document.getElementById('nrDescripcion').classList.remove('border-red-400');

                const noParte = document.getElementById('nrNoParte').value.trim() || '-';
                const cant = parseFloat(document.getElementById('nrCantidad').value) || 1;
                const maquina = document.getElementById('nrMaquina').value.trim().toUpperCase() || '-';
                const seccion = document.getElementById('nrSeccion').value.trim().toUpperCase() || '-';
                const urgencia = document.getElementById('nrUrgencia').value;
                const obs = document.getElementById('nrObservaciones').value.trim();

                // Tag de urgencia para el label
                const urgTag = urgencia === 'Critico' ? '🔴 ' : urgencia === 'Urgente' ? '⚡ ' : '';

                // Descripción enriquecida con observaciones si hay
                const descFull = obs ? `${desc.toUpperCase()} | OBS: ${obs}` : desc.toUpperCase();

                carrito.push({
                    codigo: 'NUEVO-REGISTRO',
                    noParte: noParte,
                    descripcion: descFull,
                    nombreUtil: `${urgTag}Solicitud Primera Vez`,
                    maquina: maquina,
                    seccion: seccion,
                    cant: cant,
                    esNuevo: true
                });

                guardarCarritoLocal();
                actualizarMiniCarrito();
                actualizarBadgeCarrito();
                cerrarModalNuevoRepuesto();

                // Feedback visual rápido
                const badge = document.getElementById('badgeCarrito');
                if (badge) {
                    badge.classList.add('scale-125', 'bg-emerald-500');
                    setTimeout(() => badge.classList.remove('scale-125', 'bg-emerald-500'), 600);
                }
            }


            function abrirEditorSolicitud(event, btn) {
                event.stopPropagation();
                const card = btn.closest('[data-sol-data]');
                if (!card) return;

                const solId = card.getAttribute('data-sol-id');
                const items = JSON.parse(card.getAttribute('data-sol-data') || '[]');
                const form = JSON.parse(card.getAttribute('data-sol-form') || '{}');

                _editorSolCache = { solId, items };

                document.getElementById('editorSolId').innerText = '#' + solId;
                document.getElementById('edMaquina').value = form.maquina || '';
                document.getElementById('edSeccion').value = form.seccion || '';
                document.getElementById('edTecnico').value = form.tecnico || '';
                document.getElementById('edModelo').value = form.modelo || '';
                document.getElementById('edSerie').value = form.serie || '';
                document.getElementById('edFechaSug').value = form.fechaSug || '';

                document.getElementById('edItemsPreview').innerHTML =
                    items.map((it, i) => `<div class="py-0.5 border-b last:border-0"><b>${i + 1}. ${it.codigo}</b> &mdash; ${it.descripcion} &times;${it.cant}</div>`).join('');

                document.getElementById('modalEditorSolicitud').classList.remove('hidden');
            }

            async function guardarEdicionSolicitud(reenviar) {
                if (!_editorSolCache) return;
                const { solId, items } = _editorSolCache;

                const newForm = {
                    maquina: document.getElementById('edMaquina').value.trim(),
                    seccion: document.getElementById('edSeccion').value.trim(),
                    tecnico: document.getElementById('edTecnico').value.trim(),
                    modelo: document.getElementById('edModelo').value.trim(),
                    serie: document.getElementById('edSerie').value.trim(),
                    fechaSug: document.getElementById('edFechaSug').value
                };

                const db = await initDB();
                await new Promise(r => {
                    const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                    tx.objectStore(STORE_HISTORIAL).put({ id_solicitud: solId, fecha_log: new Date().getTime(), items, form: newForm });
                    tx.oncomplete = r;
                });

                document.getElementById('modalEditorSolicitud').classList.add('hidden');
                renderHistorialSencillo();
                actualizarDatalists();

                if (reenviar) {
                    const gMaq = newForm.maquina || '-';
                    const gSec = newForm.seccion || '-';
                    const gTec = newForm.tecnico || '';
                    const extInfo = (newForm.serie ? ` | Serie: ${newForm.serie}` : '') + (newForm.modelo ? ` | Mod: ${newForm.modelo}` : '');

                    let tablaHtml = `<div style="font-family:Arial,sans-serif;color:#333;font-size:12px;border:1px solid #ccc;padding:15px;">
                    <h2 style="color:#1e3a8a;margin-top:0;">SOLICITUD DE REPUESTOS #${solId} (Corregida)</h2>
                    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;text-align:left;">
                        <thead style="background-color:#f3f4f6;color:#1f2937;"><tr><th>#</th><th>Código / Parte</th><th>Descripción</th><th>Cant.</th></tr></thead>
                        <tbody>
                            <tr><td colspan="4" style="background-color:#e0f2fe;text-align:center;padding:5px;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}${extInfo}</td></tr>
                            ${items.map((it, idx) => `<tr><td>${idx + 1}</td><td><b>${it.codigo}</b><br><span style="font-size:10px;">${it.noParte || ''}</span></td><td>${it.descripcion}</td><td style="text-align:center;font-weight:bold;color:#d97706;">${it.cant}</td></tr>`).join('')}
                        </tbody>
                    </table></div>`;

                    try {
                        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([tablaHtml], { type: 'text/html' }), 'text/plain': new Blob([''], { type: 'text/plain' }) })]);
                        alert(`✅ Solicitud #${solId} actualizada y copiada al portapapeles.\n\nAbre el correo, haz clic en el cuerpo y presiona CTRL+V.`);
                    } catch (e) {
                        alert(`✅ Solicitud #${solId} actualizada.\n\nNo se pudo copiar al portapapeles; usa el botón PDF para imprimirla.`);
                    }
                } else {
                    alert(`✅ Solicitud #${solId} actualizada correctamente.`);
                }
            }

            function abrirCarrito() {
                const contenedor = document.getElementById('contenedorItemsCarrito');
                if (carrito.length === 0) {
                    contenedor.innerHTML = '<p class="text-center text-gray-500 my-10">El carrito está vacío.</p>';
                } else {
                    const itemsHtml = carrito.map((item, index) => {
                        const rowClass = item.esNuevo ? 'border-b bg-emerald-50 hover:bg-emerald-100' : 'border-b hover:bg-gray-50';
                        const codigoBadge = item.esNuevo
                            ? `<span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">✨ NUEVO</span>`
                            : `<span class="font-mono text-xs font-bold text-blue-700">${item.codigo}</span>`;
                        const nombreUtilBadge = item.nombreUtil
                            ? `<br><span class="text-[10px] text-emerald-600 font-semibold">${item.nombreUtil}</span>`
                            : '';
                        const maqInfo = item.esNuevo && item.maquina && item.maquina !== '-'
                            ? `<br><span class="text-[10px] text-gray-500">${item.maquina}${item.seccion && item.seccion !== '-' ? ' / ' + item.seccion : ''}</span>`
                            : '';
                        return `
                    <tr class="${rowClass}">
                        <td class="px-4 py-2">${codigoBadge}</td>
                        <td class="px-4 py-2 text-xs font-semibold">${item.descripcion}${nombreUtilBadge}${maqInfo}</td>
                        <td class="px-4 py-2 text-center font-black text-lg text-orange-600">${item.cant}</td>
                        <td class="px-4 py-2 text-center">
                            <button onclick="eliminarDelCarrito('${index}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 px-2 rounded transition" title="Eliminar">❌</button>
                        </td>
                    </tr>`;
                    }).join('');

                    contenedor.innerHTML = `
                    <div class="p-4 overflow-x-auto border rounded bg-white shadow-sm">
                        <table class="w-full text-left text-sm">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700">
                                    <th class="px-4 py-2 border-b">Código</th>
                                    <th class="px-4 py-2 border-b">Descripción</th>
                                    <th class="px-4 py-2 border-b text-center">Cant.</th>
                                    <th class="px-4 py-2 border-b text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
                }
                document.getElementById('modalCarrito').classList.remove('hidden');
            }

            function cerrarCarrito() { document.getElementById('modalCarrito').classList.add('hidden'); }
            function eliminarDelCarrito(index) { carrito.splice(index, 1); guardarCarritoLocal(); actualizarBadgeCarrito(); actualizarMiniCarrito(); const m = document.getElementById('modalCarrito'); if (!m.classList.contains('hidden')) abrirCarrito(); }
            function vaciarCarrito() { if (confirm("¿Seguro que deseas vaciar todo el carrito?")) { carrito = []; guardarCarritoLocal(); actualizarBadgeCarrito(); actualizarMiniCarrito(); const m = document.getElementById('modalCarrito'); if (!m.classList.contains('hidden')) abrirCarrito(); } }

            function generarPdfCarrito() {
                if (carrito.length === 0) return alert("El carrito está vacío. Añade repuestos primero.");

                const conMetricas = confirm("¿Desea incluir información de análisis (Demanda anual y frecuencia de uso histórico) en el PDF?");

                const d = new Date();
                const idSol = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') +
                    d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') +
                    d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');

                const gMaq = document.getElementById('gMaquina') ? document.getElementById('gMaquina').value.trim() : 'No esp.';
                const gSec = document.getElementById('gSeccion') ? document.getElementById('gSeccion').value.trim() : 'No esp.';
                const gTec = document.getElementById('gTecnico') ? document.getElementById('gTecnico').value.trim() : '';
                const gMod = document.getElementById('gModelo') ? document.getElementById('gModelo').value.trim() : "";
                const gSer = document.getElementById('gSerie') ? document.getElementById('gSerie').value.trim() : "";
                const gFeS = document.getElementById('gFechaSug') && document.getElementById('gFechaSug').value ? document.getElementById('gFechaSug').value : '';

                let printDiv = document.createElement('div');
                printDiv.id = 'cartPrintArea';
                printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 20px;">
                    <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
                        <h1 style="color: #1e3a8a; font-size: 24px; margin:0;">EMPRESAS GALINDO</h1>
                        <h2 style="font-size: 16px; margin: 5px 0 0 0; color:#555;">SOLICITUD TÉCNICA - DEPTO. ELÉCTRICO</h2>
                    </div>
                    
                    <div style="margin-bottom: 20px; font-size:12px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; background-color: #fdfcf9;">
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            <div style="flex: 1 1 45%;"><strong>No. Solicitud:</strong> ${idSol}</div>
                            <div style="flex: 1 1 45%;"><strong>Fecha Generación:</strong> ${new Date().toLocaleString('es-GT')}</div>
                            <div style="flex: 1 1 45%;"><strong>Máquina / Destino:</strong> ${gMaq}</div>
                            <div style="flex: 1 1 45%;"><strong>Sección:</strong> ${gSec}</div>
                            ${gTec ? `<div style="flex: 1 1 45%;"><strong>Técnico Solicita:</strong> ${gTec}</div>` : ''}
                            ${gMod ? `<div style="flex: 1 1 45%;"><strong>Modelo:</strong> ${gMod}</div>` : ''}
                            ${gSer ? `<div style="flex: 1 1 45%;"><strong>Serie:</strong> ${gSer}</div>` : ''}
                            ${gFeS ? `<div style="flex: 1 1 45%;"><strong>Fecha Sugerida de Cierre:</strong> ${gFeS}</div>` : ''}
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background-color: #f3f4f6; text-align: left;">
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">#</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Código / Parte</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Descripción</th>
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">Cant.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${construirFilasParaPdf(carrito, conMetricas)}
                        </tbody>
                    </table>
                    <div style="margin-top: 60px; text-align: center;">
                        <p>___________________________________</p>
                        <p style="margin-top:5px; font-size:12px;">Firma / Autorización Solicitante</p>
                    </div>
                </div>
            `;

                document.body.appendChild(printDiv);
                document.body.classList.add('printing-cart');

                window.print();

                document.body.classList.remove('printing-cart');
                document.body.removeChild(printDiv);
            }

            async function _enviarSolicitud(idSol, items, form, esReenvio) {
                const gMaq = form.maquina || '-';
                const gSec = form.seccion || '-';
                const gTec = form.tecnico || '';
                const gSer = form.serie || '';
                const gMod = form.modelo || '';
                const extInfo = (gSer ? ` | Serie: ${gSer}` : '') + (gMod ? ` | Mod: ${gMod}` : '');

                const destinatario = "dorozco@empresasgalindo.com";
                const copia = "electrico.cogusa@empresasgalindo.com";
                const sufijo = esReenvio ? ' (REENVIO)' : '';
                const asunto = encodeURIComponent(`SOL. COMPRA #${idSol} | Máq: ${gMaq} - DEPTO ELECTRICO${sufijo}`);

                const usarTexto = confirm("¿En qué formato desea copiar la solicitud?\n\nAceptar = Texto con tabulaciones (para pegar en cuerpo de correo plano)\nCancelar = Tabla HTML formateada (CTRL+V en correo con formato)");

                let contenidoCopia, textoPlano;

                if (usarTexto) {
                    let lines = [`SOLICITUD #${idSol}${sufijo}`, `Destino: ${gMaq} | Sección: ${gSec}${extInfo}`, `Técnico: ${gTec}`, ''];
                    lines.push(['#', 'Código', 'PN', 'Descripción', 'Cant.'].join('\t\t'));
                    items.forEach((it, idx) => lines.push([idx + 1, it.codigo, it.noParte || '-', it.descripcion, it.cant].join('\t\t')));
                    textoPlano = lines.join('\n');
                    contenidoCopia = [new ClipboardItem({ 'text/plain': new Blob([textoPlano], { type: 'text/plain' }) })];
                } else {
                    const html = `<div style="font-family:Arial,sans-serif;color:#333;font-size:12px;border:1px solid #ccc;padding:15px;">
                    <h2 style="color:#1e3a8a;margin-top:0;">SOLICITUD DE REPUESTOS #${idSol}${sufijo}</h2>
                    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;text-align:left;">
                        <thead style="background-color:#f3f4f6;"><tr><th>#</th><th>Código / PN</th><th>Descripción</th><th>Cant.</th></tr></thead>
                        <tbody>
                            <tr><td colspan="4" style="background:#e0f2fe;text-align:center;"><b>Destino:</b> Máq: ${gMaq} | Secc: ${gSec}${extInfo} | Téc: ${gTec}</td></tr>
                            ${items.map((it, i) => `<tr><td>${i + 1}</td><td><b>${it.codigo}</b><br><small>${it.noParte || ''}</small></td><td>${it.descripcion}</td><td style="text-align:center;font-weight:bold;color:#d97706;">${it.cant}</td></tr>`).join('')}
                        </tbody>
                    </table></div>`;
                    textoPlano = `Solicitud #${idSol}${sufijo} - Máq: ${gMaq}`;
                    contenidoCopia = [new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([textoPlano], { type: 'text/plain' }) })];
                }

                try {
                    await navigator.clipboard.write(contenidoCopia);
                    alert(`✅ Solicitud #${idSol} copiada al portapapeles (${usarTexto ? 'texto tabulado' : 'tabla HTML'}).\nAbre el correo y presiona CTRL+V.`);
                } catch (e) {
                    alert(`Solicitud #${idSol} lista. No se pudo copiar automáticamente; usa el PDF.`);
                }

                const cuerpoBase = encodeURIComponent(`Buen día,\n\nAdjunto solicitud de compra #${idSol} | Máq: ${gMaq}:\n\n[PRESIONA CTRL + V AQUI]\n\nSaludos.`);
                window.open(`mailto:${destinatario}?cc=${copia}&subject=${asunto}&body=${cuerpoBase}`, '_blank');
            }

            async function procesarSolicitudEmail() {
                if (carrito.length === 0) return alert("No hay items en el carrito.");

                const gMaq = document.getElementById('gMaquina').value.trim() || '-';
                const gSec = document.getElementById('gSeccion').value.trim() || '-';
                const gTec = document.getElementById('gTecnico').value.trim() || '';
                const gSer = document.getElementById('gSerie')?.value.trim() || '';
                const gMod = document.getElementById('gModelo')?.value.trim() || '';
                const gFeS = document.getElementById('gFechaSug')?.value || '';

                const d = new Date();
                const idSol = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') +
                    d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') +
                    d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');

                const formData = { maquina: gMaq, seccion: gSec, tecnico: gTec, serie: gSer, modelo: gMod, fechaSug: gFeS };
                await guardarCompraEnHistorial(idSol, carrito, formData);

                await _enviarSolicitud(idSol, carrito, formData, false);

                carrito = []; guardarCarritoLocal(); actualizarBadgeCarrito(); actualizarMiniCarrito(); cerrarCarrito(); renderHistorialSencillo(); actualizarDatalists();
            }

            async function reenviarSolicitudHistorial(event, btn) {
                event.stopPropagation();
                const card = btn.closest('[data-sol-data]');
                if (!card) return;
                const solId = card.getAttribute('data-sol-id');
                const items = JSON.parse(card.getAttribute('data-sol-data') || '[]');
                const form = JSON.parse(card.getAttribute('data-sol-form') || '{}');
                await _enviarSolicitud(solId, items, form, true);
            }

            function toggleBodeguero() {
                if (isBodeguero) {
                    if (confirm("¿Cerrar sesión de Bodeguero? (Los campos volverán a ser de solo lectura para los técnicos)")) {
                        isBodeguero = false;
                        sessionStorage.setItem('isBodeguero', 'false');
                        aplicarEstadoBodeguero();
                    }
                } else {
                    const pin = prompt("Ingrese el PIN de Bodega para editar ubicaciones y nombres útiles:");
                    if (pin === "1234" || pin === "bodega") {
                        isBodeguero = true;
                        sessionStorage.setItem('isBodeguero', 'true');
                        aplicarEstadoBodeguero();
                    } else {
                        if (pin !== null) alert("PIN incorrecto.");
                    }
                }
            }

            function aplicarEstadoBodeguero() {
                const btn = document.getElementById('btnToggleBodeguero');
                if (btn) {
                    if (isBodeguero) {
                        btn.innerHTML = '🔓 Bodeguero';
                        btn.className = 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 font-bold py-1 px-4 rounded text-sm transition shadow-sm border border-yellow-400 flex items-center gap-1';
                    } else {
                        btn.innerHTML = '🔒 Lector';
                        btn.className = 'bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold py-1 px-4 rounded text-sm transition shadow-sm border border-gray-300 flex items-center gap-1';
                    }
                }

                document.querySelectorAll('.in-ubic, .in-util').forEach(inp => {
                    inp.readOnly = !isBodeguero;
                    if (!isBodeguero) {
                        inp.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed', 'border-transparent');
                        inp.classList.remove('border-gray-300');
                    } else {
                        inp.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed', 'border-transparent');
                        inp.classList.add('border-gray-300');
                    }
                });

                if (typeof PUNTERO_PAGINA !== 'undefined') {
                    if (!document.getElementById('vistaSencilla').classList.contains('hidden')) {
                        buscarSencilla();
                    } else {
                        document.getElementById('tableBody').innerHTML = "";
                        PUNTERO_PAGINA = 0;
                        renderizarBloqueTabla();
                    }
                }
            }

            async function actualizarDatalists() {
                const historial = await obtenerHistorial();
                const sugerencias = {
                    maquinas: new Set(),
                    secciones: new Set(),
                    tecnicos: new Set(),
                    modelos: new Set(),
                    series: new Set()
                };

                historial.forEach(sol => {
                    if (sol.form) {
                        if (sol.form.maquina) sugerencias.maquinas.add(sol.form.maquina.toUpperCase());
                        if (sol.form.seccion) sugerencias.secciones.add(sol.form.seccion.toUpperCase());
                        if (sol.form.tecnico) sugerencias.tecnicos.add(sol.form.tecnico.toUpperCase());
                        if (sol.form.modelo) sugerencias.modelos.add(sol.form.modelo.toUpperCase());
                        if (sol.form.serie) sugerencias.series.add(sol.form.serie.toUpperCase());
                    }
                    if (sol.items) {
                        sol.items.forEach(it => {
                            if (it.maquina) sugerencias.maquinas.add(it.maquina.toUpperCase());
                            if (it.seccion) sugerencias.secciones.add(it.seccion.toUpperCase());
                            if (it.tecnico) sugerencias.tecnicos.add(it.tecnico.toUpperCase());
                        });
                    }
                });

                TODOS_LOS_DATOS.forEach(f => {
                    if (f.maquinasUnicas) {
                        f.maquinasUnicas.split(',').forEach(m => sugerencias.maquinas.add(m.trim().toUpperCase()));
                    }
                    if (f.inv.salidasLocales) {
                        f.inv.salidasLocales.forEach(s => {
                            if (s.maquina && s.maquina !== 'N/A') sugerencias.maquinas.add(s.maquina.trim().toUpperCase());
                            if (s.seccion && s.seccion !== 'N/A') sugerencias.secciones.add(s.seccion.trim().toUpperCase());
                        });
                    }
                });

                const poblar = (id, set) => {
                    const dl = document.getElementById(id);
                    if (!dl) return;
                    dl.innerHTML = [...set].sort().map(v => `<option value="${v}">`).join('');
                };

                poblar('listaMaquinas', sugerencias.maquinas);
                poblar('listaSecciones', sugerencias.secciones);
                poblar('listaTecnicos', sugerencias.tecnicos);
                poblar('listaModelos', sugerencias.modelos);
                poblar('listaSeries', sugerencias.series);
            }

            function abrirHistorial() {
                document.getElementById('modalHistorial').classList.remove('hidden');
                renderizarHistorial();
            }

            function cerrarHistorial() { document.getElementById('modalHistorial').classList.add('hidden'); }

            async function renderizarHistorial() {
                const data = await obtenerHistorial();
                const fTiempo = document.getElementById('histFiltroTiempo').value;
                const fMaq = document.getElementById('histFiltroMaquina').value.toLowerCase();

                const cont = document.getElementById('contenedorHistorial');
                const ahora = new Date().getTime();
                const unDia = 24 * 60 * 60 * 1000;
                const unaSemana = 7 * unDia;

                const selMaq = document.getElementById('histFiltroMaquina');
                if (selMaq.options.length <= 1) {
                    const maqs = new Set();
                    data.forEach(sol => sol.items.forEach(it => maqs.add(it.maquina)));
                    [...maqs].sort().forEach(m => selMaq.innerHTML += `<option value="${m}">${m}</option>`);
                }

                if (data.length === 0) { cont.innerHTML = '<p class="text-center text-gray-500 py-10">No hay historial de compras.</p>'; return; }

                let filas = [];
                data.forEach(sol => {
                    const d = new Date(sol.fecha_log);
                    const fechaStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

                    sol.items.forEach(it => {
                        let ok = true;
                        if (fTiempo === 'hoy' && ahora - sol.fecha_log > unDia) ok = false;
                        if (fTiempo === 'semana' && ahora - sol.fecha_log > unaSemana) ok = false;
                        if (fTiempo === 'mes' && (d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear())) ok = false;
                        if (fMaq !== 'todas' && it.maquina && it.maquina.toLowerCase() !== fMaq) ok = false;

                        if (ok) filas.push({ id: sol.id_solicitud, ms: sol.fecha_log, fecha: fechaStr, it: it });
                    });
                });

                filas.sort((a, b) => b.ms - a.ms);

                if (filas.length === 0) { cont.innerHTML = '<p class="text-center text-gray-500 py-10">Sin resultados.</p>'; return; }

                cont.innerHTML = `
                <div class="overflow-x-auto border rounded bg-white shadow-sm">
                    <table class="min-w-full text-sm text-left">
                        <thead class="bg-gray-100 text-gray-700">
                            <tr>
                                <th class="px-4 py-2 border-b">No. Solicitud</th>
                                <th class="px-4 py-2 border-b">Fecha Log</th>
                                <th class="px-4 py-2 border-b">Repuesto</th>
                                <th class="px-4 py-2 border-b text-center">Cant.</th>
                                <th class="px-4 py-2 border-b">Máquina / Sec.</th>
                                <th class="px-4 py-2 border-b">Técnico</th>
                                <th class="px-4 py-2 border-b text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas.map(f => `
                                <tr class="border-b hover:bg-gray-50 text-xs">
                                    <td class="px-4 py-2 font-bold text-indigo-700">${f.id}</td>
                                    <td class="px-4 py-2 text-gray-600">${f.fecha}</td>
                                    <td class="px-4 py-2"><span class="font-mono text-blue-600 font-bold">${f.it.codigo}</span><br>${f.it.descripcion}</td>
                                    <td class="px-4 py-2 text-center font-bold text-orange-600 text-sm">${f.it.cant}</td>
                                    <td class="px-4 py-2"><b>${f.it.maquina || ''}</b><br><span class="text-gray-500">${f.it.seccion || ''}</span></td>
                                    <td class="px-4 py-2">${f.it.tecnico || ''}</td>
                                    <td class="px-4 py-2 text-center">
                                        <button onclick="eliminarSolicitudHistorial(event, '${f.id}')" class="text-red-500 hover:text-red-800 transition p-1 bg-red-50 rounded" title="Eliminar registro">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            }

            function generarPdfVistaSencilla() {
                const datos = TODOS_LOS_DATOS;
                if (datos.length === 0) return alert('No hay ítems en catálogo para imprimir.');

                let printDiv = document.createElement('div');
                printDiv.id = 'cartPrintArea';
                printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 10px;">
                    <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <h1 style="color: #1e3a8a; font-size: 20px; margin:0;">EMPRESAS GALINDO</h1>
                            <h2 style="font-size: 13px; margin: 4px 0 0 0; color:#555;">CATÁLOGO GENERAL DE REPUESTOS</h2>
                        </div>
                        <div style="font-size:10px; text-align:right; color:#777;">
                            <b>Emisión:</b> ${new Date().toLocaleString('es-GT')}<br>
                            <b>Total ítems:</b> ${datos.length}
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                        <thead>
                            <tr style="background-color: #dbeafe; text-align: left;">
                                <th style="border: 1px solid #ccc; padding: 5px;">#</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Código / PN</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Nombre Útil / Descripción</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Ubicación</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:right;">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datos.map((f, i) => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="border: 1px solid #ccc; padding: 4px; text-align:center; color:#888;">${i + 1}</td>
                                    <td style="border: 1px solid #ccc; padding: 4px; white-space:nowrap;"><b>${f.inv.codigo}</b><br><span style="color:#888;">${f.inv.noParte || '-'}</span></td>
                                    <td style="border: 1px solid #ccc; padding: 4px;">${f.inv.nombreUtil || f.inv.descripcion}</td>
                                    <td style="border: 1px solid #ccc; padding: 4px;">${f.inv.ubicacion || '-'}</td>
                                    <td style="border: 1px solid #ccc; padding: 4px; text-align:right; font-weight:bold;">${f.inv.cantidad}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
                document.body.appendChild(printDiv);
                document.body.classList.add('printing-cart');
                window.print();
                document.body.classList.remove('printing-cart');
                document.body.removeChild(printDiv);
            }

            function generarPdfVistaDetallada() {
                if (DATOS_FILTRADOS.length === 0) return alert("No hay datos para imprimir.");
                if (DATOS_FILTRADOS.length > 500) {
                    if (!confirm(`Se generará un PDF de ${DATOS_FILTRADOS.length} ítems. Esto puede demorar. ¿Continuar?`)) return;
                }

                const completo = confirm("¿Desea incluir columnas de análisis (Demanda, Consumo, Días entre salidas, Proyección)?\n\nAceptar = Reporte Completo  |  Cancelar = Reporte Básico");

                let printDiv = document.createElement('div');
                printDiv.id = 'cartPrintArea';
                printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 10px;">
                    <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <h1 style="color: #1e3a8a; font-size: 20px; margin:0;">EMPRESAS GALINDO</h1>
                            <h2 style="font-size: 13px; margin: 4px 0 0 0; color:#555;">REPORTE DE INVENTARIO ${completo ? '- ANÁLISIS COMPLETO' : '- RESUMEN'}</h2>
                        </div>
                        <div style="font-size:10px; text-align:right; color:#777;">
                            <b>Emisión:</b> ${new Date().toLocaleString('es-GT')}<br>
                            <b>Total ítems:</b> ${DATOS_FILTRADOS.length}
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                        <thead>
                            <tr style="background-color: #f3f4f6; text-align: left;">
                                <th style="border: 1px solid #ccc; padding: 5px;">Código / PN</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Descripción / Nombre Útil</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Máquinas</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:right;">Stock</th>
                                <th style="border: 1px solid #ccc; padding: 5px;">Ubicación</th>
                                ${completo ? `
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Demanda<br>Anual</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Consumo<br>(Mediana)</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Días entre<br>Salidas</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Estado</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Proy. Agotamiento</th>
                                ` : `
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Estado</th>
                                <th style="border: 1px solid #ccc; padding: 5px; text-align:center;">Proy. Agotamiento</th>
                                `}
                            </tr>
                        </thead>
                        <tbody>
                            ${DATOS_FILTRADOS.map(f => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="border: 1px solid #ccc; padding: 5px; white-space:nowrap;"><b>${f.inv.codigo}</b><br><span style="font-size:8px;color:#777;">${f.inv.noParte || '-'}</span></td>
                                    <td style="border: 1px solid #ccc; padding: 5px;">${f.inv.nombreUtil ? `<b>${f.inv.nombreUtil}</b><br><span style="color:#777;font-size:8px;">${f.inv.descripcion}</span>` : f.inv.descripcion}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; font-size:8px;">${f.maquinasUnicas}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:right; font-weight:bold;">${f.inv.cantidad}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; font-size:8px;">${f.inv.ubicacion || '-'}</td>
                                    ${completo ? `
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.demandaAnual !== null ? f.demandaAnual : '-'}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.qConsumo ? formatQ(f.qConsumo[2]) : '-'}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.qDiasSalidas && f.qDiasSalidas[2] !== null ? Math.round(f.qDiasSalidas[2]) + 'd' : '-'}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.estado}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.proyeccionTexto}</td>
                                    ` : `
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.estado}</td>
                                    <td style="border: 1px solid #ccc; padding: 5px; text-align:center;">${f.proyeccionTexto}</td>
                                    `}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
                document.body.appendChild(printDiv);
                document.body.classList.add('printing-cart');
                window.print();
                document.body.classList.remove('printing-cart');
                document.body.removeChild(printDiv);
            }

            document.getElementById('btnImprimirPdf').addEventListener('click', () => {
                const enSencilla = !document.getElementById('vistaSencilla').classList.contains('hidden');
                if (enSencilla) {
                    generarPdfVistaSencilla();
                } else {
                    generarPdfVistaDetallada();
                }
            });

            // ── Buscador vista detallada ──────────────────────────────
            document.getElementById('btnEjecutarBusqueda').addEventListener('click', ejecutarBusqueda);

            document.getElementById('busquedaTexto').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') ejecutarBusqueda();
            });

            document.getElementById('btnCargarMas').addEventListener('click', renderizarBloqueTabla);

            ['filtroGrupo','filtroMaquina','filtroStock','filtroEstado','filtroProyeccion',
             'filtroUltimaSalida','filtroUltimoIngreso','filtroIngresoManual',
             'filtroSalidaDesde','filtroSalidaHasta'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', ejecutarBusqueda);
            });

            document.getElementById('btnBorrarDatos').addEventListener('click', async () => {
                const pin = prompt('Ingrese el PIN de seguridad (1234) para borrar absolutamente todos los datos (Inventario e Historial):');
                if (pin !== '1234') {
                    if (pin !== null) alert('PIN Incorrecto. Eliminación abortada.');
                    return;
                }
                if (!confirm('¡ADVERTENCIA CRÍTICA!\n\nEsto borrará TODO el inventario, el historial de salidas, las salidas locales y los borradores.\nEsta acción NO se puede deshacer.\n\n¿Estás completamente seguro?')) return;
                
                await borrarDatosLocales();
                localStorage.clear();
                alert('Todos los datos han sido borrados con éxito. La página se recargará ahora.');
                location.reload();
            });

            document.getElementById('thSortProyeccion').addEventListener('click', () => {
                DATOS_FILTRADOS.sort((a, b) => {
                    const valA = a.proyeccionMs; const valB = b.proyeccionMs;
                    if (!valA && !valB) return 0;
                    if (!valA) return 1; if (!valB) return -1;
                    return sortAscendente ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
                });
                sortAscendente = !sortAscendente;
                document.getElementById('sortIcon').innerText = sortAscendente ? '🔼' : '🔽';
                document.getElementById('tableBody').innerHTML = "";
                PUNTERO_PAGINA = 0;
                renderizarBloqueTabla();
            });

            document.getElementById('btnExportarExcel').addEventListener('click', () => {
                const datosLimpios = [['Código', 'No. Parte', 'Descripción', 'Cant.', 'Fecha Solicitud', 'Origen', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Destinos', 'Última Compra', 'Estado', 'Hz', 'Demanda Anual (Mín, Máx)', 'Primera Salida', 'Última Salida', 'Q0 Días', 'Q1 Días', 'Q2 Días', 'Q3 Días', 'Q4 Días', 'Proyección Sig. Compra']];
                DATOS_FILTRADOS.forEach(f => {
                    datosLimpios.push([
                        f.inv.codigo, f.inv.noParte || "-", f.inv.descripcion, f.inv.cantidad, formatFechaCorto(f.solFecha), f.solOrigen,
                        formatQ(f.qConsumo[0]), formatQ(f.qConsumo[1]), formatQ(f.qConsumo[2]), formatQ(f.qConsumo[3]), formatQ(f.qConsumo[4]),
                        f.maquinasUnicas, formatFechaCorto(f.inv.ultimaCompra), f.estado, f.vecesUsado, f.demandaAnual !== null ? f.demandaAnual : "-",
                        formatFechaCorto(f.primeraSalida), formatFechaCorto(f.ultimaSalida),
                        formatQ(f.qDiasSalidas[0]), formatQ(f.qDiasSalidas[1]), formatQ(f.qDiasSalidas[2]), formatQ(f.qDiasSalidas[3]), formatQ(f.qDiasSalidas[4]),
                        f.proyeccionTexto
                    ]);
                });
                const hoja = XLSX.utils.aoa_to_sheet(datosLimpios);
                const libro = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(libro, hoja, "Bodega_Analisis");
                XLSX.writeFile(libro, `Analisis_Bodega_${new Date().toISOString().slice(0, 10)}.xlsx`);
            });

            document.getElementById('tableBody').addEventListener('change', (e) => {
                if (e.target.classList.contains('in-util') || e.target.classList.contains('in-ubic')) {
                    const cod = e.target.getAttribute('data-codigo');
                    const val = e.target.value.trim();
                    const obj = TODOS_LOS_DATOS.find(x => x.inv.codigo === cod);
                    if (obj) {
                        if (e.target.classList.contains('in-util')) obj.inv.nombreUtil = val;
                        if (e.target.classList.contains('in-ubic')) obj.inv.ubicacion = val;
                        procesarGuardadoLocalRapido();
                    }
                }
            });

            document.getElementById('tbodySencilla').addEventListener('change', (e) => {
                if (e.target.classList.contains('in-util') || e.target.classList.contains('in-ubic')) {
                    const cod = e.target.getAttribute('data-codigo');
                    const val = e.target.value.trim();
                    const obj = TODOS_LOS_DATOS.find(x => x.inv.codigo === cod);
                    if (obj) {
                        if (e.target.classList.contains('in-util')) obj.inv.nombreUtil = val;
                        if (e.target.classList.contains('in-ubic')) obj.inv.ubicacion = val;
                        procesarGuardadoLocalRapido();
                        const dupInput = document.querySelector(`#tableBody input[data-codigo="${cod}"].${e.target.classList[0]}, #tableBody textarea[data-codigo="${cod}"].${e.target.classList[0]}`);
                        if (dupInput) dupInput.value = val;
                    }
                }
            });

            // -----------------------------------------------------
            // 5. LECTURA DE ARCHIVOS Y PROCESAMIENTO
            // -----------------------------------------------------
            function calcularCuartil(arr, q) {
                const ordenado = [...arr].sort((a, b) => a - b);
                const pos = (ordenado.length - 1) * q;
                const base = Math.floor(pos);
                const rest = pos - base;
                return (ordenado[base + 1] !== undefined) ? ordenado[base] + rest * (ordenado[base + 1] - ordenado[base]) : ordenado[base];
            }

            function obtenerCincoCuartiles(arr) {
                if (!arr || arr.length === 0) return [null, null, null, null, null];
                if (arr.length === 1) return [arr[0], arr[0], arr[0], arr[0], arr[0]];
                if (arr.length === 2) {
                    const min = Math.min(arr[0], arr[1]);
                    const max = Math.max(arr[0], arr[1]);
                    const media = (min + max) / 2;
                    return [min, min, media, max, max];
                }
                return [calcularCuartil(arr, 0), calcularCuartil(arr, 0.25), calcularCuartil(arr, 0.50), calcularCuartil(arr, 0.75), calcularCuartil(arr, 1)];
            }

            function parseFechaRobusta(fechaRaw) {
                if (!fechaRaw) return null;
                if (fechaRaw instanceof Date) return fechaRaw.getTime();
                if (typeof fechaRaw === 'number') return new Date(Math.round((fechaRaw - 25569) * 86400 * 1000)).getTime();
                if (typeof fechaRaw === 'string') {
                    let text = fechaRaw.trim();
                    let parts = text.split('/');
                    if (parts.length === 3) {
                        let year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
                        return new Date(`${year}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
                    }
                    let partsDash = text.split('-');
                    if (partsDash.length === 3 && partsDash[0].length <= 2) {
                        let year = partsDash[2].length === 2 ? "20" + partsDash[2] : partsDash[2];
                        return new Date(`${year}-${partsDash[1]}-${partsDash[0]}T12:00:00`).getTime();
                    }
                    return new Date(text).getTime();
                }
                return null;
            }

            function leerExcel(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                            resolve(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
                        } catch (err1) {
                            const readerFallback = new FileReader();
                            readerFallback.onload = (e2) => {
                                try {
                                    const text = e2.target.result;
                                    if (text.toLowerCase().includes('<table')) {
                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(text, 'text/html');
                                        const table = doc.querySelector('table');
                                        if (table) {
                                            const wbHTML = XLSX.utils.table_to_book(table, { cellDates: true });
                                            return resolve(XLSX.utils.sheet_to_json(wbHTML.Sheets[wbHTML.SheetNames[0]]));
                                        }
                                    }
                                    const wbFallback = XLSX.read(text, { type: 'binary', cellDates: true });
                                    resolve(XLSX.utils.sheet_to_json(wbFallback.Sheets[wbFallback.SheetNames[0]]));
                                } catch (errFallback) { reject(new Error("Formato irreconocible.")); }
                            };
                            readerFallback.readAsBinaryString(file);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                });
            }

            function leerCSV(file) {
                return new Promise((resolve, reject) => {
                    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => resolve(res.data), error: reject });
                });
            }

            document.getElementById('btnProcesar').addEventListener('click', async () => {
                const fileExcel = document.getElementById('fileExcel').files[0];
                const fileCsv = document.getElementById('fileCsv').files[0];
                const filesSolicitudes = document.getElementById('fileSolicitudes').files;

                if (!fileExcel || !fileCsv) { alert("Selecciona Inventario y Salidas."); return; }
                document.getElementById('btnProcesar').innerText = "Procesando...";

                try {
                    const setGrupos = new Set();
                    const setMaquinas = new Set();
                    const todasLasSalidasGlobales = [];

                    const datosInventario = await leerExcel(fileExcel);
                    let inventarioFiltrado = {};

                    const oldData = await cargarDatos();
                    const metaDatos = {};
                    if (oldData && oldData.resultadosTabla) {
                        oldData.resultadosTabla.forEach(f => {
                            metaDatos[f.inv.codigo] = {
                                ubicacion: f.inv.ubicacion || '',
                                nombreUtil: f.inv.nombreUtil || '',
                                ingresoManual: f.inv.ingresoManual || null,
                                salidasLocales: f.inv.salidasLocales || [],
                                oldCantidad: f.inv.cantidad
                            };
                        });
                    }

                    datosInventario.forEach(row => {
                        try {
                            if (!row || typeof row !== 'object') return;
                            let codigo = Object.values(row).find(v => typeof v === 'string' && codeRegex.test(v.trim()));
                            if (!codigo) return; codigo = codigo.trim();

                            let partes = codigo.split('-');
                            let grupoCodigo = partes[0] + '-' + partes[1];
                            setGrupos.add(grupoCodigo);

                            let descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('nomb') || k.toLowerCase().includes('detalle'));
                            let desc = descKey ? row[descKey] : "Sin descripción";

                            let noParteKey = Object.keys(row).find(k => k.toLowerCase().includes('parte') || k.toLowerCase() === 'pn' || k.toLowerCase().includes('catalogo'));
                            let noParte = noParteKey ? row[noParteKey] : "-";

                            let cantKey = Object.keys(row).find(k => k.toLowerCase().includes('cant') || k.toLowerCase().includes('exist') || k.toLowerCase().includes('stock') || k.toLowerCase().includes('disp'));
                            let cant = parseFloat(String(cantKey ? row[cantKey] : 0).replace(/,/g, '').trim());
                            if (isNaN(cant)) cant = 0;

                            let fechaKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date') || k.toLowerCase().includes('últ'));
                            let fechaCompra = parseFechaRobusta(fechaKey ? row[fechaKey] : null);

                            if (!inventarioFiltrado[codigo]) {
                                let mIngreso = null;
                                let mSalidas = [];
                                if (metaDatos[codigo]) {
                                    mIngreso = metaDatos[codigo].ingresoManual;
                                    if (metaDatos[codigo].oldCantidad !== undefined && parseFloat(metaDatos[codigo].oldCantidad) === cant) {
                                        mSalidas = metaDatos[codigo].salidasLocales;
                                    }
                                }
                                inventarioFiltrado[codigo] = {
                                    codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant,
                                    ultimaCompra: fechaCompra,
                                    ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '',
                                    nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : '',
                                    ingresoManual: mIngreso,
                                    salidasLocales: mSalidas
                                };
                            } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {
                                inventarioFiltrado[codigo].ultimaCompra = fechaCompra;
                                inventarioFiltrado[codigo].cantidad = cant;
                                inventarioFiltrado[codigo].noParte = String(noParte);
                            }
                        } catch (e) { }
                    });

                    const datosCsv = await leerCSV(fileCsv);
                    const salidasPorCodigo = {};
                    const maquinasPorCodigo = {};

                    datosCsv.forEach(row => {
                        let codigo = Object.values(row).find(v => typeof v === 'string' && codeRegex.test(v.trim()));
                        if (!codigo) return; codigo = codigo.trim();

                        let fechaKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date') || k.toLowerCase().includes('dia'));
                        let fechaSalida = fechaKey ? parseFechaRobusta(row[fechaKey]) : null;
                        if (!fechaSalida) return;

                        let destinosEnFila = new Set();
                        Object.keys(row).forEach(k => {
                            let kl = k.toLowerCase().trim();
                            if (kl.includes('maquina') || kl.includes('seccion') || kl.includes('departamento') || kl.includes('destino') || kl === 'área' || kl === 'equipo') {
                                let val = String(row[k]).trim();
                                if (val && val !== '-' && val !== '0' && val.toLowerCase() !== 'null') destinosEnFila.add(val);
                            }
                        });

                        let cantKey = Object.keys(row).find(k => k.toLowerCase().includes('cant') || k.toLowerCase().includes('qty') || k.toLowerCase() === 'salida' || k.toLowerCase() === 'consumo');
                        let cantidad = cantKey ? parseFloat(String(row[cantKey]).replace(/,/g, '').trim()) : 1;
                        if (isNaN(cantidad) || cantidad === 0) cantidad = 1;

                        if (!salidasPorCodigo[codigo]) salidasPorCodigo[codigo] = { fechas: [], cantidades: [] };
                        salidasPorCodigo[codigo].fechas.push(fechaSalida);
                        salidasPorCodigo[codigo].cantidades.push(cantidad);
                        todasLasSalidasGlobales.push(fechaSalida);

                        if (!maquinasPorCodigo[codigo]) maquinasPorCodigo[codigo] = new Set();
                        destinosEnFila.forEach(dest => { setMaquinas.add(dest); maquinasPorCodigo[codigo].add(dest); });
                    });

                    const solicitudesFiltradas = {};
                    if (filesSolicitudes && filesSolicitudes.length > 0) {
                        for (let fileSol of filesSolicitudes) {
                            let datosSolicitudes = fileSol.name.toLowerCase().endsWith('.csv') ? await leerCSV(fileSol) : await leerExcel(fileSol);
                            datosSolicitudes.forEach(row => {
                                const rowStr = JSON.stringify(row).toLowerCase();
                                if (!rowStr.includes('orozco') && !rowStr.includes('darvin')) return;

                                let codigo = Object.values(row).find(v => typeof v === 'string' && codeRegex.test(v.trim()));
                                if (!codigo) return; codigo = codigo.trim();

                                let fechaKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha') && (k.toLowerCase().includes('doc') || k.toLowerCase().includes('solic')));
                                if (!fechaKey) fechaKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha'));
                                let fechaSol = parseFechaRobusta(fechaKey ? row[fechaKey] : null);
                                if (!fechaSol || isNaN(fechaSol)) return;

                                let origen = "-";
                                let tienePanama = Object.keys(row).some(k => (k.toLowerCase().includes('panam') || k.toLowerCase().includes('extranjero')) && String(row[k]).trim() !== "" && String(row[k]).trim() !== "-");
                                let tieneCotiz = Object.keys(row).some(k => (k.toLowerCase().includes('cotizac') || k.toLowerCase().includes('cot')) && String(row[k]).trim() !== "" && String(row[k]).trim() !== "-");

                                if (tienePanama) origen = "Extranjero";
                                else if (tieneCotiz) origen = "Local";
                                else origen = "Nacional";

                                if (!solicitudesFiltradas[codigo] || fechaSol > solicitudesFiltradas[codigo].fecha) {
                                    solicitudesFiltradas[codigo] = { fecha: fechaSol, origen: origen };
                                }
                            });
                        }
                    }

                    const qGlobales = obtenerCincoCuartiles(todasLasSalidasGlobales);
                    const limiteInactivo = qGlobales[1]; const limiteActivo = qGlobales[3];

                    let resultadosTabla = [];
                    Object.keys(inventarioFiltrado).forEach(codigo => {
                        const inv = inventarioFiltrado[codigo];

                        let historialSalidas = [];
                        let fCrudas = salidasPorCodigo[codigo]?.fechas || [];
                        let cCrudas = salidasPorCodigo[codigo]?.cantidades || [];
                        for (let i = 0; i < fCrudas.length; i++) {
                            if (cCrudas[i] > 0 && !isNaN(cCrudas[i])) historialSalidas.push({ fecha: fCrudas[i], cantidad: cCrudas[i] });
                        }
                        historialSalidas.sort((a, b) => a.fecha - b.fecha);

                        const salidas = historialSalidas.map(h => h.fecha);
                        const cantidadesSalidas = historialSalidas.map(h => h.cantidad);
                        const qConsumo = obtenerCincoCuartiles(cantidadesSalidas);
                        const maquinasUnicas = maquinasPorCodigo[codigo] ? Array.from(maquinasPorCodigo[codigo]).join(", ") : "-";
                        const sol = solicitudesFiltradas[codigo] || { fecha: null, origen: "-" };

                        let vecesUsado = salidas.length;
                        let primeraSalida = vecesUsado > 0 ? salidas[0] : null;
                        let ultimaSalida = vecesUsado > 0 ? salidas[salidas.length - 1] : null;

                        let estado = "Sin movimiento"; let estadoClase = "bg-gray-200 text-gray-700";
                        if (ultimaSalida) {
                            if (ultimaSalida >= limiteActivo) { estado = "Activo"; estadoClase = "bg-green-100 text-green-800"; }
                            else if (ultimaSalida >= limiteInactivo) { estado = "Moderado"; estadoClase = "bg-yellow-100 text-yellow-800"; }
                            else { estado = "Inactivo"; estadoClase = "bg-red-100 text-red-800"; }
                        }

                        let diasEntreSalidas = [];
                        for (let i = 1; i < salidas.length; i++) diasEntreSalidas.push((salidas[i] - salidas[i - 1]) / 86400000);
                        const qDiasSalidas = obtenerCincoCuartiles(diasEntreSalidas);

                        let proyeccionMs = ""; let proyeccionTexto = "N/A";
                        if (inv.cantidad <= 1 && ultimaSalida && qDiasSalidas[2] !== null) {
                            proyeccionMs = ultimaSalida + (qDiasSalidas[2] * 86400000);
                            proyeccionTexto = formatFechaCorto(proyeccionMs);
                        }

                        let demandaAnual = null;
                        if (historialSalidas.length > 0) {
                            let consumoPorAnio = {};
                            historialSalidas.forEach(h => {
                                let localYear = new Date(h.fecha).getFullYear();
                                if (!consumoPorAnio[localYear]) consumoPorAnio[localYear] = 0;
                                consumoPorAnio[localYear] += h.cantidad;
                            });
                            let valoresAnuales = Object.values(consumoPorAnio);
                            demandaAnual = `${Math.min(...valoresAnuales)}, ${Math.max(...valoresAnuales)}`;
                        }

                        let resumenMensual = new Array(12).fill(0);
                        const hoy = new Date();
                        historialSalidas.forEach(h => {
                            const d = new Date(h.fecha);
                            const diffMeses = (hoy.getFullYear() - d.getFullYear()) * 12 + (hoy.getMonth() - d.getMonth());
                            if (diffMeses >= 0 && diffMeses < 12) {
                                resumenMensual[11 - diffMeses] += h.cantidad;
                            }
                        });

                        resultadosTabla.push({
                            inv, maquinasUnicas, estado, estadoClase, vecesUsado, primeraSalida, ultimaSalida,
                            qDiasSalidas, proyeccionTexto, proyeccionMs, qConsumo, solFecha: sol.fecha,
                            solOrigen: sol.origen, demandaAnual: demandaAnual, resumenMensual: resumenMensual
                        });
                    });

                    const datosParaGuardar = { resultadosTabla, gruposUnicos: Array.from(setGrupos), maquinasUnicas: Array.from(setMaquinas) };
                    await guardarDatos(datosParaGuardar);
                    inicializarInterfaz(datosParaGuardar);
                    document.getElementById('btnProcesar').innerText = "Procesar y Guardar";

                } catch (error) {
                    console.error(error);
                    alert("Error al procesar: " + error.message);
                    document.getElementById('btnProcesar').innerText = "Procesar y Guardar";
                }
            });

            function inicializarInterfaz(datos) {
                TODOS_LOS_DATOS = datos.resultadosTabla;
                TODOS_LOS_DATOS.sort((a, b) => {
                    if (!a.proyeccionMs && !b.proyeccionMs) return (b.ultimaSalida || 0) - (a.ultimaSalida || 0);
                    if (!a.proyeccionMs) return 1; if (!b.proyeccionMs) return -1;
                    return a.proyeccionMs - b.proyeccionMs;
                });

                const selGrupo = document.getElementById('filtroGrupo');
                const selMaquina = document.getElementById('filtroMaquina');
                if (selGrupo && selMaquina && datos.gruposUnicos && datos.maquinasUnicas) {
                    selGrupo.innerHTML = '<option value="todos">Todos</option>';
                    datos.gruposUnicos.sort().forEach(g => selGrupo.innerHTML += `<option value="${g}">${g}</option>`);
                    selMaquina.innerHTML = '<option value="todas">Todas</option>';
                    datos.maquinasUnicas.sort().forEach(m => selMaquina.innerHTML += `<option value="${m}">${m}</option>`);
                }

                const tbn = document.getElementById('resultTable'); if (tbn) tbn.classList.remove('hidden');
                const tv = document.getElementById('tabsVistas'); if (tv) tv.classList.remove('hidden');
                if (typeof setVista === 'function') setVista('sencilla');

                document.getElementById('zonaImportacion').classList.add('hidden');
                const cc = document.getElementById('controlesSesion'); if (cc) cc.classList.remove('hidden');
                document.getElementById('pantallaCarga').classList.add('hidden');

                if (typeof buscarSencilla === 'function') buscarSencilla();
                if (typeof ejecutarBusqueda === 'function') ejecutarBusqueda();
                if (typeof actualizarDatalists === 'function') actualizarDatalists();
            }

            document.addEventListener('DOMContentLoaded', async () => {
                cargarCarritoLocal();
                if (document.getElementById('gFechaSug')) {
                    document.getElementById('gFechaSug').value = new Date().toISOString().slice(0, 10);
                }
                aplicarEstadoBodeguero();

                try {
                    const datosGuardados = await cargarDatos();
                    if (datosGuardados && datosGuardados.resultadosTabla && datosGuardados.resultadosTabla.length > 0) {
                        inicializarInterfaz(datosGuardados);
                    } else {
                        document.getElementById('zonaImportacion').classList.remove('hidden');
                        document.getElementById('pantallaCarga').classList.add('hidden');
                    }
                } catch (error) {
                    document.getElementById('zonaImportacion').classList.remove('hidden');
                    document.getElementById('pantallaCarga').classList.add('hidden');
                }
            });