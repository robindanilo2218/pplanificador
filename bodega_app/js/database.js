// -----------------------------------------------------
// 2. BASE DE DATOS LOCAL E HISTORIAL
// -----------------------------------------------------
const DB_NAME = 'BodegaDB';
const STORE_ANALISIS = 'analisisStore';
const STORE_HISTORIAL = 'historialStore';
const STORE_THUMBNAILS = 'thumbnailsStore';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 4);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_ANALISIS)) db.createObjectStore(STORE_ANALISIS);
            if (!db.objectStoreNames.contains(STORE_HISTORIAL)) db.createObjectStore(STORE_HISTORIAL, { keyPath: 'id_solicitud' });
            if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) db.createObjectStore(STORE_THUMBNAILS);
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
        const arbol = await cargarArbolMaquinas() || null;
        const carritoActivo = JSON.parse(localStorage.getItem('carritoActivo') || '[]');
        const historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');

        const backupObj = {
            version: "2.2",
            fecha: new Date().toISOString(),
            inventario: inventario,
            historial: historial,
            borradores: borradores,
            arbolMaquinas: arbol,
            carritoActivo: carritoActivo,
            historialBusquedas: historialBusquedas
        };

        const nItems = inventario?.resultadosTabla?.length || 0;
        const nHist = historial.length;
        const nBorr = borradores.length;
        const nCar = carritoActivo.length;

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

        alert(`✅ Backup generado correctamente.\n\n📦 Inventario: ${nItems} repuestos\n📜 Historial solicitudes: ${nHist} registros\n📝 Borradores: ${nBorr} guardados\n🛒 Carrito activo: ${nCar} ítems\n\nGuarda este archivo en un lugar seguro.`);
    } catch (e) {
        alert("Error al exportar backup: " + e);
    }
}

function restaurarBackup(input) {
    const file = input.files[0];
    if (!file) return;

    const pin = prompt('Ingrese el PIN de seguridad (1234) para restaurar o combinar el Backup:');
    if (pin !== '1234') {
        if (pin !== null) alert('PIN Incorrecto. Operación abortada.');
        input.value = "";
        return;
    }

    const usarMerge = confirm("¿Deseas COMBINAR los datos del backup con los datos locales de esta computadora?\n\n• [Aceptar]: Combinará el historial, carrito, borradores, inventario y máquinas (no se perderá nada de lo que tengas guardado localmente).\n• [Cancelar]: Sobreescribirá la base de datos actual por completo (reemplazo total).");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.inventario && !backup.historial) {
                alert("El archivo JSON no tiene el formato de backup válido de esta aplicación.");
                return;
            }

            const db = await initDB();
            if (usarMerge) {
                // FUSIONAR HISTORIAL
                const histExistente = await obtenerHistorial();
                const histFusionado = [...histExistente];
                if (backup.historial) {
                    backup.historial.forEach(h => {
                        if (!histFusionado.some(x => x.id_solicitud === h.id_solicitud)) {
                            histFusionado.push(h);
                        }
                    });
                }
                
                // FUSIONAR INVENTARIO (nombreUtil, ubicacion, ingresoManual)
                let invFusionado = backup.inventario;
                if (backup.inventario && backup.inventario.resultadosTabla && typeof TODOS_LOS_DATOS !== 'undefined') {
                    backup.inventario.resultadosTabla.forEach(bItem => {
                        const localItem = TODOS_LOS_DATOS.find(x => x.inv.codigo === bItem.inv.codigo);
                        if (localItem) {
                            localItem.inv.nombreUtil = bItem.inv.nombreUtil || localItem.inv.nombreUtil;
                            localItem.inv.ubicacion = bItem.inv.ubicacion || localItem.inv.ubicacion;
                            if (bItem.inv.ingresoManual) localItem.inv.ingresoManual = bItem.inv.ingresoManual;
                        }
                    });
                    const setGrupos = new Set();
                    const setMaquinas = new Set();
                    TODOS_LOS_DATOS.forEach(d => { setGrupos.add(d.inv.grupo); if (d.maquinasUnicas) d.maquinasUnicas.split(', ').forEach(m => setMaquinas.add(m)); });
                    invFusionado = {
                        resultadosTabla: TODOS_LOS_DATOS,
                        gruposUnicos: Array.from(setGrupos),
                        maquinasUnicas: Array.from(setMaquinas)
                    };
                }
                
                // FUSIONAR ARBOL DE MAQUINAS
                let arbolFusionado = backup.arbolMaquinas;
                if (backup.arbolMaquinas && arbolMaquinas) {
                    fusionarNodosArbol(arbolMaquinas, backup.arbolMaquinas);
                    arbolFusionado = arbolMaquinas;
                }
                
                // GUARDAR EN BASE DE DATOS FUSIONADOS
                await new Promise(r => {
                    const tx = db.transaction([STORE_ANALISIS, STORE_HISTORIAL], 'readwrite');
                    if (invFusionado) tx.objectStore(STORE_ANALISIS).put(invFusionado, 'datosGuardados');
                    if (arbolFusionado) tx.objectStore(STORE_ANALISIS).put(arbolFusionado, 'arbolMaquinas');
                    const storeHist = tx.objectStore(STORE_HISTORIAL);
                    storeHist.clear();
                    histFusionado.forEach(h => storeHist.put(h));
                    tx.oncomplete = r;
                });

                // FUSIONAR BORRADORES
                if (backup.borradores && Array.isArray(backup.borradores)) {
                    const localBorradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
                    const combinadosBorr = [...localBorradores];
                    backup.borradores.forEach(b => {
                        if (!combinadosBorr.some(x => x.nombre === b.nombre)) {
                            combinadosBorr.push(b);
                        }
                    });
                    localStorage.setItem('cartBorradores', JSON.stringify(combinadosBorr));
                }

                // FUSIONAR CARRITO ACTIVO
                if (backup.carritoActivo && Array.isArray(backup.carritoActivo)) {
                    const localCart = JSON.parse(localStorage.getItem('carritoActivo') || '[]');
                    const combinadosCart = [...localCart];
                    backup.carritoActivo.forEach(item => {
                        const existente = combinadosCart.find(x => x.codigo === item.codigo && x.esNuevo === item.esNuevo);
                        if (existente) {
                            existente.cant = Math.max(existente.cant, item.cant);
                        } else {
                            combinadosCart.push(item);
                        }
                    });
                    localStorage.setItem('carritoActivo', JSON.stringify(combinadosCart));
                }
                
                alert(`✅ Backup COMBINADO correctamente.\n\nSe fusionaron solicitudes y especificaciones sin borrar tu trabajo local.\nEl sistema se recargará ahora.`);
                location.reload();
                
            } else {
                // MODO SOBREESCRIBIR TOTAL
                document.getElementById('zonaImportacion').classList.add('hidden');
                document.getElementById('pantallaCarga').classList.remove('hidden');
                document.getElementById('vistaDetallada').classList.add('hidden');
                document.getElementById('vistaSencilla').classList.add('hidden');

                await new Promise(r => {
                    const tx = db.transaction([STORE_ANALISIS, STORE_HISTORIAL], 'readwrite');
                    if (backup.inventario) tx.objectStore(STORE_ANALISIS).put(backup.inventario, 'datosGuardados');
                    if (backup.arbolMaquinas) tx.objectStore(STORE_ANALISIS).put(backup.arbolMaquinas, 'arbolMaquinas');
                    if (backup.historial) {
                        const storeHist = tx.objectStore(STORE_HISTORIAL);
                        storeHist.clear();
                        backup.historial.forEach(h => storeHist.put(h));
                    }
                    tx.oncomplete = r;
                });

                if (backup.borradores && Array.isArray(backup.borradores)) {
                    localStorage.setItem('cartBorradores', JSON.stringify(backup.borradores));
                }
                if (backup.carritoActivo && Array.isArray(backup.carritoActivo)) {
                    localStorage.setItem('carritoActivo', JSON.stringify(backup.carritoActivo));
                } else {
                    localStorage.removeItem('carritoActivo');
                }
                if (backup.historialBusquedas && Array.isArray(backup.historialBusquedas)) {
                    localStorage.setItem('historialBusquedas', JSON.stringify(backup.historialBusquedas));
                }

                alert(`✅ Backup RESTAURADO por completo (Sobreescrito).\n\nEl sistema se recargará ahora.`);
                location.reload();
            }
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
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
            tx.objectStore(STORE_HISTORIAL).put({
                id_solicitud: solicitudId,
                fecha_log: new Date().getTime(),
                items: items,
                form: formInfo || {}
            });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
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
