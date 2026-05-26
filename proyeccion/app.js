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
function cargarCarritoLocal() { try { const g = localStorage.getItem('carritoActivo'); if (g) carrito = JSON.parse(g); } catch (e) { carrito = []; } }
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
    const btnC = document.getElementById('btnTabCatalogo');
    const btnR = document.getElementById('btnTabRepuestosMaquina');
    const secS = document.getElementById('vistaSencilla');
    const secD = document.getElementById('vistaDetallada');
    const secC = document.getElementById('vistaCatalogo');
    const secR = document.getElementById('vistaRepuestosMaquina');

    // Hide all sections
    if (secS) secS.classList.add('hidden');
    if (secD) {
        secD.classList.add('hidden');
        secD.classList.remove('w-full');
    }
    if (secC) secC.classList.add('hidden');
    if (secR) secR.classList.add('hidden');

    // Reset button states
    [btnS, btnD, btnC, btnR].forEach(btn => {
        if (btn) {
            btn.classList.replace('bg-blue-600', 'bg-gray-200');
            btn.classList.replace('text-white', 'text-gray-800');
        }
    });

    if (v === 'sencilla') {
        if (secS) secS.classList.remove('hidden');
        if (btnS) {
            btnS.classList.replace('bg-gray-200', 'bg-blue-600');
            btnS.classList.replace('text-gray-800', 'text-white');
        }
        if (document.getElementById('busqSencilla') && document.getElementById('busqSencilla').value.trim() !== '') {
            buscarSencilla();
        } else {
            renderSencilla(calcularDatosSencilla());
        }
        renderHistorialSencillo();
        actualizarMiniCarrito();
    } else if (v === 'detallada') {
        if (secD) secD.classList.remove('hidden');
        if (btnD) {
            btnD.classList.replace('bg-gray-200', 'bg-blue-600');
            btnD.classList.replace('text-white', 'text-gray-800');
        }
        ejecutarBusqueda();
    } else if (v === 'catalogo') {
        if (secC) secC.classList.remove('hidden');
        if (btnC) {
            btnC.classList.replace('bg-gray-200', 'bg-blue-600');
            btnC.classList.replace('text-white', 'text-gray-800');
        }
        if (document.getElementById('busqCatalogo') && document.getElementById('busqCatalogo').value.trim() !== '') {
            buscarCatalogo();
        } else {
            renderCatalogo(TODOS_LOS_DATOS);
        }
    } else if (v === 'repuestosMaquina') {
        if (secR) secR.classList.remove('hidden');
        if (btnR) {
            btnR.classList.replace('bg-gray-200', 'bg-blue-600');
            btnR.classList.replace('text-gray-800', 'text-white');
        }
        inicializarVistaArbolMaquinas();
    }
    verificarSincronizacionBusqueda(v);
}

// Navega a la vista detallada filtrando por un código de repuesto específico
function irADetalleCodigo(codigo) {
    if (!codigo) return;
    
    // Asignar el texto de búsqueda
    const inpBusq = document.getElementById('busquedaTexto');
    if (inpBusq) inpBusq.value = codigo.trim();
    
    // Restablecer filtros a valores por defecto para asegurar la visibilidad
    const selStock = document.getElementById('filtroStock');
    if (selStock) selStock.value = 'todos';
    
    const selProy = document.getElementById('filtroProyeccion');
    if (selProy) selProy.value = 'todas';
    
    const selGrupo = document.getElementById('filtroGrupo');
    if (selGrupo) selGrupo.value = 'todos';
    
    const selMaquina = document.getElementById('filtroMaquina');
    if (selMaquina) selMaquina.value = 'todas';
    
    const selEstado = document.getElementById('filtroEstado');
    if (selEstado) selEstado.value = 'todos';
    
    const selSalida = document.getElementById('filtroUltimaSalida');
    if (selSalida) selSalida.value = 'todas';
    
    const selIngreso = document.getElementById('filtroUltimoIngreso');
    if (selIngreso) selIngreso.value = 'todas';
    
    const selIngManual = document.getElementById('filtroIngresoManual');
    if (selIngManual) selIngManual.value = 'todos';
    
    const selTipo = document.getElementById('tipoBusqueda');
    if (selTipo) selTipo.value = 'and';

    // Activar la vista detallada
    setVista('detallada');
}

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
    const baseData = typeof filtrarColeccionGlobal === 'function' ? filtrarColeccionGlobal(TODOS_LOS_DATOS) : TODOS_LOS_DATOS;

    if (_tabSencilla === 'proximos') {
        return [...baseData].filter(f => f.proyeccionMs).sort((a, b) => (a.proyeccionMs || Infinity) - (b.proyeccionMs || Infinity));
    }
    if (_tabSencilla === 'todos') {
        return [...baseData].sort((a, b) => (a.inv.descripcion || '').localeCompare(b.inv.descripcion || ''));
    }

    return [...baseData]
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
    const baseData = typeof filtrarColeccionGlobal === 'function' ? filtrarColeccionGlobal(TODOS_LOS_DATOS) : TODOS_LOS_DATOS;
    const filtrados = baseData.filter(fila => {
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
                <tr class="border-b hover:bg-blue-50 transition" data-repuesto-codigo="${fila.inv.codigo}">
                    <td class="p-1">
                        <div class="flex gap-0.5 justify-center items-center">
                            <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Añadir 1 rápido" onclick="event.stopPropagation(); simpleAddToCart('${fila.inv.codigo}', 1)">+1</button>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Ficha técnica y solicitud" onclick="event.stopPropagation(); abrirModalDetalleSencillo('${fila.inv.codigo}')">🔎</button>
                            <button class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-1 py-1 rounded text-[10px]" title="Ver historial de solicitudes de este repuesto" onclick="event.stopPropagation(); verHistorialRepuesto('${fila.inv.codigo}')">📄</button>
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
        tr.setAttribute('data-repuesto-codigo', inv.codigo);

        tr.innerHTML = `
                    <td class="p-1">
                        <div class="flex gap-1 justify-center items-center">
                            <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px] shadow-sm" title="Añadir 1 rápido" onclick="event.stopPropagation(); simpleAddToCart('${inv.codigo}', 1)">+1</button>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px] shadow-sm" title="Ficha técnica y solicitud" onclick="event.stopPropagation(); abrirModalDetalleSencillo('${inv.codigo}')">🔎</button>
                            <button class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-1 py-1 rounded text-[10px] shadow-sm" title="Historial de solicitudes" onclick="event.stopPropagation(); verHistorialRepuesto('${inv.codigo}')">📄</button>
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

    const baseData = typeof filtrarColeccionGlobal === 'function' ? filtrarColeccionGlobal(TODOS_LOS_DATOS) : TODOS_LOS_DATOS;
    DATOS_FILTRADOS = baseData.filter(fila => {
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
    if (!codigo) return;
    const clean = codigo.trim().toUpperCase();
    const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo.trim().toUpperCase() === clean);
    if (fila) {
        abrirModalDetalle(fila);
    } else {
        console.error("No se encontró el repuesto en TODOS_LOS_DATOS:", codigo);
    }
}

function simpleAddToCart(codigo, cant) {
    const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
    if (!fila) return;

    const existente = carrito.find(i => i.codigo === codigo && !i.esNuevo);
    if (existente) {
        existente.cant += parseFloat(cant);
    } else {
        carrito.push({
            codigo: fila.inv.codigo,
            noParte: fila.inv.noParte || "-",
            descripcion: fila.inv.descripcion,
            cant: parseFloat(cant),
            urgencia: 'Normal'
        });
    }
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
                            <span class="font-bold text-[11px] text-blue-800">${it.codigo}${it.urgencia === 'Critico' ? ' 🔴' : it.urgencia === 'Urgente' ? ' ⚡' : ''}</span>
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
    } catch (e) {
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
                            ${form.fechaSug ? `<div style="flex: 1 1 45%;"><strong>Fecha Sugerida de Cierre:</strong> ${form.fechaSug}</div>` : ''}
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

async function abrirModalDetalle(fila) {
    try {
        itemActualSeleccionado = fila;
        document.getElementById('detDesc').innerText = fila.inv.descripcion;
        document.getElementById('detCodigo').innerText = `COD: ${fila.inv.codigo} | PN: ${fila.inv.noParte || '-'}`;
        document.getElementById('detStock').innerText = fila.inv.cantidad;
        document.getElementById('detEstado').innerHTML = `<span class="badge ${fila.estadoClase} text-xs shadow-sm">${fila.estado}</span>`;
        document.getElementById('detDemanda').innerText = fila.demandaAnual !== null ? fila.demandaAnual : "N/A";
        document.getElementById('detProyeccion').innerText = fila.proyeccionTexto;
        document.getElementById('detPrimeraSalida').innerText = formatFechaCorto(fila.primeraSalida);
        document.getElementById('detUltimaSalida').innerText = formatFechaCorto(fila.ultimaSalida);
        
        // Evitar fallos si qConsumo no está definido para este item
        const q = fila.qConsumo || [null, null, null, null, null];
        document.getElementById('detQ0').innerText = formatQ(q[0]);
        document.getElementById('detQ1').innerText = formatQ(q[1]);
        document.getElementById('detQ2').innerText = formatQ(q[2]);
        document.getElementById('detQ3').innerText = formatQ(q[3]);
        document.getElementById('detQ4').innerText = formatQ(q[4]);
        
        const elMaquinas = document.getElementById('detMaquinas');
        if (elMaquinas) elMaquinas.innerText = fila.maquinasUnicas;

        // Dibujar el árbol de máquinas podado donde se utiliza el repuesto
        const treeCont = document.getElementById('detArbolUso');
        if (treeCont) {
            const pruned = buscarCoincidenciasYPrunar(arbolMaquinas, fila.inv.codigo);
            if (pruned) {
                treeCont.innerHTML = dibujarPrunedNodoHtml(pruned, 0);
            } else {
                treeCont.innerHTML = `
                    <div class="text-gray-400 italic py-3 px-1 text-center text-xs">
                        ⚠️ Este repuesto aún no está vinculado a ninguna máquina.
                        <br>
                        <button class="mt-2.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100 rounded shadow-sm text-[10px]" onclick="cerrarModalDetalle(); setVista('repuestosMaquina');">
                            Ir a Vincular en Árbol
                        </button>
                    </div>`;
            }
        }
        document.getElementById('inpCant').value = 1;
        document.getElementById('inpMaquina').value = '';
        document.getElementById('inpSerie').value = '';
        document.getElementById('inpModelo').value = '';
        document.getElementById('inpSeccion').value = '';
        document.getElementById('inpTecnico').value = '';
        document.getElementById('inpFechaSug').value = new Date().toISOString().split('T')[0];
        if (document.getElementById('inpUrgencia')) document.getElementById('inpUrgencia').value = 'Normal';

        // Cargar imágenes asociadas de forma asíncrona (solicitando alta calidad)
        imagenesDetalleActuales = await obtenerImagenesRepuesto(fila.inv.codigo, fila.inv.noParte, true);
        indiceImagenDetalle = 0;
        mostrarImagenDetalle();

        document.getElementById('modalDetalle').classList.remove('hidden');
        if (typeof actualizarBotonIgnoradoModal === 'function') actualizarBotonIgnoradoModal(fila.inv.codigo);
        
        // Poblar datalist de búsqueda en detalle con todos los códigos para autocompletar
        const lst = document.getElementById('lstCodigosDetalle');
        if (lst && typeof TODOS_LOS_DATOS !== 'undefined' && lst.children.length === 0) {
            lst.innerHTML = TODOS_LOS_DATOS.map(x => `<option value="${x.inv.codigo}">${x.inv.descripcion.substring(0, 50)}...</option>`).join('');
        }
        // Limpiar buscador interno del detalle al cargar una ficha técnica
        const inpBusq = document.getElementById('inpBuscarCodigoDetalle');
        if (inpBusq) inpBusq.value = '';

        setTimeout(() => document.getElementById('inpCant').focus(), 100);
    } catch (err) {
        console.error("Error al abrir detalle:", err);
        alert("No se pudo abrir el detalle de este repuesto: " + err.message);
    }
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
                cant: parseFloat(i.cant || 1),
                urgencia: i.urgencia || 'Normal'
            });
        } else if (i.codigo === "CREAR CODIGO NUEVO" || i.codigo === "NUEVO-REGISTRO") {
            carrito.push({
                ...i,
                urgencia: i.urgencia || 'Normal'
            });
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
                        <th class="p-2 border whitespace-nowrap">Fecha</th>
                        <th class="p-2 border">Código</th>
                        <th class="p-2 border">Descripción</th>
                        <th class="p-2 border text-center">Cant</th>
                        <th class="p-2 border">Destino</th>
                    </tr></thead>
                    <tbody>
                        ${todasLasSalidas.map(s => `
                            <tr class="hover:bg-red-50 transition border-b align-top">
                                <td class="p-2 text-[10px] whitespace-nowrap text-gray-600">${s.fechaStr}</td>
                                <td class="p-2 font-bold text-blue-700 min-w-[90px]">
                                    ${s.codigo}
                                    ${s.noParte && s.noParte !== '-' ? `<br><span class="font-normal text-gray-400 text-[9px]">${s.noParte}</span>` : ''}
                                </td>
                                <td class="p-2 whitespace-normal break-words leading-snug min-w-[160px]">${s.descripcion}</td>
                                <td class="p-2 text-center font-bold text-red-600 text-sm whitespace-nowrap">-${s.cantidad}</td>
                                <td class="p-2 text-[10px] leading-tight whitespace-nowrap"><b>Máq:</b> ${s.maquina}<br><b>Sec:</b> ${s.seccion}</td>
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

    const urgEl = document.getElementById('inpUrgencia');
    const urgencia = urgEl ? urgEl.value : 'Normal';

    carrito.push({
        codigo: itemActualSeleccionado.inv.codigo,
        noParte: itemActualSeleccionado.inv.noParte || "-",
        descripcion: itemActualSeleccionado.inv.descripcion,
        nombreUtil: itemActualSeleccionado.inv.nombreUtil || '',
        cant: cant,
        urgencia: urgencia
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
    ['nrDescripcion', 'nrNoParte', 'nrObservaciones'].forEach(id => {
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
        urgencia: urgencia,
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

        const feSugStr = newForm.fechaSug ? ` | Fecha Sug: ${newForm.fechaSug}` : '';
        let tablaHtml = `<div style="font-family:Arial,sans-serif;color:#333;font-size:12px;border:1px solid #ccc;padding:15px;">
                    <h2 style="color:#1e3a8a;margin-top:0;">SOLICITUD DE REPUESTOS #${solId} (Corregida)</h2>
                    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;text-align:left;">
                        <thead style="background-color:#f3f4f6;color:#1f2937;"><tr><th>#</th><th>Código / Parte</th><th>Descripción</th><th>Cant.</th></tr></thead>
                        <tbody>
                            <tr><td colspan="4" style="background-color:#e0f2fe;text-align:center;padding:5px;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}${extInfo}${feSugStr} | Téc: ${gTec}</td></tr>
                            ${items.map((it, idx) => `<tr><td>${idx + 1}</td><td><b>${it.codigo}</b><br><span style="font-size:10px;">${it.noParte || ''}</span></td><td>${it.descripcion}${it.nombreUtil ? `<br><span style="font-size:10px;color:#059669;">${it.nombreUtil}</span>` : ''}</td><td style="text-align:center;font-weight:bold;color:#d97706;">${it.cant}</td></tr>`).join('')}
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
            const urg = item.urgencia || 'Normal';
            let urgBadge = '';
            if (urg === 'Critico') {
                urgBadge = `<br><span class="inline-block bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">🔴 CRÍTICO</span>`;
            } else if (urg === 'Urgente') {
                urgBadge = `<br><span class="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">⚡ URGENTE</span>`;
            } else {
                urgBadge = `<br><span class="inline-block bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1">Normal</span>`;
            }

            return `
                    <tr class="${rowClass}">
                        <td class="px-4 py-2">${codigoBadge}${urgBadge}</td>
                        <td class="px-4 py-2 text-xs font-semibold">${item.descripcion}${nombreUtilBadge}${maqInfo}</td>
                        <td class="px-3 py-1 text-center">
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="ajustarCantCarrito(${index}, -1)"
                                    class="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-red-200 text-gray-700 font-bold rounded text-sm transition leading-none">−</button>
                                <input type="number" min="1" value="${item.cant}"
                                    class="w-14 text-center font-black text-base text-orange-600 border border-gray-300 rounded py-0.5 outline-none focus:border-orange-400"
                                    onchange="setCantCarrito(${index}, this.value)"
                                    oninput="if(this.value<1)this.value=1">
                                <button onclick="ajustarCantCarrito(${index}, 1)"
                                    class="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-green-200 text-gray-700 font-bold rounded text-sm transition leading-none">+</button>
                            </div>
                        </td>
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

function setCantCarrito(index, valor) {
    const n = parseFloat(valor);
    if (isNaN(n) || n < 1) return;
    carrito[index].cant = n;
    guardarCarritoLocal();
    actualizarBadgeCarrito();
    actualizarMiniCarrito();
}

function ajustarCantCarrito(index, delta) {
    const nueva = (carrito[index]?.cant || 1) + delta;
    if (nueva < 1) return;
    carrito[index].cant = nueva;
    guardarCarritoLocal();
    actualizarBadgeCarrito();
    actualizarMiniCarrito();
    // Actualizar el input directamente sin re-renderizar toda la tabla
    const inputs = document.querySelectorAll('#contenedorItemsCarrito input[type="number"]');
    if (inputs[index]) inputs[index].value = nueva;
}

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
    const gFeS = form.fechaSug || '';
    const extInfo = (gSer ? ` | Serie: ${gSer}` : '') + (gMod ? ` | Mod: ${gMod}` : '');

    const destinatario = "dorozco@empresasgalindo.com";
    const copia = "electrico.cogusa@empresasgalindo.com";
    const sufijo = esReenvio ? ' (REENVIO)' : '';
    const asunto = encodeURIComponent(`SOL. COMPRA #${idSol} | Máq: ${gMaq} - DEPTO ELECTRICO${sufijo}`);

    const usarTexto = confirm("¿En qué formato desea copiar la solicitud?\n\nAceptar = Texto con tabulaciones (para pegar en cuerpo de correo plano)\nCancelar = Tabla HTML formateada (CTRL+V en correo con formato)");
    const incluirStats = document.getElementById('chkIncluirStats') ? document.getElementById('chkIncluirStats').checked : false;

    const getStatsText = (codigo) => {
        const f = TODOS_LOS_DATOS.find(x => x.inv.codigo === codigo);
        if (!f) return '';
        const med = f.qConsumo ? formatQ(f.qConsumo[2]) : '-';
        return `Stock: ${f.inv.cantidad} | Mediana Consumo: ${med} | Demanda Anual: ${f.demandaAnual !== null ? f.demandaAnual : 'N/A'} | Rotación: ${f.estado} | Proyección: ${f.proyeccionTexto || 'N/A'}`;
    };

    let contenidoCopia, textoPlano;

    if (usarTexto) {
        let lines = [`SOLICITUD #${idSol}${sufijo}`, `Destino: ${gMaq} | Sección: ${gSec}${extInfo}`, `Técnico: ${gTec}${gFeS ? ` | Fecha Sug: ${gFeS}` : ''}`, ''];
        lines.push(['#', 'Código', 'PN', 'Descripción', 'Cant.'].join('\t\t'));
        
        items.forEach((it, idx) => {
            const urgStr = it.urgencia === 'Critico' ? ' [🔴 CRÍTICO]' : it.urgencia === 'Urgente' ? ' [⚡ URGENTE]' : '';
            let descWithUrg = `${it.descripcion}${it.nombreUtil ? ' [' + it.nombreUtil + ']' : ''}${urgStr}`;
            if (incluirStats && !it.esNuevo) {
                const stats = getStatsText(it.codigo);
                if (stats) descWithUrg += `\n    ↳ [Estadísticas] ${stats}`;
            }
            lines.push([idx + 1, it.codigo, it.noParte || '-', descWithUrg, it.cant].join('\t\t'));
        });

        textoPlano = lines.join('\n');
        contenidoCopia = [new ClipboardItem({ 'text/plain': new Blob([textoPlano], { type: 'text/plain' }) })];
    } else {
        const htmlRows = items.map((it, i) => {
            let urgHtml = '';
            if (it.urgencia === 'Critico') {
                urgHtml = `<span style="background-color:#fee2e2;color:#991b1b;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;margin-left:5px;display:inline-block;vertical-align:middle;">🔴 CRÍTICO</span>`;
            } else if (it.urgencia === 'Urgente') {
                urgHtml = `<span style="background-color:#fef9c3;color:#854d0e;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;margin-left:5px;display:inline-block;vertical-align:middle;">⚡ URGENTE</span>`;
            }

            let statsHtml = '';
            if (incluirStats && !it.esNuevo) {
                const f = TODOS_LOS_DATOS.find(x => x.inv.codigo === it.codigo);
                if (f) {
                    const med = f.qConsumo ? formatQ(f.qConsumo[2]) : '-';
                    statsHtml = `
                    <div style="margin-top:6px; padding:6px; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; font-size:11px; color:#1e40af; line-height:1.4;">
                        <strong>📊 Análisis de Consumo y Demanda:</strong><br>
                        • <b>Stock Actual:</b> ${f.inv.cantidad} | • <b>Consumo Mediana:</b> ${med} | • <b>Demanda Anual:</b> ${f.demandaAnual !== null ? f.demandaAnual : 'N/A'}<br>
                        • <b>Rotación:</b> ${f.estado} | • <b>Proyección Compra:</b> ${f.proyeccionTexto || 'N/A'}
                    </div>`;
                }
            }

            return `<tr>
                <td>${i + 1}</td>
                <td><b>${it.codigo}</b><br><small>${it.noParte || ''}</small></td>
                <td>${it.descripcion}${it.nombreUtil ? `<br><small style="color:#059669;">${it.nombreUtil}</small>` : ''}${urgHtml}${statsHtml}</td>
                <td style="text-align:center;font-weight:bold;color:#d97706;">${it.cant}</td>
            </tr>`;
        }).join('');

        const html = `<div style="font-family:Arial,sans-serif;color:#333;font-size:12px;border:1px solid #ccc;padding:15px;">
                    <h2 style="color:#1e3a8a;margin-top:0;">SOLICITUD DE REPUESTOS #${idSol}${sufijo}</h2>
                    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;text-align:left;">
                        <thead style="background-color:#f3f4f6;"><tr><th>#</th><th>Código / PN</th><th>Descripción</th><th>Cant.</th></tr></thead>
                        <tbody>
                            <tr><td colspan="4" style="background:#e0f2fe;text-align:center;"><b>Destino:</b> Máq: ${gMaq} | Secc: ${gSec}${extInfo} | Téc: ${gTec}${gFeS ? ` | Fecha Sug: ${gFeS}` : ''}</td></tr>
                            ${htmlRows}
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

    // Función local para rellenar texto a ancho fijo (padding)
    const pad = (str, len) => {
        const s = String(str ?? '-').replace(/\r?\n/g, ' ');
        return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
    };

    // Encabezado compartido para ambos modos
    const SEP = '-'.repeat(90);
    const encabezado = [
        esReenvio ? '*** REENVÍO DE SOLICITUD ***' : null,
        `SOLICITUD DE COMPRA  #${idSol}`,
        SEP,
        `Fecha        : ${new Date().toLocaleString('es-GT')}`,
        `Máquina      : ${gMaq}`,
        `Sección      : ${gSec}`,
        gTec ? `Técnico      : ${gTec}` : null,
        gSer ? `No. Serie    : ${gSer}` : null,
        gMod ? `Modelo       : ${gMod}` : null,
        gFeS ? `Fecha Sug.   : ${gFeS}` : null,
        SEP,
    ].filter(Boolean).join('\n');

    let cuerpoTexto;

    if (usarTexto) {
        // MODO TEXTO: tabla ASCII completa en el cuerpo
        const colW = [4, 14, 14, 40, 6];
        const header = `${pad('#', colW[0])} ${pad('CÓDIGO', colW[1])} ${pad('NO. PARTE', colW[2])} ${pad('DESCRIPCIÓN', colW[3])} ${pad('CANT', colW[4])}`;
        const divider = colW.map(w => '-'.repeat(w)).join('-');
        const filas = items.map((it, i) => {
            const urgStr = it.urgencia === 'Critico' ? ' [CRITICO]' : it.urgencia === 'Urgente' ? ' [URGENTE]' : '';
            let mainRow = `${pad(i + 1, colW[0])} ${pad(it.codigo, colW[1])} ${pad(it.noParte || '-', colW[2])} ${pad(it.descripcion + urgStr, colW[3])} ${pad(it.cant, colW[4])}`;
            if (incluirStats && !it.esNuevo) {
                const stats = getStatsText(it.codigo);
                if (stats) {
                    mainRow += `\n     ↳ [ANALISIS]: ${stats}`;
                }
            }
            return mainRow;
        }).join('\n');

        cuerpoTexto =
            `Buen día,\n\n` +
            `${encabezado}\n${header}\n${divider}\n${filas}\n${SEP}\n\n` +
            `Total ítems: ${items.length}\n\nSaludos,\n${gTec || 'Depto. Eléctrico'}`;
    } else {
        // MODO HTML: encabezado + indicación de pegar tabla formateada
        cuerpoTexto =
            `Buen día,\n\n` +
            `${encabezado}\n\n` +
            `>>> PEGAR TABLA AQUÍ — presiona CTRL+V en el cuerpo del correo <<<\n\n` +
            `Total ítems: ${items.length}\n\nSaludos,\n${gTec || 'Depto. Eléctrico'}`;
    }

    const cuerpoBase = encodeURIComponent(cuerpoTexto);
    const mailtoUrl = `mailto:${destinatario}?cc=${copia}&subject=${asunto}&body=${cuerpoBase}`;

    // target="_blank" fuerza que Gmail (si es el handler del OS) abra en pestaña nueva
    const aLink = document.createElement('a');
    aLink.href = mailtoUrl;
    aLink.target = '_blank';
    aLink.rel = 'noopener';
    document.body.appendChild(aLink);
    aLink.click();
    aLink.remove();
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

['filtroGrupo', 'filtroMaquina', 'filtroStock', 'filtroEstado', 'filtroProyeccion',
    'filtroUltimaSalida', 'filtroUltimoIngreso', 'filtroIngresoManual',
    'filtroSalidaDesde', 'filtroSalidaHasta'].forEach(id => {
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

// -----------------------------------------------------
// 5. MOTOR DE IMÁGENES LOCALES Y VISTA CATÁLOGO
// -----------------------------------------------------
let dirImagenesHandle = null;
let IMAGENES_INDEX = {}; // Mapea clave normalizada (código o parte) -> array de { handle, suffix }
let IMAGENES_SIMPLIFIED_INDEX = {}; // Mapea clave simplificada -> array de { handle, suffix }
const URLS_CACHE = new Map(); // Mapea FileSystemFileHandle -> URL del ObjectURL creado

// Simplifica una cadena eliminando espacios, guiones y caracteres no alfanuméricos
function simplifyKey(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Abre selector de directorio nativo
async function seleccionarCarpetaImagenes() {
    try {
        const handle = await window.showDirectoryPicker();
        if (handle) {
            await inicializarCarpetaImagenes(handle);
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("Error al seleccionar carpeta:", e);
            alert("No se pudo cargar la carpeta. Asegúrese de que su navegador soporte el acceso a archivos locales (Chrome, Edge u Opera).");
        }
    }
}

// Guarda manejador en IndexedDB
async function guardarDirHandle(handle) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_ANALISIS, 'readwrite');
        tx.objectStore(STORE_ANALISIS).put(handle, 'directoryHandle');
        return new Promise(r => tx.oncomplete = r);
    } catch (e) {
        console.warn("IndexedDB no permite guardar FileSystemHandle en este navegador:", e);
    }
}

// Carga manejador de IndexedDB
async function cargarDirHandle() {
    try {
        const db = await initDB();
        return new Promise(r => {
            const req = db.transaction(STORE_ANALISIS, 'readonly').objectStore(STORE_ANALISIS).get('directoryHandle');
            req.onsuccess = () => r(req.result);
            req.onerror = () => r(null);
        });
    } catch (e) {
        console.error("Error al cargar manejador de IndexedDB:", e);
        return null;
    }
}

// Intenta cargar carpeta guardada y verificar si tiene permisos
async function intentarCargarCarpetaGuardada() {
    try {
        const handle = await cargarDirHandle();
        if (handle) {
            dirImagenesHandle = handle;
            const options = { mode: 'read' };
            if ((await handle.queryPermission(options)) === 'granted') {
                await inicializarCarpetaImagenes(handle);
            } else {
                mostrarBotonPermisoReconexion();
            }
        }
    } catch (e) {
        console.error("Error al restaurar carpeta guardada:", e);
    }
}

// Solicita permiso explícito de lectura del handle
async function pedirPermisoReconexion() {
    if (!dirImagenesHandle) return;
    try {
        const permission = await dirImagenesHandle.requestPermission({ mode: 'read' });
        if (permission === 'granted') {
            await inicializarCarpetaImagenes(dirImagenesHandle);
            ocultarBotonPermisoReconexion();
        } else {
            alert("Acceso denegado. Las imágenes no se cargarán.");
        }
    } catch (e) {
        console.error("Error al solicitar permiso:", e);
    }
}

function mostrarBotonPermisoReconexion() {
    const btnRec = document.getElementById('btnReconectarCarpeta');
    const btnSel = document.getElementById('btnSeleccionarCarpeta');
    if (btnRec) btnRec.classList.remove('hidden');
    if (btnSel) {
        btnSel.innerText = "📷 Re-conectar Carpeta";
        btnSel.classList.replace('bg-green-600', 'bg-blue-600');
    }
}

function ocultarBotonPermisoReconexion() {
    const btnRec = document.getElementById('btnReconectarCarpeta');
    if (btnRec) btnRec.classList.add('hidden');
}

// Inicializa el escaneo de la carpeta
async function inicializarCarpetaImagenes(handle) {
    dirImagenesHandle = handle;
    const btnSel = document.getElementById('btnSeleccionarCarpeta');
    if (btnSel) {
        btnSel.innerText = "⏳ Escaneando...";
        btnSel.className = 'bg-yellow-500 text-white font-bold py-1 px-4 rounded text-sm shadow-sm flex items-center gap-1';
    }

    try {
        await escanearCarpetaImagenes(handle);
        console.log("Escaneo finalizado. Imágenes cargadas:", Object.keys(IMAGENES_INDEX).length);

        if (btnSel) {
            btnSel.innerText = "📷 Carpeta Conectada";
            btnSel.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded text-sm transition shadow-sm flex items-center gap-1';
        }
        ocultarBotonPermisoReconexion();
        await guardarDirHandle(handle);

        // Si la pestaña actual activa es catálogo, refrescarla
        if (document.getElementById('vistaCatalogo') && !document.getElementById('vistaCatalogo').classList.contains('hidden')) {
            renderCatalogo(TODOS_LOS_DATOS);
        }
    } catch (e) {
        console.error("Error al inicializar carpeta de imágenes:", e);
        if (btnSel) {
            btnSel.innerText = "📷 Error de Carpeta";
            btnSel.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded text-sm transition shadow-sm flex items-center gap-1';
        }
        mostrarBotonPermisoReconexion();
    }
}

// Escanea recursivamente el directorio seleccionado (soporta múltiples estructuras e imágenes adicionales _2, _3...)
async function escanearCarpetaImagenes(dirHandle) {
    IMAGENES_INDEX = {};
    IMAGENES_SIMPLIFIED_INDEX = {};
    const queue = [{ handle: dirHandle, path: '' }];

    while (queue.length > 0) {
        const { handle, path } = queue.shift();
        try {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    queue.push({ handle: entry, path: path + entry.name + '/' });
                } else if (entry.kind === 'file') {
                    const name = entry.name.toLowerCase();
                    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) {
                        const baseName = entry.name.substring(0, entry.name.lastIndexOf('.'));

                        // Detecta sufijos de paginación de imágenes como _2, _3, _4
                        const matchSuffix = baseName.match(/(.+)_(\d+)$/);
                        let baseKey = baseName;
                        let suffixNum = 1;
                        if (matchSuffix) {
                            baseKey = matchSuffix[1];
                            suffixNum = parseInt(matchSuffix[2], 10);
                        }

                        const exactKey = baseKey.trim().toLowerCase();
                        const simpKey = simplifyKey(baseKey);

                        // Agrega al índice exacto
                        if (!IMAGENES_INDEX[exactKey]) IMAGENES_INDEX[exactKey] = [];
                        IMAGENES_INDEX[exactKey].push({ handle: entry, suffix: suffixNum });

                        // Agrega al índice simplificado
                        if (!IMAGENES_SIMPLIFIED_INDEX[simpKey]) IMAGENES_SIMPLIFIED_INDEX[simpKey] = [];
                        IMAGENES_SIMPLIFIED_INDEX[simpKey].push({ handle: entry, suffix: suffixNum });

                        // Generar y guardar thumbnail de fondo en IndexedDB (no bloqueante)
                        encolarGeneracionThumbnail(entry, exactKey, simpKey);
                    }
                }
            }
        } catch (e) {
            console.warn(`Error al leer ruta: ${path}`, e);
        }
    }

    // Ordenar los listados de imágenes por su sufijo
    for (const key in IMAGENES_INDEX) {
        IMAGENES_INDEX[key].sort((a, b) => a.suffix - b.suffix);
    }
    for (const key in IMAGENES_SIMPLIFIED_INDEX) {
        IMAGENES_SIMPLIFIED_INDEX[key].sort((a, b) => a.suffix - b.suffix);
    }
}

// Crea y almacena ObjectURLs cacheándolos por archivo
async function obtenerUrlDeHandle(fileHandle) {
    if (URLS_CACHE.has(fileHandle)) {
        return URLS_CACHE.get(fileHandle);
    }
    try {
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);
        URLS_CACHE.set(fileHandle, url);
        return url;
    } catch (e) {
        console.error("Error al obtener archivo del disco local:", e);
        return null;
    }
}

// Busca las imágenes por código o por número de parte (con coincidencia exacta y simplificada flexible)
async function obtenerImagenesRepuesto(codigo, noParte, fullQuality = false) {
    // 1. Intentar cargar primero el thumbnail rápido desde IndexedDB si no se requiere calidad completa
    if (!fullQuality) {
        const thumb = await cargarThumbnailDesdeDb(codigo, noParte);
        if (thumb) {
            return [thumb];
        }
    }
    
    // 2. Si se requiere calidad completa, o si no hay thumbnail guardado
    if (!dirImagenesHandle) {
        // Fallback final al thumbnail si la carpeta no está conectada
        const thumb = await cargarThumbnailDesdeDb(codigo, noParte);
        return thumb ? [thumb] : [];
    }

    const keyCodigo = codigo ? codigo.trim().toLowerCase() : '';
    const keyNoParte = noParte ? noParte.trim().toLowerCase() : '';
    const simpCodigo = simplifyKey(codigo);
    const simpNoParte = simplifyKey(noParte);

    let entries = [];

    // 1. Intentar coincidencia exacta con el código de repuesto (0-000-00-000)
    if (keyCodigo && IMAGENES_INDEX[keyCodigo]) {
        entries = IMAGENES_INDEX[keyCodigo];
    }
    // 2. Intentar coincidencia exacta con el número de parte
    else if (keyNoParte && keyNoParte !== '-' && IMAGENES_INDEX[keyNoParte]) {
        entries = IMAGENES_INDEX[keyNoParte];
    }
    // 3. Intentar coincidencia simplificada flexible con el código
    else if (simpCodigo && IMAGENES_SIMPLIFIED_INDEX[simpCodigo]) {
        entries = IMAGENES_SIMPLIFIED_INDEX[simpCodigo];
    }
    // 4. Intentar coincidencia simplificada flexible con el número de parte
    else if (simpNoParte && simpNoParte !== '-' && IMAGENES_SIMPLIFIED_INDEX[simpNoParte]) {
        entries = IMAGENES_SIMPLIFIED_INDEX[simpNoParte];
    }

    const urls = [];
    for (const entry of entries) {
        const url = await obtenerUrlDeHandle(entry.handle);
        if (url) urls.push(url);
    }
    
    // Si no se encontraron imágenes de alta pero hay un thumbnail guardado, usarlo
    if (urls.length === 0) {
        const thumb = await cargarThumbnailDesdeDb(codigo, noParte);
        if (thumb) urls.push(thumb);
    }
    
    return urls;
}

// Carrusel de modal de detalle
let imagenesDetalleActuales = [];
let indiceImagenDetalle = 0;

function mostrarImagenDetalle() {
    const img = document.getElementById('detImagen');
    const prevBtn = document.getElementById('detPrevBtn');
    const nextBtn = document.getElementById('detNextBtn');
    const indexLbl = document.getElementById('detImagenIndice');
    const container = document.getElementById('detImagenContainer');

    if (!img || !container) return;

    if (imagenesDetalleActuales.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    img.src = imagenesDetalleActuales[indiceImagenDetalle];

    if (imagenesDetalleActuales.length > 1) {
        if (prevBtn) prevBtn.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (indexLbl) {
            indexLbl.innerText = `${indiceImagenDetalle + 1} / ${imagenesDetalleActuales.length}`;
            indexLbl.classList.remove('hidden');
        }
    } else {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        if (indexLbl) indexLbl.classList.add('hidden');
    }
}

function cambiarImagenDetalle(dir) {
    if (imagenesDetalleActuales.length === 0) return;
    indiceImagenDetalle += dir;
    if (indiceImagenDetalle < 0) {
        indiceImagenDetalle = imagenesDetalleActuales.length - 1;
    } else if (indiceImagenDetalle >= imagenesDetalleActuales.length) {
        indiceImagenDetalle = 0;
    }
    mostrarImagenDetalle();
}

// Previsualización y carrusel en el modal de nuevo repuesto solicitado
let imagenesNuevoActuales = [];
let indiceImagenNuevo = 0;

async function actualizarImagenNuevoRepuesto() {
    const noParteInput = document.getElementById('nrNoParte');
    if (!noParteInput) return;

    const noParte = noParteInput.value.trim();
    const container = document.getElementById('nrImagenContainer');
    const img = document.getElementById('nrImagen');
    const prevBtn = document.getElementById('nrPrevBtn');
    const nextBtn = document.getElementById('nrNextBtn');
    const indexLbl = document.getElementById('nrImagenIndice');

    if (!container || !img) return;

    if (!noParte || noParte === '-') {
        container.classList.add('hidden');
        imagenesNuevoActuales = [];
        return;
    }

    imagenesNuevoActuales = await obtenerImagenesRepuesto('', noParte);
    indiceImagenNuevo = 0;

    if (imagenesNuevoActuales.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    img.src = imagenesNuevoActuales[indiceImagenNuevo];

    if (imagenesNuevoActuales.length > 1) {
        if (prevBtn) prevBtn.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (indexLbl) {
            indexLbl.innerText = `${indiceImagenNuevo + 1} / ${imagenesNuevoActuales.length}`;
            indexLbl.classList.remove('hidden');
        }
    } else {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        if (indexLbl) indexLbl.classList.add('hidden');
    }
}

function cambiarImagenNuevo(dir) {
    if (imagenesNuevoActuales.length === 0) return;
    indiceImagenNuevo += dir;
    if (indiceImagenNuevo < 0) {
        indiceImagenNuevo = imagenesNuevoActuales.length - 1;
    } else if (indiceImagenNuevo >= imagenesNuevoActuales.length) {
        indiceImagenNuevo = 0;
    }
    const img = document.getElementById('nrImagen');
    const indexLbl = document.getElementById('nrImagenIndice');
    if (img) img.src = imagenesNuevoActuales[indiceImagenNuevo];
    if (indexLbl) indexLbl.innerText = `${indiceImagenNuevo + 1} / ${imagenesNuevoActuales.length}`;
}

// Pantalla completa
function abrirImagenPantallaCompleta(src) {
    const m = document.getElementById('modalImagenCompleta');
    const img = document.getElementById('imgPantallaCompleta');
    if (m && img) {
        img.src = src;
        m.classList.remove('hidden');
    }
}

function cerrarImagenPantallaCompleta() {
    const m = document.getElementById('modalImagenCompleta');
    if (m) m.classList.add('hidden');
}

// Lógica de Paginación, Carga y Búsqueda de Catálogo
let _datosCatalogoCurrent = [];
let _punteroCatalogo = 0;
const _paginaCatalogo = 16;

function buscarCatalogo() {
    const term = document.getElementById('busqCatalogo').value.toLowerCase().trim();
    if (!term) {
        const btnVer = document.getElementById('btnVerTodoCatalogo');
        if (btnVer) btnVer.classList.add('hidden');
        renderCatalogo(TODOS_LOS_DATOS);
        return;
    }
    guardarHistorialBusqueda(term);
    const terms = term.split(/\s+/);
    const filtrados = TODOS_LOS_DATOS.filter(fila => {
        const text = `${fila.inv.codigo} ${fila.inv.descripcion} ${fila.inv.noParte || ''} ${fila.inv.nombreUtil || ''} ${fila.inv.ubicacion || ''}`.toLowerCase();
        return terms.every(t => text.includes(t));
    });
    renderCatalogo(filtrados);
    const btnVer = document.getElementById('btnVerTodoCatalogo');
    if (btnVer) btnVer.classList.remove('hidden');
}

function limpiarBusquedaCatalogo() {
    const inp = document.getElementById('busqCatalogo');
    if (inp) inp.value = '';
    const btnVer = document.getElementById('btnVerTodoCatalogo');
    if (btnVer) btnVer.classList.add('hidden');
    renderCatalogo(TODOS_LOS_DATOS);
}

async function renderCatalogo(datos) {
    _datosCatalogoCurrent = typeof filtrarColeccionGlobal === 'function' ? filtrarColeccionGlobal(datos || TODOS_LOS_DATOS) : (datos || []);
    _punteroCatalogo = 0;
    const grid = document.getElementById('gridCatalogo');
    if (!grid) return;

    if (!_datosCatalogoCurrent.length) {
        grid.innerHTML = "<div class='col-span-full text-center py-12 text-gray-400 font-bold'>Sin resultados. Intente con otra búsqueda.</div>";
        const cont = document.getElementById('controlesCatalogo');
        if (cont) cont.classList.add('hidden');
        return;
    }

    const bloque = _datosCatalogoCurrent.slice(0, _paginaCatalogo);
    grid.innerHTML = "<div class='col-span-full text-center py-6 text-blue-600 font-medium animate-pulse'>Cargando catálogo con imágenes...</div>";

    const fragment = document.createDocumentFragment();
    await agregarBloqueCatalogo(fragment, bloque);
    grid.innerHTML = '';
    grid.appendChild(fragment);

    _punteroCatalogo = bloque.length;

    const total = _datosCatalogoCurrent.length;
    const vis = document.getElementById('countCatalogoVisibles');
    const tot = document.getElementById('countCatalogoTotal');
    const ctrl = document.getElementById('controlesCatalogo');

    if (vis) vis.innerText = _punteroCatalogo;
    if (tot) tot.innerText = total;
    if (ctrl) ctrl.classList.toggle('hidden', _punteroCatalogo >= total);
}

async function cargarMasCatalogo() {
    const grid = document.getElementById('gridCatalogo');
    if (!grid) return;

    const bloque = _datosCatalogoCurrent.slice(_punteroCatalogo, _punteroCatalogo + _paginaCatalogo);

    const fragment = document.createDocumentFragment();
    await agregarBloqueCatalogo(fragment, bloque);
    grid.appendChild(fragment);

    _punteroCatalogo += bloque.length;

    const total = _datosCatalogoCurrent.length;
    const vis = document.getElementById('countCatalogoVisibles');
    const ctrl = document.getElementById('controlesCatalogo');

    if (vis) vis.innerText = _punteroCatalogo;
    if (ctrl) ctrl.classList.toggle('hidden', _punteroCatalogo >= total);
}

async function agregarBloqueCatalogo(parentElement, bloque) {
    for (const fila of bloque) {
        const { inv } = fila;
        const codigo = inv.codigo;
        const noParte = inv.noParte || '-';
        const desc = inv.descripcion || '';
        const nombreUtil = inv.nombreUtil || '';
        const ubicacion = inv.ubicacion || '';
        const cantidad = inv.cantidad || 0;

        const imgs = await obtenerImagenesRepuesto(codigo, noParte);
        const hasImgs = imgs.length > 0;
        const imgSrc = hasImgs ? imgs[0] : '';

        const card = document.createElement('div');
        card.className = "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden group";
        card.setAttribute('data-repuesto-codigo', codigo);

        let stockBadgeClass = "bg-green-100 text-green-800 border-green-200";
        if (cantidad === 0) stockBadgeClass = "bg-red-100 text-red-800 border-red-200";
        else if (cantidad === 1) stockBadgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";

        let imgHtml = '';
        if (hasImgs) {
            imgHtml = `
                <div class="relative w-full h-40 bg-gray-50 flex items-center justify-center border-b overflow-hidden cursor-pointer" onclick="abrirImagenPantallaCompleta('${imgSrc}')">
                    <img src="${imgSrc}" class="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    ${imgs.length > 1 ? `<span class="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">${imgs.length} fotos</span>` : ''}
                </div>`;
        } else {
            imgHtml = `
                <div class="w-full h-40 bg-gray-100 flex flex-col items-center justify-center border-b text-gray-400">
                    <span class="text-3xl">📷</span>
                    <span class="text-[10px] uppercase font-bold mt-1 tracking-wider">Sin Imagen</span>
                </div>`;
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start gap-1 mb-1">
                        <span class="font-mono text-xs font-bold text-blue-700 truncate" title="${codigo}">${codigo}</span>
                        <span class="text-[10px] text-gray-500 font-semibold truncate max-w-[100px]" title="No. Parte: ${noParte}">PN: ${noParte}</span>
                    </div>
                    
                    <h4 class="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-2 h-8" title="${desc}">${desc}</h4>
                    
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${nombreUtil ? `<span class="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 truncate max-w-full" title="${nombreUtil}">🏷️ ${nombreUtil}</span>` : ''}
                        ${ubicacion ? `<span class="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-full" title="${ubicacion}">📍 ${ubicacion}</span>` : ''}
                    </div>
                </div>
                
                <div class="mt-auto">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs text-gray-500 font-medium">Stock:</span>
                        <span class="text-xs font-bold px-2 py-0.5 rounded-full border ${stockBadgeClass}">${cantidad}</span>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="simpleAddToCart('${codigo}', 1); animarBotonCarrito(this);"
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded text-xs transition shadow-sm flex items-center justify-center gap-1 active:scale-95">
                            🛒 +1
                        </button>
                        <button onclick="abrirModalDetalleSencillo('${codigo}')"
                            class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-3 py-1.5 rounded text-xs transition active:scale-95 flex items-center justify-center gap-1"
                            title="Ver ficha técnica y personalizar solicitud">
                            🔎 Ficha / Pedir
                        </button>
                    </div>
                </div>
            </div>
        `;

        parentElement.appendChild(card);
    }
}

function animarBotonCarrito(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ Añadido";
    btn.classList.replace('bg-green-600', 'bg-emerald-500');
    btn.classList.replace('hover:bg-green-700', 'hover:bg-emerald-600');
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('bg-emerald-500', 'bg-green-600');
        btn.classList.replace('hover:bg-emerald-600', 'hover:bg-green-700');
    }, 1200);
}

// -----------------------------------------------------
// 6. GESTIÓN DEL ÁRBOL DE REPUESTOS EN MÁQUINA
// -----------------------------------------------------
let arbolMaquinas = null; // Objeto del árbol raíz
let nodoSeleccionadoActual = null; // Nodo del árbol seleccionado actualmente
let modoEdicionActivo = false; // Bloqueo de edición accidental (Mode Consulta vs Edición)
let idsVisibles = new Set();
let idsOpacos = new Set();

let filtrosSistemasActivos = {
    potencia: true,
    control: true,
    neumatico: true,
    hidraulico: true,
    seguridad: true,
    otros: true
};

function cargarFiltrosSistemas() {
    const guardados = localStorage.getItem('filtrosSistemasActivos');
    if (guardados) {
        try {
            filtrosSistemasActivos = JSON.parse(guardados);
        } catch (e) {
            console.error("Error al cargar filtros de sistemas:", e);
        }
    }
}

function guardarFiltrosSistemas() {
    localStorage.setItem('filtrosSistemasActivos', JSON.stringify(filtrosSistemasActivos));
}

function obtenerCategoriaSistema(nodo) {
    if (!nodo || nodo.type !== "sistema") return null;
    const label = (nodo.label || "").toLowerCase();
    const id = (nodo.id || "").toLowerCase();
    
    if (label.includes("potencia") || label.includes("motor") || id.includes("potencia")) {
        return "potencia";
    }
    if (label.includes("control") || label.includes("electric") || id.includes("control")) {
        return "control";
    }
    if (label.includes("neumat") || id.includes("neumat")) {
        return "neumatico";
    }
    if (label.includes("hidrau") || id.includes("hidrau")) {
        return "hidraulico";
    }
    if (label.includes("segur") || id.includes("segur")) {
        return "seguridad";
    }
    return "otros";
}

function debeMostrarNodoSistema(nodo) {
    if (!nodo) return true;
    if (nodo.type === "sistema") {
        const cat = obtenerCategoriaSistema(nodo);
        if (cat && filtrosSistemasActivos[cat] === false) {
            return false;
        }
    }
    return true;
}

function toggleFiltroSistema(key) {
    filtrosSistemasActivos[key] = !filtrosSistemasActivos[key];
    guardarFiltrosSistemas();
    actualizarEstilosFiltrosSistemas();
    dibujarArbol();
}

function seleccionarTodosSistemas(val) {
    for (const key in filtrosSistemasActivos) {
        filtrosSistemasActivos[key] = val;
    }
    guardarFiltrosSistemas();
    actualizarEstilosFiltrosSistemas();
    dibujarArbol();
}

function actualizarEstilosFiltrosSistemas() {
    const config = {
        potencia: { active: 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' },
        control: { active: 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' },
        neumatico: { active: 'bg-sky-600 border-sky-700 text-white hover:bg-sky-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' },
        hidraulico: { active: 'bg-cyan-600 border-cyan-700 text-white hover:bg-cyan-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' },
        seguridad: { active: 'bg-red-600 border-red-700 text-white hover:bg-red-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' },
        otros: { active: 'bg-slate-600 border-slate-700 text-white hover:bg-slate-700', inactive: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300' }
    };
    
    for (const key in config) {
        const btn = document.getElementById(`btnSysFilter_${key}`);
        if (btn) {
            const isActive = filtrosSistemasActivos[key] !== false;
            const styles = config[key];
            
            const allActive = styles.active.split(' ');
            const allInactive = styles.inactive.split(' ');
            
            allActive.forEach(c => btn.classList.remove(c));
            allInactive.forEach(c => btn.classList.remove(c));
            
            const targetClasses = isActive ? allActive : allInactive;
            targetClasses.forEach(c => btn.classList.add(c));
        }
    }
}


// Árbol pre-poblado por defecto con la jerarquía industrial solicitada
const ARBOL_DEFAULT = {
    id: "root_1",
    label: "EMPRESA S.A.",
    type: "root",
    expanded: true,
    children: [
        {
            id: "linea_lc01",
            label: "LC - Línea de Corrugación 01",
            type: "linea",
            expanded: true,
            children: [
                {
                    id: "maq_c01",
                    label: "Corrugadora 01",
                    type: "maquina",
                    children: ["Twin", "Smart", "Link", "Stand", "Crest", "Terminal"].map(eq => ({
                        id: `eq_c01_${eq.toLowerCase()}`,
                        label: eq,
                        type: "equipo",
                        children: obtenerSistemasDefault(`c01_${eq.toLowerCase()}`)
                    }))
                },
                {
                    id: "maq_c02",
                    label: "Corrugadora 02",
                    type: "maquina",
                    children: ["Twin", "Smart", "Link", "Stand", "Crest", "Terminal"].map(eq => ({
                        id: `eq_c02_${eq.toLowerCase()}`,
                        label: eq,
                        type: "equipo",
                        children: obtenerSistemasDefault(`c02_${eq.toLowerCase()}`)
                    }))
                }
            ]
        },
        {
            id: "linea_li01",
            label: "LI - Línea de Imprenta 01",
            type: "linea",
            expanded: true,
            children: [
                {
                    id: "maq_i01",
                    label: "Imprenta 01",
                    type: "maquina",
                    children: ["Prefeeder", "Feed", "Flexo 01", "Flexo 02", "Slotter", "Die Cutter", "Folder Counter Ejector", "Stacker", "Conveyor", "Flejadora EAM MOSCA", "Braker", "Repartidor", "Load Former"].map(eq => ({
                        id: `eq_i01_${eq.toLowerCase().replace(/\s+/g, '')}`,
                        label: eq,
                        type: "equipo",
                        children: obtenerSistemasDefault(`i01_${eq.toLowerCase().replace(/\s+/g, '')}`)
                    }))
                },
                {
                    id: "maq_i02",
                    label: "Imprenta 02",
                    type: "maquina",
                    children: ["Prefeeder", "Feed", "Flexo 01", "Flexo 02", "Slotter", "Die Cutter", "Folder Counter Ejector", "Stacker", "Conveyor", "Flejadora EAM MOSCA", "Braker", "Repartidor", "Load Former"].map(eq => ({
                        id: `eq_i02_${eq.toLowerCase().replace(/\s+/g, '')}`,
                        label: eq,
                        type: "equipo",
                        children: obtenerSistemasDefault(`i02_${eq.toLowerCase().replace(/\s+/g, '')}`)
                    }))
                }
            ]
        }
    ]
};

function obtenerSistemasDefault(prefix) {
    return [
        {
            id: `sis_${prefix}_potencia`,
            label: "Sistema de Potencia",
            type: "sistema",
            children: [
                { id: `ap_${prefix}_pot_1`, label: "Motor Principal", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_pot_2`, label: "Motor de los Brazos", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_pot_3`, label: "Motor de Anilox", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_pot_4`, label: "Motor de abrir y cerrar sección", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_pot_5`, label: "Motor del Blower de vacío", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_pot_6`, label: "Motor de bandas", type: "aplicacion", linkedCodes: [] }
            ]
        },
        {
            id: `sis_${prefix}_control`,
            label: "Sistema de Control",
            type: "sistema",
            children: [
                { id: `ap_${prefix}_ctrl_1`, label: "Botonería", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_ctrl_2`, label: "Sensores (inductivos, encoder, etc.)", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_ctrl_3`, label: "PLC", type: "aplicacion", linkedCodes: [] }
            ]
        },
        {
            id: `sis_${prefix}_seguridad`,
            label: "Sistema de Seguridad",
            type: "sistema",
            children: [
                { id: `ap_${prefix}_seg_1`, label: "Botones de Emergencia", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_seg_2`, label: "Pasadores de Emergencia", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_seg_3`, label: "Tarjetas Safe", type: "aplicacion", linkedCodes: [] }
            ]
        },
        {
            id: `sis_${prefix}_neumatico`,
            label: "Sistema Neumático",
            type: "sistema",
            children: [
                { id: `ap_${prefix}_neu_1`, label: "Válvulas", type: "aplicacion", linkedCodes: [] }
            ]
        },
        {
            id: `sis_${prefix}_hidraulico`,
            label: "Sistema Hidráulico",
            type: "sistema",
            children: [
                { id: `ap_${prefix}_hid_1`, label: "Electrovalvulas", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_hid_2`, label: "Control de Presión", type: "aplicacion", linkedCodes: [] },
                { id: `ap_${prefix}_hid_3`, label: "Control de Temperatura", type: "aplicacion", linkedCodes: [] }
            ]
        }
    ];
}

// Guarda el árbol de máquinas en IndexedDB
async function guardarArbolMaquinas(arbol) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_ANALISIS, 'readwrite');
        tx.objectStore(STORE_ANALISIS).put(arbol, 'arbolMaquinas');
        return new Promise(r => tx.oncomplete = r);
    } catch (e) {
        console.error("Error al guardar el árbol de máquinas:", e);
    }
}

// Carga el árbol de máquinas de IndexedDB
async function cargarArbolMaquinas() {
    try {
        const db = await initDB();
        return new Promise(r => {
            const req = db.transaction(STORE_ANALISIS, 'readonly').objectStore(STORE_ANALISIS).get('arbolMaquinas');
            req.onsuccess = () => r(req.result);
            req.onerror = () => r(null);
        });
    } catch (e) {
        console.error("Error al cargar el árbol de máquinas:", e);
        return null;
    }
}

// Inicializa la vista y dibuja el árbol
async function inicializarVistaArbolMaquinas() {
    if (!arbolMaquinas) {
        let arbol = await cargarArbolMaquinas();
        if (!arbol) {
            arbol = ARBOL_DEFAULT;
            await guardarArbolMaquinas(arbol);
        }
        arbolMaquinas = arbol;
    }
    cargarFiltrosSistemas();
    actualizarEstilosFiltrosSistemas();
    dibujarArbol();
    actualizarPanelEditorNodo();
    if (typeof actualizarBloqueHuerfanos === 'function') actualizarBloqueHuerfanos();
}

// Calcula recursivamente el estado de desabastecimiento (falta) y sin vincular para un nodo y sus hijos
function calcularEstadoNodo(nodo) {
    if (typeof TODOS_LOS_DATOS === 'undefined' || !TODOS_LOS_DATOS) {
        return { falta: 0, sinVincular: 0 };
    }
    if (!debeMostrarNodoSistema(nodo)) {
        return { falta: 0, sinVincular: 0 };
    }
    const hasChildren = nodo.children && nodo.children.length > 0;
    if (!hasChildren) {
        // Nodo hoja: Determinar si tiene códigos vinculados válidos
        const isLinked = nodo.linkedCodes && nodo.linkedCodes.filter(c => c.trim().length > 0).length > 0;
        if (!isLinked) {
            return { falta: 0, sinVincular: 1 };
        } else {
            const cantReq = typeof nodo.cantReq === 'number' ? nodo.cantReq : 1;
            let stockTotal = 0;
            nodo.linkedCodes.forEach(code => {
                const exact = code.toUpperCase().trim();
                const simp = simplifyKey(code);
                const match = TODOS_LOS_DATOS.find(f => {
                    const fExact = f.inv.codigo.toUpperCase().trim();
                    const fSimp = simplifyKey(f.inv.codigo);
                    return fExact === exact || fSimp === simp;
                });
                if (match) {
                    stockTotal += match.inv.cantidad || 0;
                }
            });
            const falta = Math.max(0, cantReq - stockTotal);
            return { falta, sinVincular: 0 };
        }
    } else {
        // Nodo padre: Agregar recursivamente los valores de los hijos
        let falta = 0;
        let sinVincular = 0;
        nodo.children.forEach(child => {
            const res = calcularEstadoNodo(child);
            falta += res.falta;
            sinVincular += res.sinVincular;
        });
        return { falta, sinVincular };
    }
}

// Pre-calcula los conjuntos de nodos visibles y opacos en base a la selección activa
function calcularNodosVisiblesYOpacos() {
    idsVisibles.clear();
    idsOpacos.clear();

    if (!nodoSeleccionadoActual) {
        return;
    }

    // 1. Obtener ancestros del nodo seleccionado (incluyendo al propio nodo)
    const camino = buscarPadresRecursivo(arbolMaquinas, nodoSeleccionadoActual.id) || [];
    const idsPathSelected = new Set(camino.map(n => n.id));
    camino.forEach(n => idsVisibles.add(n.id));

    // 2. Obtener todos los descendientes del nodo seleccionado
    const descendientes = [];
    const obtenerDescendientesIds = (n) => {
        descendientes.push(n.id);
        if (n.children) {
            n.children.forEach(obtenerDescendientesIds);
        }
    };
    obtenerDescendientesIds(nodoSeleccionadoActual);
    descendientes.forEach(id => idsVisibles.add(id));

    // 3. Buscar repuestos coincidentes en otros nodos (cross-reference)
    const setCodes = new Set((nodoSeleccionadoActual.linkedCodes || []).map(c => c ? c.trim().toUpperCase() : '').filter(Boolean));
    if (setCodes.size > 0) {
        const nodosCoincidentes = [];
        const buscarNodosCoincidentesPorCodigos = (n) => {
            if (n.id !== nodoSeleccionadoActual.id && n.linkedCodes) {
                const sharesCode = n.linkedCodes.some(c => c && setCodes.has(c.trim().toUpperCase()));
                if (sharesCode) {
                    nodosCoincidentes.push(n);
                }
            }
            if (n.children) {
                n.children.forEach(buscarNodosCoincidentesPorCodigos);
            }
        };
        buscarNodosCoincidentesPorCodigos(arbolMaquinas);

        // Cada nodo coincidente y sus ancestros son visibles y opacos (salvo si son primarios)
        nodosCoincidentes.forEach(m => {
            idsVisibles.add(m.id);
            if (!idsPathSelected.has(m.id) && !descendientes.includes(m.id)) {
                idsOpacos.add(m.id);
            }

            const pathCoinc = buscarPadresRecursivo(arbolMaquinas, m.id) || [];
            pathCoinc.forEach(p => {
                idsVisibles.add(p.id);
                if (!idsPathSelected.has(p.id) && !descendientes.includes(p.id)) {
                    idsOpacos.add(p.id);
                }
            });
        });
    }
}

// Dibuja el árbol jerárquico recursivo
function dibujarArbol() {
    const container = document.getElementById('treeContainer');
    if (!container) return;

    if (!arbolMaquinas) {
        container.innerHTML = "<div class='text-gray-400 py-6 text-center'>Error al cargar la estructura del árbol.</div>";
        return;
    }

    if (typeof dibujarBreadcrumbs === 'function') dibujarBreadcrumbs();

    // Calcular visibilidad en base al nodo seleccionado
    calcularNodosVisiblesYOpacos();

    let rootNodeToDraw = arbolMaquinas;
    if (typeof nodoEnfoqueId !== 'undefined' && nodoEnfoqueId) {
        const focused = buscarNodoPorId(arbolMaquinas, nodoEnfoqueId);
        if (focused) {
            rootNodeToDraw = focused;
        } else {
            nodoEnfoqueId = null;
        }
    }

    container.innerHTML = dibujarNodoRecursivo(rootNodeToDraw, 0);
}

// Genera HTML recursivo para el árbol con paleta de colores y cross-reference
function dibujarNodoRecursivo(nodo, nivel) {
    // Si el nodo es un sistema filtrado, no mostrarlo ni a él ni a sus hijos
    if (!debeMostrarNodoSistema(nodo)) {
        return "";
    }

    // Si hay una selección activa y el nodo no es relevante para el foco, ocultarlo completamente
    if (nodoSeleccionadoActual && idsVisibles.size > 0 && !idsVisibles.has(nodo.id)) {
        return "";
    }

    const paddingLeft = nivel * 16;
    const hasChildren = nodo.children && nodo.children.length > 0;
    const expanded = nodo.expanded !== false;
    const isSelected = nodoSeleccionadoActual && nodoSeleccionadoActual.id === nodo.id;

    let icon = "⚙️";
    if (nodo.type === "root") icon = "🏭";
    else if (nodo.type === "linea") icon = "⚡";
    else if (nodo.type === "maquina") icon = "📦";
    else if (nodo.type === "equipo") icon = "🛠️";
    else if (nodo.type === "sistema") icon = "🔧";
    else if (nodo.type === "aplicacion") icon = "🏷️";
    else if (nodo.type === "repuesto") icon = "🧩";

    let arrowHtml = "";
    if (hasChildren) {
        arrowHtml = `<span onclick="event.stopPropagation(); toggleNodoExpansión('${nodo.id}')" class="cursor-pointer text-gray-500 hover:text-blue-700 transition px-1 inline-block text-[10px] w-4 text-center transform duration-150 ${expanded ? 'rotate-90' : ''}">▶</span>`;
    } else {
        arrowHtml = `<span class="w-4 inline-block"></span>`;
    }

    let linkedCountBadge = "";
    const resEstado = calcularEstadoNodo(nodo);
    
    if (!hasChildren) {
        const isLinked = nodo.linkedCodes && nodo.linkedCodes.filter(c => c.trim().length > 0).length > 0;
        if (!isLinked) {
            linkedCountBadge = `<span class="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 ml-1.5 shadow-sm shrink-0">⚠️ Sin vincular</span>`;
        } else if (resEstado.falta > 0) {
            linkedCountBadge = `<span class="bg-red-50 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 ml-1.5 shadow-sm animate-pulse shrink-0">🔴 Falta: ${resEstado.falta}</span>`;
        } else {
            linkedCountBadge = `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 ml-1.5 shadow-sm shrink-0">✅ OK</span>`;
        }
    } else {
        let badgesHtml = [];
        if (resEstado.falta > 0) {
            badgesHtml.push(`<span class="bg-red-50 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 shadow-sm shrink-0">🔴 Falta: ${resEstado.falta}</span>`);
        }
        if (resEstado.sinVincular > 0) {
            badgesHtml.push(`<span class="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 shadow-sm shrink-0">⚠️ Sin vincular: ${resEstado.sinVincular}</span>`);
        }
        if (resEstado.falta === 0 && resEstado.sinVincular === 0) {
            badgesHtml.push(`<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 shadow-sm shrink-0">✅ OK</span>`);
        }
        linkedCountBadge = `<div class="flex gap-1 ml-1.5">${badgesHtml.join("")}</div>`;
    }

    // Calcular paleta de colores por nivel (Jerarquía visual)
    let colorClass = 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
    if (nivel === 0) {
        colorClass = 'bg-slate-800 border-slate-900 text-white font-extrabold hover:bg-slate-700';
    } else if (nivel === 1) {
        colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold hover:bg-indigo-100';
    } else if (nivel === 2) {
        colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold hover:bg-emerald-100';
    } else if (nivel === 3) {
        colorClass = 'bg-amber-50 border-amber-200 text-amber-900 font-semibold hover:bg-amber-100';
    } else if (nivel === 4) {
        colorClass = 'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100';
    } else if (nivel === 5) {
        colorClass = 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200';
    }

    // Detección de coincidencia cruzada de repuestos (Cross-Reference)
    let coincideRepuesto = false;
    let codigosOverlapped = [];
    if (nodoSeleccionadoActual && nodoSeleccionadoActual.id !== nodo.id && nodoSeleccionadoActual.linkedCodes && nodo.linkedCodes) {
        const setSel = new Set(nodoSeleccionadoActual.linkedCodes.map(c => c ? c.trim().toUpperCase() : '').filter(Boolean));
        nodo.linkedCodes.forEach(c => {
            if (c) {
                const codeClean = c.trim().toUpperCase();
                if (codeClean && setSel.has(codeClean)) {
                    coincideRepuesto = true;
                    codigosOverlapped.push(c.trim());
                }
            }
        });
    }

    if (coincideRepuesto) {
        colorClass = 'bg-purple-100 border-purple-400 font-bold text-purple-950 ring-2 ring-purple-300 shadow-md';
    }

    // Si el nodo es opaco, aplicarle semi-transparencia interactiva (hover restablece opacidad)
    if (nodoSeleccionadoActual && idsOpacos.has(nodo.id)) {
        colorClass += ' opacity-40 hover:opacity-100 transition-opacity duration-200';
    }

    // Sobreescribir si es el nodo seleccionado
    if (isSelected) {
        colorClass = 'bg-blue-100 border-blue-500 font-bold text-blue-900 ring-2 ring-blue-300 shadow-md scale-[1.01]';
    }

    let matchBadge = coincideRepuesto ? `<span class="bg-purple-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded ml-1.5 shadow-sm shrink-0">🔗 También usa: ${codigosOverlapped.join(', ')}</span>` : '';

    let html = `
        <div class="flex flex-col">
            <div onclick="seleccionarNodoArbol('${nodo.id}')" class="flex items-center gap-1.5 py-1.5 pr-2 border rounded-lg cursor-pointer transition duration-150 ${colorClass} text-xs my-0.5" style="margin-left: ${paddingLeft}px;">
                ${arrowHtml}
                <span class="text-sm shrink-0 leading-none select-none">${icon}</span>
                <span class="truncate block max-w-[320px] md:max-w-[550px] lg:max-w-[650px]">${nodo.label}</span>
                ${linkedCountBadge}
                ${matchBadge}
            </div>
    `;

    if (hasChildren && expanded) {
        nodo.children.forEach(child => {
            html += dibujarNodoRecursivo(child, nivel + 1);
        });
    }

    html += `</div>`;
    return html;
}

// Busca un nodo por id recursivamente
function buscarNodoPorId(nodo, id) {
    if (nodo.id === id) return nodo;
    if (nodo.children && nodo.children.length > 0) {
        for (const child of nodo.children) {
            const found = buscarNodoPorId(child, id);
            if (found) return found;
        }
    }
    return null;
}

// Busca el nodo padre por id
function buscarPadreDeNodo(parent, childId) {
    if (!parent.children) return null;
    if (parent.children.some(c => c.id === childId)) return parent;
    for (const child of parent.children) {
        const found = buscarPadreDeNodo(child, childId);
        if (found) return found;
    }
    return null;
}

// Expande o colapsa un nodo
async function toggleNodoExpansión(id) {
    if (!arbolMaquinas) return;
    const nodo = buscarNodoPorId(arbolMaquinas, id);
    if (nodo) {
        nodo.expanded = nodo.expanded === false ? true : false;
        dibujarArbol();
        await guardarArbolMaquinas(arbolMaquinas);
    }
}

// Expande todo el árbol
function expandirTodoArbol() {
    if (!arbolMaquinas) return;
    const expandRec = (nodo) => {
        nodo.expanded = true;
        if (nodo.children) nodo.children.forEach(expandRec);
    };
    expandRec(arbolMaquinas);
    dibujarArbol();
    guardarArbolMaquinas(arbolMaquinas);
}

// Contrae todo el árbol
function contraerTodoArbol() {
    if (!arbolMaquinas) return;
    const collapseRec = (nodo) => {
        if (nodo.id !== "root_1") nodo.expanded = false;
        if (nodo.children) nodo.children.forEach(collapseRec);
    };
    collapseRec(arbolMaquinas);
    dibujarArbol();
    guardarArbolMaquinas(arbolMaquinas);
}

// Selecciona un nodo del árbol
function seleccionarNodoArbol(id) {
    if (!arbolMaquinas) return;
    const nodo = buscarNodoPorId(arbolMaquinas, id);
    if (nodo) {
        modoEdicionActivo = false; // Bloquear en modo consulta por seguridad al cambiar selección
        nodoSeleccionadoActual = nodo;
        dibujarArbol();
        actualizarPanelEditorNodo();
        cargarRepuestosVinculadosNodo();
    }
}

// Actualiza el panel del editor
function actualizarPanelEditorNodo() {
    const label = document.getElementById('nodoSelLabel');
    const campos = document.getElementById('camposEdicionNodo');
    const inpNombre = document.getElementById('inpNombreNodo');
    const campoCodes = document.getElementById('campoCodigosBodega');
    const inpCodes = document.getElementById('inpCodigosNodo');
    const campoSpecs = document.getElementById('campoSpecsBodega');
    const inpSpecs = document.getElementById('inpSpecsNodo');
    const btnDel = document.getElementById('btnEliminarNodo');
    const btnDup = document.getElementById('btnDuplicarNodo');
    const quickVinc = document.getElementById('panelVincularRapido');

    // Elementos del Modo Edición / Consulta
    const badgeModo = document.getElementById('badgeModoEdicion');
    const btnActivar = document.getElementById('btnActivarEdicion');
    const btnCancel = document.getElementById('btnCancelarEdicion');
    const btnSave = document.getElementById('btnGuardarEdicion');

    if (!label) return;
    const btnFocus = document.getElementById('btnEnfocarNodo');

    if (!nodoSeleccionadoActual) {
        label.innerText = "Ninguno";
        if (campos) campos.classList.add('hidden');
        if (btnDel) btnDel.classList.add('hidden');
        if (btnDup) btnDup.classList.add('hidden');
        if (quickVinc) quickVinc.classList.add('hidden');
        if (btnFocus) btnFocus.classList.add('hidden');
        return;
    }

    label.innerText = `${nodoSeleccionadoActual.label} (${nodoSeleccionadoActual.type.toUpperCase()})`;
    if (campos) campos.classList.remove('hidden');
    if (inpNombre) {
        inpNombre.value = nodoSeleccionadoActual.label;
        inpNombre.disabled = !modoEdicionActivo;
    }

    const campoCantReq = document.getElementById('campoCantidadRequerida');
    const inpCantReq = document.getElementById('inpCantidadRequerida');

    if (nodoSeleccionadoActual.type === "aplicacion" || nodoSeleccionadoActual.type === "repuesto" || nodoSeleccionadoActual.type === "sistema") {
        if (campoCodes) campoCodes.classList.remove('hidden');
        if (campoSpecs) campoSpecs.classList.remove('hidden');
        if (campoCantReq) campoCantReq.classList.remove('hidden');
        
        // Panel de vincular rápido solo visible cuando la edición está activa
        if (quickVinc) {
            if (modoEdicionActivo) quickVinc.classList.remove('hidden');
            else quickVinc.classList.add('hidden');
        }
        
        if (inpCodes) {
            inpCodes.value = (nodoSeleccionadoActual.linkedCodes || []).join(', ');
            inpCodes.disabled = !modoEdicionActivo;
        }
        if (inpSpecs) {
            inpSpecs.value = nodoSeleccionadoActual.specs || '';
            inpSpecs.disabled = !modoEdicionActivo;
        }
        if (inpCantReq) {
            inpCantReq.value = typeof nodoSeleccionadoActual.cantReq === 'number' ? nodoSeleccionadoActual.cantReq : 1;
            inpCantReq.disabled = !modoEdicionActivo;
        }
    } else {
        if (campoCodes) campoCodes.classList.add('hidden');
        if (campoSpecs) campoSpecs.classList.add('hidden');
        if (campoCantReq) campoCantReq.classList.add('hidden');
        if (quickVinc) quickVinc.classList.add('hidden');
    }

    // Ocultar botones de borrar o duplicar para el nodo principal (empresa)
    if (nodoSeleccionadoActual.id === "root_1") {
        if (btnDel) btnDel.classList.add('hidden');
        if (btnDup) btnDup.classList.add('hidden');
    } else {
        if (btnDel) btnDel.classList.remove('hidden');
        if (btnDup) btnDup.classList.remove('hidden');
    }

    if (btnFocus) {
        btnFocus.classList.remove('hidden');
        if (typeof nodoEnfoqueId !== 'undefined' && nodoEnfoqueId === nodoSeleccionadoActual.id) {
            btnFocus.innerHTML = '❌ Quitar Enfoque';
            btnFocus.className = 'bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded transition shadow-sm';
        } else {
            btnFocus.innerHTML = '🔎 Enfocar';
            btnFocus.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded transition shadow-sm';
        }
    }

    // Gestionar visualización e inputs en base al Modo Edición
    if (badgeModo) {
        if (modoEdicionActivo) {
            badgeModo.innerText = "🔓 Modo Edición Activo";
            badgeModo.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
            if (btnActivar) btnActivar.classList.add('hidden');
            if (btnCancel) btnCancel.classList.remove('hidden');
            if (btnSave) btnSave.classList.remove('hidden');
        } else {
            badgeModo.innerText = "🔒 Modo Consulta";
            badgeModo.className = "text-[9px] font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200";
            if (btnActivar) btnActivar.classList.remove('hidden');
            if (btnCancel) btnCancel.classList.add('hidden');
            if (btnSave) btnSave.classList.add('hidden');
        }
    }

    // Renderizar botón de vinculación rápida pendiente
    const divBotonVinc = document.getElementById('btnVincularPendienteContainer');
    if (divBotonVinc) {
        divBotonVinc.remove();
    }
    if (CODIGO_PENDIENTE_VINCULAR && (nodoSeleccionadoActual.type === "aplicacion" || nodoSeleccionadoActual.type === "repuesto" || nodoSeleccionadoActual.type === "sistema")) {
        const parentControls = document.querySelector('#camposEdicionNodo .flex.justify-between.items-center.mt-2');
        if (parentControls) {
            const btnContainer = document.createElement('div');
            btnContainer.id = 'btnVincularPendienteContainer';
            btnContainer.className = 'ml-2';
            btnContainer.innerHTML = `
                <button onclick="vincularCodigoPendienteActual()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1 rounded text-[11px] transition shadow-sm animate-bounce">
                    🔌 Vincular ${CODIGO_PENDIENTE_VINCULAR} Aquí
                </button>
            `;
            parentControls.insertBefore(btnContainer, parentControls.firstChild);
        }
    }
}

function cancelarEdicionNodo() {
    modoEdicionActivo = false;
    actualizarPanelEditorNodo();
}

// Guarda cambios en nodo (Nombre / Códigos / Especificaciones)
async function guardarEdicionNodo() {
    if (!arbolMaquinas || !nodoSeleccionadoActual) return;

    const inpNombre = document.getElementById('inpNombreNodo');
    const inpCodes = document.getElementById('inpCodigosNodo');
    const inpSpecs = document.getElementById('inpSpecsNodo');
    const inpCantReq = document.getElementById('inpCantidadRequerida');

    if (!inpNombre || !inpNombre.value.trim()) {
        alert("El nombre del nodo no puede estar vacío.");
        return;
    }

    nodoSeleccionadoActual.label = inpNombre.value.trim();

    if (nodoSeleccionadoActual.type === "aplicacion" || nodoSeleccionadoActual.type === "repuesto" || nodoSeleccionadoActual.type === "sistema") {
        const rawCodes = inpCodes ? inpCodes.value : '';
        const codes = rawCodes.split(',')
            .map(c => c.trim().toUpperCase())
            .filter(c => c.length > 0);
        nodoSeleccionadoActual.linkedCodes = codes;

        if (inpSpecs) {
            nodoSeleccionadoActual.specs = inpSpecs.value.trim();
        }

        if (inpCantReq) {
            const val = parseInt(inpCantReq.value, 10);
            nodoSeleccionadoActual.cantReq = isNaN(val) || val < 1 ? 1 : val;
        }
    }

    modoEdicionActivo = false; // Retornar a modo consulta por seguridad
    dibujarArbol();
    actualizarPanelEditorNodo();
    cargarRepuestosVinculadosNodo();
    await guardarArbolMaquinas(arbolMaquinas);

    alert("✅ Cambios guardados en el nodo correctamente.");
}

// Agrega un subnodo bajo el seleccionado
async function abrirAgregarSubnodoPrompt() {
    if (!arbolMaquinas) return;
    if (!nodoSeleccionadoActual) {
        alert("Por favor, seleccione primero un nodo en el árbol bajo el cual agregar el subnodo.");
        return;
    }

    if (nodoSeleccionadoActual.type === "repuesto") {
        alert("No se pueden agregar subnodos bajo un repuesto individual.");
        return;
    }

    const label = prompt(`Escriba el nombre del nuevo subnodo a agregar bajo "${nodoSeleccionadoActual.label}":`);
    if (!label || !label.trim()) return;

    let childType = "aplicacion";
    if (nodoSeleccionadoActual.type === "root") childType = "linea";
    else if (nodoSeleccionadoActual.type === "linea") childType = "maquina";
    else if (nodoSeleccionadoActual.type === "maquina") childType = "equipo";
    else if (nodoSeleccionadoActual.type === "equipo") childType = "sistema";
    else if (nodoSeleccionadoActual.type === "sistema") childType = "aplicacion";
    else if (nodoSeleccionadoActual.type === "aplicacion") childType = "repuesto";

    const childId = `${childType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newChild = {
        id: childId,
        label: label.trim(),
        type: childType,
        expanded: true,
        children: []
    };

    if (childType === "aplicacion" || childType === "repuesto" || childType === "sistema") {
        newChild.linkedCodes = [];
        newChild.cantReq = 1;
    }

    if (!nodoSeleccionadoActual.children) {
        nodoSeleccionadoActual.children = [];
    }

    nodoSeleccionadoActual.children.push(newChild);
    nodoSeleccionadoActual.expanded = true;

    dibujarArbol();
    seleccionarNodoArbol(childId);
    await guardarArbolMaquinas(arbolMaquinas);
}

// Elimina el nodo seleccionado con PIN de seguridad
async function confirmarEliminarNodo() {
    if (!arbolMaquinas || !nodoSeleccionadoActual) return;
    if (nodoSeleccionadoActual.id === "root_1") return;

    const tieneHijos = nodoSeleccionadoActual.children && nodoSeleccionadoActual.children.length > 0;
    const tieneCodigos = nodoSeleccionadoActual.linkedCodes && nodoSeleccionadoActual.linkedCodes.length > 0;

    const pin = prompt(`Para eliminar el nodo "${nodoSeleccionadoActual.label}"${tieneHijos || tieneCodigos ? ' (que contiene información o subnodos vinculados)' : ''}, ingrese el PIN de seguridad (1234):`);
    if (pin !== '1234') {
        if (pin !== null) alert("PIN incorrecto. Eliminación abortada.");
        return;
    }

    if (!confirm(`¿Está seguro de eliminar el nodo "${nodoSeleccionadoActual.label}"? Esto eliminará permanentemente todos sus subnodos y relaciones.`)) return;

    const parent = buscarPadreDeNodo(arbolMaquinas, nodoSeleccionadoActual.id);
    if (parent) {
        parent.children = parent.children.filter(c => c.id !== nodoSeleccionadoActual.id);
        nodoSeleccionadoActual = null;
        dibujarArbol();
        actualizarPanelEditorNodo();
        cargarRepuestosVinculadosNodo();
        await guardarArbolMaquinas(arbolMaquinas);
        alert("✅ Nodo eliminado correctamente.");
    }
}

// Carga las tarjetas de repuestos relacionados al nodo en el panel derecho
async function cargarRepuestosVinculadosNodo() {
    const list = document.getElementById('repuestosVinculadosList');
    const badge = document.getElementById('badgeCantVinculados');
    if (!list) return;

    if (badge) badge.innerText = "0";

    // Cargar las sugerencias de bodega basadas en especificaciones técnicas
    cargarSugerenciasInteligentesNodo();

    if (!nodoSeleccionadoActual) {
        list.innerHTML = "<div class='text-gray-400 text-center py-12 text-xs'>Seleccione un nodo del árbol para ver los repuestos vinculados</div>";
        return;
    }

    const linkedCodes = nodoSeleccionadoActual.linkedCodes || [];

    if (linkedCodes.length === 0) {
        list.innerHTML = `
            <div class='text-gray-400 text-center py-12 text-xs flex flex-col items-center gap-2'>
                <span>Sin repuestos de Bodega vinculados a este equipo/sistema.</span>
                ${nodoSeleccionadoActual.type === "aplicacion" || nodoSeleccionadoActual.type === "sistema" ? '<span class="text-[10px] text-gray-500 bg-white border border-dashed border-gray-300 p-2 rounded max-w-xs mt-2 leading-relaxed">Puedes escribir sus códigos de bodega separados por comas arriba o buscarlos abajo para vincularlos rápidamente.</span>' : ''}
            </div>`;
        return;
    }

    if (badge) badge.innerText = linkedCodes.length;

    // Filtrar coincidencias del inventario consolidado
    const relacionados = TODOS_LOS_DATOS.filter(f => {
        const exact = f.inv.codigo.toUpperCase().trim();
        const simp = simplifyKey(f.inv.codigo);

        return linkedCodes.some(c => {
            const matchExact = c.toUpperCase().trim();
            const matchSimp = simplifyKey(c);
            return exact === matchExact || simp === matchSimp;
        });
    });

    if (relacionados.length === 0) {
        list.innerHTML = `
            <div class='text-gray-400 text-center py-12 text-xs flex flex-col items-center gap-2'>
                <span>⚠️ Los códigos vinculados (${linkedCodes.join(', ')}) no existen actualmente en la base de datos de Bodega.</span>
                <span class='text-[10px] text-red-500 bg-red-50 px-2 py-1 border border-red-100 rounded mt-2'>Verifique que los códigos coincidan con el formato consolidado.</span>
            </div>`;
        return;
    }

    list.innerHTML = '';

    for (const fila of relacionados) {
        const { inv } = fila;
        const codigo = inv.codigo;
        const noParte = inv.noParte || '-';
        const desc = inv.descripcion || '';
        const cantidad = inv.cantidad || 0;

        const imgs = await obtenerImagenesRepuesto(codigo, noParte);
        const hasImgs = imgs.length > 0;
        const imgSrc = hasImgs ? imgs[0] : '';

        const card = document.createElement('div');
        card.className = "bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200 flex gap-3 align-start relative overflow-hidden group";
        card.setAttribute('data-repuesto-codigo', codigo);

        const cantReq = nodoSeleccionadoActual.cantReq || 1;
        let stockBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        let stockText = `Stock: ${cantidad} / Req: ${cantReq}`;
        
        if (cantidad < cantReq) {
            stockBadgeClass = "bg-red-50 text-red-700 border-red-200 font-extrabold animate-pulse";
            stockText = `Stock: ${cantidad} / Req: ${cantReq} ⚠️`;
        } else if (cantidad === cantReq) {
            stockBadgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
        }

        let imgHtml = '';
        if (hasImgs) {
            imgHtml = `
                <div class="relative w-16 h-16 bg-gray-50 flex items-center justify-center rounded border overflow-hidden shrink-0 cursor-pointer" onclick="abrirImagenPantallaCompleta('${imgSrc}')">
                    <img src="${imgSrc}" class="max-w-full max-h-full object-contain" />
                </div>`;
        } else {
            imgHtml = `
                <div class="w-16 h-16 bg-gray-100 flex flex-col items-center justify-center rounded border shrink-0 text-gray-400">
                    <span class="text-xl">📷</span>
                </div>`;
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start gap-1">
                    <span class="font-mono text-[11px] font-bold text-blue-700 truncate cursor-pointer hover:underline" onclick="irADetalleCodigo('${codigo}')" title="Ver en Vista Detallada">${codigo}</span>
                    <span class="text-[9px] text-gray-500 font-semibold truncate max-w-[80px]" title="PN: ${noParte}">PN: ${noParte}</span>
                </div>
                <h4 class="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight h-6 my-0.5 cursor-pointer hover:text-blue-600 transition" onclick="irADetalleCodigo('${codigo}')" title="Ver en Vista Detallada">${desc}</h4>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-[10px] font-bold px-1.5 py-0.2 rounded border ${stockBadgeClass}">${stockText}</span>
                    <div class="flex gap-1">
                        <button onclick="simpleAddToCart('${codigo}', 1); animarBotonCarrito(this);"
                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-0.5 px-2 rounded text-[10px] transition shadow-sm shrink-0 active:scale-95">
                            🛒 +1
                        </button>
                        <button onclick="desvincularCodigoDeNodo('${codigo}')"
                            class="bg-red-50 hover:bg-red-100 text-red-500 font-bold p-0.5 rounded text-[10px] transition shrink-0 hover:text-red-700" title="Desvincular del nodo">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;

        list.appendChild(card);
    }
}

// Desvincula un código del nodo seleccionado
async function desvincularCodigoDeNodo(codigo) {
    if (!arbolMaquinas || !nodoSeleccionadoActual) return;

    const exact = codigo.toUpperCase().trim();
    const simp = simplifyKey(codigo);

    nodoSeleccionadoActual.linkedCodes = (nodoSeleccionadoActual.linkedCodes || []).filter(c => {
        const matchExact = c.toUpperCase().trim();
        const matchSimp = simplifyKey(c);
        return exact !== matchExact && simp !== matchSimp;
    });

    dibujarArbol();
    actualizarPanelEditorNodo();
    cargarRepuestosVinculadosNodo();
    await guardarArbolMaquinas(arbolMaquinas);
}

// Buscador interactivo rápido para vincular nuevos códigos
function buscarParaVincularRapido() {
    const val = document.getElementById('busqVincularRapido').value.toLowerCase().trim();
    const list = document.getElementById('resultadosVincularRapido');
    if (!list) return;

    if (!val || val.length < 2) {
        list.classList.add('hidden');
        return;
    }

    const filtrados = TODOS_LOS_DATOS.filter(fila => {
        const txt = `${fila.inv.codigo} ${fila.inv.descripcion} ${fila.inv.noParte || ''}`.toLowerCase();
        return txt.includes(val);
    }).slice(0, 10);

    if (filtrados.length === 0) {
        list.innerHTML = "<div class='p-2 text-gray-400 text-center'>Sin coincidencias en Bodega</div>";
        list.classList.remove('hidden');
        return;
    }

    list.innerHTML = filtrados.map(fila => `
        <div onclick="vincularCodigoRapido('${fila.inv.codigo}')" class="p-1.5 hover:bg-orange-50 cursor-pointer flex justify-between items-center text-[10px] select-none border-b last:border-0">
            <div class="leading-tight truncate flex-grow mr-2">
                <span class="font-mono font-bold text-blue-700 block">${fila.inv.codigo}</span>
                <span class="text-gray-500 truncate block max-w-[200px]" title="${fila.inv.descripcion}">${fila.inv.descripcion}</span>
            </div>
            <button class="bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded text-[9px] hover:bg-orange-600 transition shadow-sm shrink-0">🔌 Vincular</button>
        </div>
    `).join('');

    list.classList.remove('hidden');
}

async function vincularCodigoRapido(codigo) {
    if (!arbolMaquinas || !nodoSeleccionadoActual) return;

    if (!nodoSeleccionadoActual.linkedCodes) {
        nodoSeleccionadoActual.linkedCodes = [];
    }

    const exact = codigo.toUpperCase().trim();
    if (!nodoSeleccionadoActual.linkedCodes.includes(exact)) {
        nodoSeleccionadoActual.linkedCodes.push(exact);
    }

    limpiarBusqVincularRapido();
    dibujarArbol();
    actualizarPanelEditorNodo();
    cargarRepuestosVinculadosNodo();
    await guardarArbolMaquinas(arbolMaquinas);
}

function limpiarBusqVincularRapido() {
    const inp = document.getElementById('busqVincularRapido');
    if (inp) inp.value = '';
    const list = document.getElementById('resultadosVincularRapido');
    if (list) {
        list.innerHTML = '';
        list.classList.add('hidden');
    }
}

// Carga sugerencias inteligentes del inventario en base a especificaciones del equipo
async function cargarSugerenciasInteligentesNodo() {
    const seccionSugs = document.getElementById('seccionSugerenciasSpecs');
    const listSugs = document.getElementById('repuestosSugeridosList');
    const badgeSugs = document.getElementById('badgeCantSugerencias');
    if (!seccionSugs || !listSugs) return;

    if (!nodoSeleccionadoActual || (nodoSeleccionadoActual.type !== "aplicacion" && nodoSeleccionadoActual.type !== "sistema")) {
        seccionSugs.classList.add('hidden');
        return;
    }

    seccionSugs.classList.remove('hidden');

    const labelText = nodoSeleccionadoActual.label || '';
    const specsText = nodoSeleccionadoActual.specs || '';

    // Si no hay texto de especificación, indicar al usuario
    if (!specsText.trim()) {
        listSugs.innerHTML = `
            <div class="text-gray-400 text-center py-6 text-[10px] flex flex-col items-center gap-1 bg-gray-50 border border-dashed rounded p-3 leading-normal">
                <span>💡 Agregue especificaciones técnicas (como marca, HP, RPM, rodamientos, etc.) arriba para buscar automáticamente repuestos relacionados en Bodega.</span>
            </div>`;
        if (badgeSugs) badgeSugs.innerText = "0";
        return;
    }

    // Tokenizar la combinación del nombre y especificaciones
    const combText = (labelText + " " + specsText).toLowerCase();
    const tokens = combText.match(/[a-z0-9]+/g) || [];

    // Palabras de ruido genéricas a ignorar
    const ruido = new Set([
        "sistema", "del", "los", "las", "para", "con", "linea", "equipo", "maquina", 
        "potencia", "control", "seguridad", "neumatico", "hidraulico", "principal", 
        "abrir", "cerrar", "seccion", "brazos", "anilox", "blower", "vacio", "bandas", 
        "botoneria", "sensores", "inductivos", "encoder", "plc", "valvulas", 
        "electrovalvulas", "presion", "temperatura", "botones", "emergencia", 
        "pasadores", "tarjetas", "safe", "datos", "placa",
        // Artículos y pronombres comunes (incluye 2 letras)
        "de", "la", "el", "en", "un", "al", "lo", "es", "no", "si", "su", "ya", "se", "me", "te", "mi", "tu", "con", "por", "sus"
    ]);

    const terminos = tokens.filter(t => t.length >= 2 && !ruido.has(t));

    if (terminos.length === 0) {
        listSugs.innerHTML = `<div class="text-gray-400 text-center py-4 text-[10px]">Escriba especificaciones más descriptivas (ej: Weg, 6205, etc.) para iniciar la búsqueda.</div>`;
        if (badgeSugs) badgeSugs.innerText = "0";
        return;
    }

    const linkedCodes = nodoSeleccionadoActual.linkedCodes || [];
    const simplificadosLinked = linkedCodes.map(c => simplifyKey(c));

    // Buscar coincidencias y calcular relevancia
    const sugeridos = TODOS_LOS_DATOS.map(fila => {
        const { inv } = fila;
        const codigo = inv.codigo;
        const noParte = inv.noParte || '';
        const desc = inv.descripcion || '';
        const nombreUtil = inv.nombreUtil || '';

        // Excluir repuestos ya vinculados
        if (linkedCodes.includes(codigo.toUpperCase().trim()) || simplificadosLinked.includes(simplifyKey(codigo))) {
            return null;
        }

        const itemText = (codigo + " " + noParte + " " + desc + " " + nombreUtil).toLowerCase();

        let score = 0;
        terminos.forEach(term => {
            if (itemText.includes(term)) {
                score++;
            }
        });

        return score > 0 ? { fila, score } : null;
    })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || b.fila.inv.cantidad - a.fila.inv.cantidad)
        .slice(0, 5);

    if (sugeridos.length === 0) {
        listSugs.innerHTML = `
            <div class="text-gray-400 text-center py-6 text-[10px] bg-gray-50 border border-dashed rounded p-3 leading-normal">
                No se encontraron repuestos en Bodega que coincidan con "${terminos.join(', ')}".
            </div>`;
        if (badgeSugs) badgeSugs.innerText = "0";
        return;
    }

    if (badgeSugs) badgeSugs.innerText = sugeridos.length;
    listSugs.innerHTML = '';

    for (const { fila } of sugeridos) {
        const { inv } = fila;
        const codigo = inv.codigo;
        const noParte = inv.noParte || '-';
        const desc = inv.descripcion || '';
        const cantidad = inv.cantidad || 0;

        const imgs = await obtenerImagenesRepuesto(codigo, noParte);
        const hasImgs = imgs.length > 0;
        const imgSrc = hasImgs ? imgs[0] : '';

        const card = document.createElement('div');
        card.className = "bg-white border border-blue-100 rounded-lg p-2.5 shadow-sm hover:border-blue-300 transition duration-150 flex gap-2.5 items-start relative";
        card.setAttribute('data-repuesto-codigo', codigo);

        let stockBadgeClass = "bg-green-50 text-green-700 border-green-100";
        if (cantidad === 0) stockBadgeClass = "bg-red-50 text-red-700 border-red-100";
        else if (cantidad === 1) stockBadgeClass = "bg-yellow-50 text-yellow-700 border-yellow-100";

        let imgHtml = '';
        if (hasImgs) {
            imgHtml = `
                <div class="relative w-12 h-12 bg-gray-50 flex items-center justify-center rounded border overflow-hidden shrink-0 cursor-pointer" onclick="abrirImagenPantallaCompleta('${imgSrc}')">
                    <img src="${imgSrc}" class="max-w-full max-h-full object-contain" />
                </div>`;
        } else {
            imgHtml = `
                <div class="w-12 h-12 bg-gray-50 flex flex-col items-center justify-center rounded border shrink-0 text-gray-400 text-xs">
                    📷
                </div>`;
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start gap-1">
                    <span class="font-mono text-[10px] font-bold text-blue-700 truncate cursor-pointer hover:underline" onclick="irADetalleCodigo('${codigo}')" title="Ver en Vista Detallada">${codigo}</span>
                    <span class="text-[8px] text-gray-500 truncate max-w-[70px]" title="PN: ${noParte}">PN: ${noParte}</span>
                </div>
                <h5 class="text-[10px] font-semibold text-gray-700 line-clamp-1 leading-tight my-0.5 cursor-pointer hover:text-blue-600 transition" onclick="irADetalleCodigo('${codigo}')" title="Ver en Vista Detallada">${desc}</h5>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-[8px] font-bold px-1.5 py-0.2 rounded border ${stockBadgeClass}">Stock: ${cantidad}</span>
                    <button onclick="vincularCodigoRapido('${codigo}'); animarBotonVinculacion(this);"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-0.5 px-2 rounded text-[9px] transition shadow-sm shrink-0 active:scale-95 flex items-center gap-1">
                        🔌 Vincular
                    </button>
                </div>
            </div>
        `;
        listSugs.appendChild(card);
    }
}

// Pequeña animación visual para el botón al vincular
function animarBotonVinculacion(btn) {
    if (!btn) return;
    btn.innerHTML = "🔌 Vinculado";
    btn.className = "bg-green-600 text-white font-bold py-0.5 px-2 rounded text-[9px] transition shadow-sm shrink-0 scale-95";
}

// Activa el Modo Edición solicitando el PIN 1234
function activarModoEdicion() {
    if (!nodoSeleccionadoActual) return;
    const pin = prompt(`Ingrese el PIN de seguridad (1234) para activar el Modo Edición y poder modificar "${nodoSeleccionadoActual.label}":`);
    if (pin === '1234') {
        modoEdicionActivo = true;
        actualizarPanelEditorNodo();
    } else {
        if (pin !== null) alert("PIN incorrecto. Modo Edición bloqueado.");
    }
}

// Duplica recursivamente el nodo seleccionado y toda su subestructura
async function duplicarNodoActual() {
    if (!arbolMaquinas || !nodoSeleccionadoActual) return;
    if (nodoSeleccionadoActual.id === "root_1") {
        alert("No se puede duplicar el nodo raíz de la empresa.");
        return;
    }

    const parent = buscarPadreDeNodo(arbolMaquinas, nodoSeleccionadoActual.id);
    if (!parent) {
        alert("Error: No se encontró el nodo padre del elemento a duplicar.");
        return;
    }

    const oldLabel = nodoSeleccionadoActual.label;
    let newLabel = oldLabel;

    // Detectar y auto-incrementar números al final de la etiqueta (ej: Corrugadora 01 -> Corrugadora 02)
    const match = oldLabel.match(/(.*?)\s*(\d+)$/);
    if (match) {
        const base = match[1].trim();
        let num = parseInt(match[2], 10);
        const padLength = match[2].length;
        do {
            num++;
            const paddedNum = String(num).padStart(padLength, '0');
            newLabel = `${base} ${paddedNum}`;
        } while (existeLabelEnHermanos(parent, newLabel));
    } else {
        let count = 2;
        newLabel = `${oldLabel} 02`;
        while (existeLabelEnHermanos(parent, newLabel)) {
            count++;
            newLabel = `${oldLabel} ${String(count).padStart(2, '0')}`;
        }
    }

    if (!confirm(`¿Desea duplicar "${oldLabel}" y todas sus subestructuras con el nombre "${newLabel}"?`)) return;

    // Clonar recursivamente con nuevos IDs únicos
    const clon = clonarNodoConNuevosIds(nodoSeleccionadoActual, newLabel);

    if (!parent.children) parent.children = [];
    parent.children.push(clon);

    dibujarArbol();
    seleccionarNodoArbol(clon.id); // Seleccionar el nodo clonado
    await guardarArbolMaquinas(arbolMaquinas);

    alert(`✅ Estructura duplicada correctamente como "${newLabel}".`);
}

// Verifica si un nombre de etiqueta ya existe entre los nodos hermanos
function existeLabelEnHermanos(parent, label) {
    if (!parent || !parent.children) return false;
    return parent.children.some(c => c.label.toLowerCase().trim() === label.toLowerCase().trim());
}

// Genera nuevos IDs recursivos para clonar subestructuras evitando colisiones
function clonarNodoConNuevosIds(nodo, nuevaLabel) {
    const nuevoId = `${nodo.type}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const clon = {
        id: nuevoId,
        label: nuevaLabel || nodo.label,
        type: nodo.type,
        expanded: nodo.expanded !== false,
        children: []
    };

    if (nodo.linkedCodes) clon.linkedCodes = [...nodo.linkedCodes];
    if (nodo.specs) clon.specs = nodo.specs;
    if (typeof nodo.cantReq === 'number') clon.cantReq = nodo.cantReq;

    if (nodo.children && nodo.children.length > 0) {
        clon.children = nodo.children.map(child => clonarNodoConNuevosIds(child));
    }

    return clon;
}

document.addEventListener('DOMContentLoaded', async () => {
    cargarCarritoLocal();
    
    // Delegación de eventos para clics en filas de repuestos (abre detalle al hacer clic en cualquier parte de la fila)
    document.body.addEventListener('click', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;

        // No abrir modal si el usuario está seleccionando texto (arrastre para copiar)
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) return;

        const tr = e.target.closest('tr[data-repuesto-codigo]');
        if (!tr) return;

        // Ignorar si el clic fue en un elemento interactivo o de edición
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.closest('button') || e.target.closest('a')) {
            return;
        }

        // Ignorar si fue en una celda que tiene su propio manejador onclick ajeno al tr (como ingreso manual o acciones rápidas)
        const closestOnclick = e.target.closest('[onclick]');
        if (closestOnclick && closestOnclick !== tr) {
            return;
        }

        const codigo = tr.getAttribute('data-repuesto-codigo');
        if (codigo) {
            abrirModalDetalleSencillo(codigo);
        }
    });
    if (document.getElementById('gFechaSug')) {
        document.getElementById('gFechaSug').value = new Date().toISOString().slice(0, 10);
    }
    aplicarEstadoBodeguero();

    if (localStorage.getItem('headerCollapsed') === 'true') {
        const bar = document.getElementById('topHeaderBar');
        const btn = document.getElementById('btnToggleHeader');
        if (bar && btn) {
            bar.classList.add('max-h-0', 'overflow-hidden', 'opacity-0', 'pointer-events-none', 'mb-0');
            bar.classList.remove('mb-6');
            btn.innerHTML = '⋯';
            btn.title = "Mostrar menú superior";
        }
    }

    // Inicializar el tooltip interactivo de repuestos
    inicializarTooltipRepuestos();

    // Intentar restaurar acceso a la carpeta de imágenes persistida en segundo plano (no bloqueante)
    intentarCargarCarpetaGuardada();

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

// -----------------------------------------------------
// 7. SINCRONIZACIÓN DE BÚSQUEDAS E INTERACCIONES DE TOOLTIP
// -----------------------------------------------------
let CODIGO_PENDIENTE_VINCULAR = null;

function verificarSincronizacionBusqueda(vistaDestino) {
    const qSencilla = document.getElementById('busqSencilla')?.value.trim() || '';
    const qDetallada = document.getElementById('busquedaTexto')?.value.trim() || '';
    const qCatalogo = document.getElementById('busqCatalogo')?.value.trim() || '';

    const divSenc = document.getElementById('syncSearchSencilla');
    const divDet = document.getElementById('syncSearchDetallada');
    const divCat = document.getElementById('syncSearchCatalogo');

    if (divSenc) { divSenc.classList.add('hidden'); divSenc.innerHTML = ''; }
    if (divDet) { divDet.classList.add('hidden'); divDet.innerHTML = ''; }
    if (divCat) { divCat.classList.add('hidden'); divCat.innerHTML = ''; }

    if (vistaDestino === 'sencilla') {
        const queryActiva = qDetallada || qCatalogo;
        const origen = qDetallada ? 'Vista Detallada' : 'Vista Catálogo';
        if (queryActiva && queryActiva !== qSencilla) {
            if (divSenc) {
                divSenc.innerHTML = `💡 ¿Traer búsqueda de <b>${origen}</b>: <span class="font-semibold underline">"${queryActiva}"</span>?`;
                divSenc.onclick = () => {
                    document.getElementById('busqSencilla').value = queryActiva;
                    buscarSencilla();
                    divSenc.classList.add('hidden');
                };
                divSenc.classList.remove('hidden');
            }
        }
    } else if (vistaDestino === 'detallada') {
        const queryActiva = qSencilla || qCatalogo;
        const origen = qSencilla ? 'Vista Sencilla' : 'Vista Catálogo';
        if (queryActiva && queryActiva !== qDetallada) {
            if (divDet) {
                divDet.innerHTML = `💡 ¿Traer búsqueda de <b>${origen}</b>: <span class="font-semibold underline">"${queryActiva}"</span>?`;
                divDet.onclick = () => {
                    document.getElementById('busquedaTexto').value = queryActiva;
                    ejecutarBusqueda();
                    divDet.classList.add('hidden');
                };
                divDet.classList.remove('hidden');
            }
        }
    } else if (vistaDestino === 'catalogo') {
        const queryActiva = qSencilla || qDetallada;
        const origen = qSencilla ? 'Vista Sencilla' : 'Vista Detallada';
        if (queryActiva && queryActiva !== qCatalogo) {
            if (divCat) {
                divCat.innerHTML = `💡 ¿Traer búsqueda de <b>${origen}</b>: <span class="font-semibold underline">"${queryActiva}"</span>?`;
                divCat.onclick = () => {
                    document.getElementById('busqCatalogo').value = queryActiva;
                    buscarCatalogo();
                    divCat.classList.add('hidden');
                };
                divCat.classList.remove('hidden');
            }
        }
    }
}

// Inicia el flujo de vinculación asistida en 3 clics
function iniciarVinculacionDeCodigo(codigo) {
    if (!codigo) return;
    CODIGO_PENDIENTE_VINCULAR = codigo;
    
    // Configurar banner de vinculación pendiente en el árbol
    const banner = document.getElementById('bannerVinculacionPendiente');
    const label = document.getElementById('codigoVincularLabel');
    if (banner && label) {
        label.innerText = codigo;
        banner.classList.remove('hidden');
    }
    
    // Ocultar el tooltip para no molestar la vista
    const tooltip = document.getElementById('repuestoTooltip');
    if (tooltip) tooltip.classList.add('hidden');
    
    // Cambiar a la vista del árbol
    setVista('repuestosMaquina');
    
    // Forzar redibujo para incluir el botón Directo
    if (nodoSeleccionadoActual) {
        actualizarPanelEditorNodo();
    }
}

function cancelarVinculacionPendiente() {
    CODIGO_PENDIENTE_VINCULAR = null;
    const banner = document.getElementById('bannerVinculacionPendiente');
    if (banner) banner.classList.add('hidden');
    if (nodoSeleccionadoActual) {
        actualizarPanelEditorNodo();
    }
}

// Vincula el código pendiente directamente al nodo actual seleccionado
async function vincularCodigoPendienteActual() {
    if (!CODIGO_PENDIENTE_VINCULAR || !nodoSeleccionadoActual) return;
    
    const codigo = CODIGO_PENDIENTE_VINCULAR;
    await vincularCodigoRapido(codigo);
    
    cancelarVinculacionPendiente();
    alert(`✅ El repuesto ${codigo} ha sido vinculado con éxito a "${nodoSeleccionadoActual.label}".`);
}

// Busca coincidencias de un código en el árbol y retorna una estructura podada (solo rutas de coincidencia)
function buscarCoincidenciasYPrunar(nodo, codigo) {
    if (!nodo) return null;
    if (!debeMostrarNodoSistema(nodo)) {
        return null;
    }
    const targetSimp = simplifyKey(codigo);
    const isLinked = nodo.linkedCodes && nodo.linkedCodes.some(c => simplifyKey(c) === targetSimp);
    let childrenCoinciden = [];
    
    if (nodo.children && nodo.children.length > 0) {
        nodo.children.forEach(child => {
            const prunedChild = buscarCoincidenciasYPrunar(child, codigo);
            if (prunedChild) {
                childrenCoinciden.push(prunedChild);
            }
        });
    }
    
    if (isLinked || childrenCoinciden.length > 0) {
        return {
            id: nodo.id,
            label: nodo.label,
            type: nodo.type,
            isMatch: isLinked,
            children: childrenCoinciden
        };
    }
    return null;
}

// Dibuja en HTML recursivo un nodo podado para el tooltip
function dibujarPrunedNodoHtml(nodo, nivel = 0) {
    if (!nodo) return "";
    if (!debeMostrarNodoSistema(nodo)) {
        return "";
    }
    const paddingLeft = nivel * 12;
    const hasChildren = nodo.children && nodo.children.length > 0;
    
    let icon = "⚙️";
    if (nodo.type === "root") icon = "🏭";
    else if (nodo.type === "linea") icon = "⚡";
    else if (nodo.type === "maquina") icon = "📦";
    else if (nodo.type === "equipo") icon = "🛠️";
    else if (nodo.type === "sistema") icon = "🔧";
    else if (nodo.type === "aplicacion") icon = "🏷️";
    else if (nodo.type === "repuesto") icon = "🧩";
    
    const isMatchStyle = nodo.isMatch 
        ? "bg-blue-50 text-blue-800 border-blue-200 font-bold px-1 rounded shadow-sm border" 
        : "text-gray-600";
        
    let html = `
        <div class="my-0.5" style="text-align: left;">
            <span 
                onclick="irANodoEnArbol('${nodo.id}')" 
                class="hover:bg-blue-100 p-0.5 rounded cursor-pointer transition inline-flex items-center gap-1 max-w-full text-[10px] ${isMatchStyle}" 
                style="margin-left: ${paddingLeft}px;" 
                title="Haga clic para ir a este nodo en el árbol de máquinas"
            >
                <span>${icon}</span>
                <span class="truncate max-w-[180px]">${nodo.label}</span>
                ${nodo.isMatch ? ' <span class="text-[8px] bg-blue-100 text-blue-700 font-extrabold px-1 rounded border border-blue-200">VINCULADO</span>' : ''}
            </span>
        </div>
    `;
    
    if (hasChildren) {
        nodo.children.forEach(child => {
            html += dibujarPrunedNodoHtml(child, nivel + 1);
        });
    }
    return html;
}

// Navega a un nodo en el árbol desde el tooltip o modal de detalles
function irANodoEnArbol(id) {
    if (!arbolMaquinas) return;
    
    // 1. Ocultar tooltip y cerrar modal de detalle
    const tooltip = document.getElementById('repuestoTooltip');
    if (tooltip) tooltip.classList.add('hidden');
    if (typeof cerrarModalDetalle === 'function') cerrarModalDetalle();
    
    // 2. Cambiar vista a la pestaña del árbol
    setVista('repuestosMaquina');
    
    // 3. Expandir recursivamente todos los ancestros del nodo para hacerlo visible
    expandirAncestrosDeNodo(arbolMaquinas, id);
    
    // 4. Seleccionar el nodo en el árbol
    seleccionarNodoArbol(id);
    
    // 5. Scroll suave y animación de parpadeo (pulse)
    setTimeout(() => {
        const el = document.querySelector(`.bg-blue-100.border-blue-300`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('animate-pulse');
            setTimeout(() => el.classList.remove('animate-pulse'), 2000);
        }
    }, 300);
}

// Expande recursivamente todos los ancestros de un nodo
function expandirAncestrosDeNodo(parent, targetId) {
    if (parent.id === targetId) return true;
    if (parent.children && parent.children.length > 0) {
        for (const child of parent.children) {
            const found = expandirAncestrosDeNodo(child, targetId);
            if (found) {
                parent.expanded = true;
                return true;
            }
        }
    }
    return false;
}

// Motor de control para el hover del tooltip interactivo
let tooltipHideTimeout = null;

function inicializarTooltipRepuestos() {
    const tooltip = document.getElementById('repuestoTooltip');
    if (!tooltip) return;
    
    tooltip.addEventListener('mouseenter', () => {
        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
            tooltipHideTimeout = null;
        }
    });
    
    tooltip.addEventListener('mouseleave', () => {
        ocultarTooltipConRetraso();
    });
    
    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        const row = target.closest('[data-repuesto-codigo]');
        
        if (row) {
            const codigo = row.getAttribute('data-repuesto-codigo');
            if (codigo) {
                if (tooltipHideTimeout) {
                    clearTimeout(tooltipHideTimeout);
                    tooltipHideTimeout = null;
                }
                mostrarTooltipRepuesto(codigo, row, e);
            }
        } else {
            if (!target.closest('#repuestoTooltip')) {
                ocultarTooltipConRetraso();
            }
        }
    });
}

function ocultarTooltipConRetraso() {
    if (tooltipHideTimeout) return;
    tooltipHideTimeout = setTimeout(() => {
        const tooltip = document.getElementById('repuestoTooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
        tooltipHideTimeout = null;
    }, 300);
}

async function mostrarTooltipRepuesto(codigo, targetElement, mouseEvent) {
    const tooltip = document.getElementById('repuestoTooltip');
    if (!tooltip) return;
    
    let prunedTreeHtml = "";
    if (arbolMaquinas) {
        const pruned = buscarCoincidenciasYPrunar(arbolMaquinas, codigo);
        if (pruned) {
            prunedTreeHtml = dibujarPrunedNodoHtml(pruned, 0);
        }
    }
    
    tooltip.innerHTML = `
        <div class="font-sans" style="text-align: left;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; gap: 8px;">
                <span style="font-weight:bold; color:#1e3a8a; font-size:11px;">Uso en Máquinas</span>
                <span style="font-family:monospace; font-weight:bold; font-size:10px; color:#475569; background:#f1f5f9; padding:2px 6px; border:1px solid #cbd5e1; border-radius:4px;">${codigo}</span>
            </div>
            
            <div class="custom-scrollbar" style="max-height: 180px; overflow-y:auto; margin-bottom: 8px; padding-right: 4px;">
                ${prunedTreeHtml || `<p style="color:#94a3b8; text-align:center; padding:12px 0; font-size:10px; margin:0;">Sin vinculación en el árbol de máquinas.</p>`}
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; display:flex;">
                <button 
                    onclick="iniciarVinculacionDeCodigo('${codigo}')" 
                    style="width: 100%; border: none; outline:none; background:#f97316; color:#ffffff; font-weight:bold; border-radius:6px; font-size:9px; padding:5px; cursor:pointer; text-align:center; display:flex; items-center; justify-content:center; gap:4px; transition: background 0.2s;"
                    onmouseover="this.style.background='#ea580c'"
                    onmouseout="this.style.background='#f97316'"
                >
                    🔌 ${prunedTreeHtml ? 'Vincular a otra Máquina' : 'Vincular a una Máquina'}
                </button>
            </div>
        </div>
    `;
    
    tooltip.classList.remove('hidden');
    
    const tooltipWidth = tooltip.offsetWidth || 280;
    const tooltipHeight = tooltip.offsetHeight || 150;
    
    let x = mouseEvent.pageX + 15;
    let y = mouseEvent.pageY + 10;
    
    const maxX = window.scrollX + window.innerWidth - tooltipWidth - 20;
    const maxY = window.scrollY + window.innerHeight - tooltipHeight - 20;
    
    if (x > maxX) x = mouseEvent.pageX - tooltipWidth - 15;
    if (y > maxY) y = mouseEvent.pageY - tooltipHeight - 15;
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

// Genera un reporte PDF recursivo de la jerarquía completa del árbol de máquinas y repuestos
function generarPdfArbolMaquinas() {
    if (!arbolMaquinas) return alert("No hay datos del árbol para imprimir.");

    let nodoARenderizar = arbolMaquinas;
    let tituloReporte = "Estructura de Planta y Equipos";
    let subtituloReporte = "REPORTE COMPLETO DE MÁQUINAS Y REPUESTOS VINCULADOS";

    // Si hay una selección activa o un enfoque activo, ofrecer imprimir sólo esa parte
    const nodoFoco = nodoSeleccionadoActual || (typeof nodoEnfoqueId !== 'undefined' && nodoEnfoqueId ? buscarNodoPorId(arbolMaquinas, nodoEnfoqueId) : null);
    if (nodoFoco && nodoFoco.id !== "root_1") {
        const soloFoco = confirm(`¿Desea imprimir SOLO la selección/enfoque actual ("${nodoFoco.label}")?\n\n• [Aceptar] = Imprimir SOLO el subárbol de "${nodoFoco.label}".\n• [Cancelar] = Imprimir todo el árbol completo de la planta.`);
        if (soloFoco) {
            nodoARenderizar = nodoFoco;
            tituloReporte = `Estructura: ${nodoFoco.label}`;
            subtituloReporte = `REPORTE ENFOCADO DE EQUIPOS Y REPUESTOS - TIPO: ${nodoFoco.type.toUpperCase()}`;
        }
    }

    let printDiv = document.createElement('div');
    printDiv.id = 'cartPrintArea';
    
    let treeHtml = "";
    
    function renderNodoImpresion(nodo, nivel = 0) {
        if (!debeMostrarNodoSistema(nodo)) {
            return "";
        }
        const paddingLeft = nivel * 20;
        
        let icon = "⚙️";
        if (nodo.type === "root") icon = "🏭";
        else if (nodo.type === "linea") icon = "⚡";
        else if (nodo.type === "maquina") icon = "📦";
        else if (nodo.type === "equipo") icon = "🛠️";
        else if (nodo.type === "sistema") icon = "🔧";
        else if (nodo.type === "aplicacion") icon = "🏷️";
        else if (nodo.type === "repuesto") icon = "🧩";
        
        const linkedCodes = nodo.linkedCodes || [];
        const resEstado = calcularEstadoNodo(nodo);
        
        let diagnosticoText = "";
        if (nodo.type === "aplicacion" || nodo.type === "repuesto" || nodo.type === "sistema") {
            if (linkedCodes.length === 0) {
                diagnosticoText = `<span style="color:#b45309; background:#fffbeb; padding:2px 6px; border:1px solid #fef3c7; border-radius:4px; font-size:8px; font-weight:bold;">⚠️ Sin vincular</span>`;
            } else if (resEstado.falta > 0) {
                diagnosticoText = `<span style="color:#b91c1c; background:#fef2f2; padding:2px 6px; border:1px solid #fee2e2; border-radius:4px; font-size:8px; font-weight:extrabold;">🔴 Falta: ${resEstado.falta}</span>`;
            } else {
                diagnosticoText = `<span style="color:#047857; background:#ecfdf5; padding:2px 6px; border:1px solid #d1fae5; border-radius:4px; font-size:8px; font-weight:bold;">✅ OK</span>`;
            }
        } else {
            let badges = [];
            if (resEstado.falta > 0) badges.push(`<span style="color:#b91c1c; font-weight:bold; font-size:8px;">🔴 Falta: ${resEstado.falta}</span>`);
            if (resEstado.sinVincular > 0) badges.push(`<span style="color:#b45309; font-size:8px;">⚠️ Sin vincular: ${resEstado.sinVincular}</span>`);
            if (resEstado.falta === 0 && resEstado.sinVincular === 0) badges.push(`<span style="color:#047857; font-weight:bold; font-size:8px;">✅ OK</span>`);
            diagnosticoText = badges.join("  ");
        }
        
        let html = `
            <div style="margin-left: ${paddingLeft}px; margin-top: 6px; margin-bottom: 6px; border-left: 1px dotted #cbd5e1; padding-left: 10px;">
                <div style="font-size: 11px; display:flex; align-items:center; gap:6px;">
                    <span style="font-size:12px;">${icon}</span>
                    <span style="font-weight: ${nivel <= 2 ? 'bold' : 'normal'}; color: ${nivel === 0 ? '#1e3a8a' : nivel === 1 ? '#0369a1' : '#334155'}; font-size: 11px;"><b>${nodo.label}</b></span>
                    <span style="margin-left: 8px; display:inline-flex; align-items:center;">${diagnosticoText}</span>
                </div>
        `;
        
        if (linkedCodes.length > 0) {
            const relacionados = TODOS_LOS_DATOS.filter(f => {
                const exact = f.inv.codigo.toUpperCase().trim();
                const simp = simplifyKey(f.inv.codigo);
                return linkedCodes.some(c => exact === c.toUpperCase().trim() || simp === simplifyKey(c));
            });
            
            if (relacionados.length > 0) {
                html += `
                <table style="width: 100%; max-width: 650px; border-collapse: collapse; font-size: 9px; margin-top: 4px; margin-bottom: 8px; margin-left: 18px; border: 1px solid #cbd5e1; background: #fafafa;">
                    <thead>
                        <tr style="background-color: #f1f5f9; text-align: left;">
                            <th style="border: 1px solid #cbd5e1; padding: 3px 6px; font-weight:bold;">Código</th>
                            <th style="border: 1px solid #cbd5e1; padding: 3px 6px; font-weight:bold;">PN</th>
                            <th style="border: 1px solid #cbd5e1; padding: 3px 6px; font-weight:bold;">Nombre Útil / Descripción</th>
                            <th style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align:center; font-weight:bold;">Ubicación</th>
                            <th style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align:center; font-weight:bold;">Stock / Req</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${relacionados.map(f => {
                            const cantReq = nodo.cantReq || 1;
                            const stock = f.inv.cantidad || 0;
                            const stockColor = stock < cantReq ? '#ef4444' : stock === cantReq ? '#d97706' : '#10b981';
                            return `
                            <tr>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px; font-family: monospace; font-weight:bold; color:#1e3a8a;">${f.inv.codigo}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px; color:#475569;">${f.inv.noParte || '-'}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px;"><b>${f.inv.nombreUtil || ''}</b> ${f.inv.nombreUtil ? `<span style="font-size:8px;color:#64748b;">(${f.inv.descripcion})</span>` : f.inv.descripcion}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align:center; color:#475569;">${f.inv.ubicacion || '-'}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align:center; font-weight:bold; color:${stockColor};">
                                    ${stock} / ${cantReq} ${stock < cantReq ? '⚠️ Faltante' : '✓ OK'}
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
            }
        }
        
        if (nodo.children && nodo.children.length > 0) {
            nodo.children.forEach(child => {
                html += renderNodoImpresion(child, nivel + 1);
            });
        }
        
        html += `</div>`;
        return html;
    }
    
    treeHtml = renderNodoImpresion(nodoARenderizar, 0);

    printDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #000; padding: 10px;">
            <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h1 style="color: #1e3a8a; font-size: 18px; margin:0; text-transform:uppercase;">${tituloReporte}</h1>
                    <h2 style="font-size: 11px; margin: 4px 0 0 0; color:#555;">${subtituloReporte}</h2>
                </div>
                <div style="font-size:9px; text-align:right; color:#777;">
                    <b>Fecha Reporte:</b> ${new Date().toLocaleString('es-GT')}<br>
                    <b>Documento de Referencia Técnica</b>
                </div>
            </div>
            
            <div style="margin-top: 10px;">
                ${treeHtml}
            </div>
        </div>
    `;

    document.body.appendChild(printDiv);
    document.body.classList.add('printing-cart');
    window.print();
    document.body.classList.remove('printing-cart');
    document.body.removeChild(printDiv);
}

// -----------------------------------------------------
// 8. COLA DE PROCESAMIENTO Y CACHE DE IMÁGENES (THUMBNAILS)
// -----------------------------------------------------
let queueThumbnails = [];
let processThumbnailsRunning = false;

// Encola un archivo para generar y guardar su thumbnail en segundo plano
function encolarGeneracionThumbnail(fileHandle, exactKey, simpKey) {
    queueThumbnails.push({ fileHandle, exactKey, simpKey });
    procesarColaThumbnails();
}

// Procesa la cola de thumbnails uno por uno con pausas para mantener reactiva la UI
async function procesarColaThumbnails() {
    if (processThumbnailsRunning || queueThumbnails.length === 0) return;
    processThumbnailsRunning = true;
    
    while (queueThumbnails.length > 0) {
        const task = queueThumbnails.shift();
        try {
            await generarYGuardarThumbnail(task.fileHandle, task.exactKey, task.simpKey);
        } catch (e) {
            console.error("Error al procesar thumbnail en cola:", e);
        }
        // Pequeña pausa entre compresiones para mantener el hilo de UI 100% libre y fluido
        await new Promise(r => setTimeout(r, 40));
    }
    
    processThumbnailsRunning = false;
}

// Genera un thumbnail de baja calidad (base64) y lo guarda en IndexedDB
async function generarYGuardarThumbnail(fileHandle, exactKey, simpKey) {
    try {
        const db = await initDB();
        
        // Verificar si ya existe en IndexedDB
        const cacheVal = await new Promise(r => {
            const req = db.transaction(STORE_THUMBNAILS, 'readonly').objectStore(STORE_THUMBNAILS).get(exactKey);
            req.onsuccess = () => r(req.result);
            req.onerror = () => r(null);
        });
        
        if (cacheVal) {
            // Ya está guardado, no hacer doble trabajo
            return;
        }
        
        const file = await fileHandle.getFile();
        
        // Comprimir la imagen usando canvas
        const dataUrl = await comprimirImagenAThumbnail(file);
        
        if (dataUrl) {
            const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
            tx.objectStore(STORE_THUMBNAILS).put(dataUrl, exactKey);
            await new Promise(r => tx.oncomplete = r);
        }
    } catch (e) {
        console.warn("No se pudo pre-guardar el thumbnail para:", exactKey, e);
    }
}

// Comprime una imagen a max 120px de ancho/alto y calidad JPEG baja (0.4)
function comprimirImagenAThumbnail(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = reject;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const maxDim = 120;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round(height * (maxDim / width));
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round(width * (maxDim / height));
                        height = maxDim;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Formato JPEG liviano y calidad 0.4 para ocupar muy pocos KB
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.4);
                resolve(thumbnailDataUrl);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

// Busca un thumbnail cached en IndexedDB por código o parte
async function cargarThumbnailDesdeDb(codigo, noParte) {
    try {
        const db = await initDB();
        const key1 = codigo ? codigo.trim().toLowerCase() : '';
        const key2 = noParte ? noParte.trim().toLowerCase() : '';
        
        let thumbData = null;
        
        if (key1) {
            thumbData = await new Promise(r => {
                const req = db.transaction(STORE_THUMBNAILS, 'readonly').objectStore(STORE_THUMBNAILS).get(key1);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
        }
        
        if (!thumbData && key2 && key2 !== '-') {
            thumbData = await new Promise(r => {
                const req = db.transaction(STORE_THUMBNAILS, 'readonly').objectStore(STORE_THUMBNAILS).get(key2);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
        }
        
        return thumbData;
    } catch (e) {
        console.error("Error al cargar thumbnail desde IndexedDB:", e);
        return null;
    }
}

// =========================================================================
// 8. NUEVAS FUNCIONALIDADES AVANZADAS (ENFOQUE, HUERFANOS, IGNORADOS, FUSION)
// =========================================================================

// Variables globales para filtros nuevos
let nodoEnfoqueId = null;
let filtroHuerfanosActivo = false;

// 1. Menú Superior Colapsable
function toggleTopHeader() {
    const bar = document.getElementById('topHeaderBar');
    const btn = document.getElementById('btnToggleHeader');
    if (!bar || !btn) return;
    
    const isCollapsed = bar.classList.contains('max-h-0');
    
    if (isCollapsed) {
        bar.classList.remove('max-h-0', 'overflow-hidden', 'opacity-0', 'pointer-events-none', 'mb-0');
        bar.classList.add('mb-6');
        btn.innerHTML = '┇';
        btn.title = "Ocultar menú superior";
        localStorage.setItem('headerCollapsed', 'false');
    } else {
        bar.classList.add('max-h-0', 'overflow-hidden', 'opacity-0', 'pointer-events-none', 'mb-0');
        bar.classList.remove('mb-6');
        btn.innerHTML = '⋯';
        btn.title = "Mostrar menú superior";
        localStorage.setItem('headerCollapsed', 'true');
    }
}

// 2. Lógica de Ignorar/Ocultar Repuestos por Departamento
function obtenerIgnorados() {
    try {
        return JSON.parse(localStorage.getItem('ignoredCodes') || '[]');
    } catch(e) {
        return [];
    }
}

function esItemIgnorado(codigo) {
    if (!codigo) return false;
    return obtenerIgnorados().includes(codigo.trim().toLowerCase());
}

function toggleItemIgnorado(codigo) {
    if (!codigo) return;
    const cleanCode = codigo.trim().toLowerCase();
    let list = obtenerIgnorados();
    if (list.includes(cleanCode)) {
        list = list.filter(c => c !== cleanCode);
    } else {
        list.push(cleanCode);
    }
    localStorage.setItem('ignoredCodes', JSON.stringify(list));
    
    // Sincronizar y recargar la vista activa
    sincronizarIgnoradosCheckbox(mostrarIgnorados());
    if (typeof actualizarBloqueHuerfanos === 'function') actualizarBloqueHuerfanos();
}

function toggleItemIgnoradoActual() {
    if (itemActualSeleccionado) {
        toggleItemIgnorado(itemActualSeleccionado.inv.codigo);
        actualizarBotonIgnoradoModal(itemActualSeleccionado.inv.codigo);
    }
}

function actualizarBotonIgnoradoModal(codigo) {
    const btn = document.getElementById('btnToggleIgnorado');
    if (!btn) return;
    const ignorado = esItemIgnorado(codigo);
    if (ignorado) {
        btn.innerHTML = '👁️ Mostrar Item';
        btn.className = 'w-full sm:w-1/3 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 px-4 rounded border border-red-300 transition flex items-center justify-center gap-1.5 text-xs shadow-sm no-print';
    } else {
        btn.innerHTML = '🚫 Ocultar Item';
        btn.className = 'w-full sm:w-1/3 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-700 font-bold py-3 px-4 rounded border border-gray-300 hover:border-red-300 transition flex items-center justify-center gap-1.5 text-xs shadow-sm no-print';
    }
}

function mostrarIgnorados() {
    const chkS = document.getElementById('chkMostrarIgnoradosSencilla');
    const chkC = document.getElementById('chkMostrarIgnoradosCatalogo');
    const chkD = document.getElementById('chkMostrarIgnoradosDetallada');
    return (chkS && chkS.checked) || (chkC && chkC.checked) || (chkD && chkD.checked);
}

function sincronizarIgnoradosCheckbox(checked) {
    ['chkMostrarIgnoradosSencilla', 'chkMostrarIgnoradosCatalogo', 'chkMostrarIgnoradosDetallada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    });
    
    if (!document.getElementById('vistaSencilla').classList.contains('hidden')) {
        buscarSencilla();
    } else if (!document.getElementById('vistaCatalogo').classList.contains('hidden')) {
        buscarCatalogo();
    } else if (!document.getElementById('vistaDetallada').classList.contains('hidden')) {
        ejecutarBusqueda();
    }
}

// 3. Filtrar Repuestos Huérfanos e Inactivos (Optimización de Inventario)
function obtenerCodigosVinculadosEnArbol() {
    const codigos = new Set();
    const recursivo = (nodo) => {
        if (nodo.linkedCodes) {
            nodo.linkedCodes.forEach(c => {
                if (c && c.trim().length > 0) codigos.add(c.trim().toLowerCase());
            });
        }
        if (nodo.children) {
            nodo.children.forEach(recursivo);
        }
    };
    if (arbolMaquinas) recursivo(arbolMaquinas);
    return codigos;
}

function obtenerRepuestosHuerfanosYInactivos() {
    if (typeof TODOS_LOS_DATOS === 'undefined' || !TODOS_LOS_DATOS) return [];
    
    const codigosVinculados = obtenerCodigosVinculadosEnArbol();
    
    return TODOS_LOS_DATOS.filter(f => {
        const codigoClean = f.inv.codigo.trim().toLowerCase();
        // Huérfano: No está en el árbol
        const esHuerfano = !codigosVinculados.has(codigoClean);
        // Inactivo: Sin salidas registradas
        const esInactivo = !f.vecesUsado || f.vecesUsado === 0;
        return esHuerfano && esInactivo;
    });
}

function actualizarBloqueHuerfanos() {
    const huerfanos = obtenerRepuestosHuerfanosYInactivos();
    
    const badge = document.getElementById('badgeCantHuerfanos');
    if (badge) badge.innerText = huerfanos.length;
    
    const cont = document.getElementById('huerfanosCompactList');
    if (!cont) return;
    
    if (huerfanos.length === 0) {
        cont.innerHTML = `<div class="text-slate-400 text-center py-4">No hay repuestos inactivos.</div>`;
        return;
    }
    
    // Mostrar los primeros 8 ítems en lista muy compacta
    const bloque = huerfanos.slice(0, 8);
    cont.innerHTML = bloque.map(h => `
        <div class="py-1 px-1.5 hover:bg-slate-100 transition rounded flex justify-between items-center gap-1.5 cursor-pointer border-b border-slate-100 last:border-0" onclick="abrirModalDetalleSencillo('${h.inv.codigo}')">
            <span class="font-mono text-blue-700 font-bold shrink-0">${h.inv.codigo}</span>
            <span class="truncate block text-gray-600 flex-grow">${h.inv.descripcion}</span>
            <span class="text-gray-400 font-semibold shrink-0">Cant: ${h.inv.cantidad}</span>
        </div>
    `).join('');
}

function filtrarHuerfanosEnInventario() {
    filtroHuerfanosActivo = true;
    
    // Activar avisos visuales en las tres vistas
    ['bannerFiltroHuerfanosSencilla', 'bannerFiltroHuerfanosCatalogo', 'bannerFiltroHuerfanosDetallada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    
    // Redirigir a vista sencilla por defecto
    setVista('sencilla');
}

function desactivarFiltroHuerfanos() {
    filtroHuerfanosActivo = false;
    
    ['bannerFiltroHuerfanosSencilla', 'bannerFiltroHuerfanosCatalogo', 'bannerFiltroHuerfanosDetallada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Recargar vista activa
    if (!document.getElementById('vistaSencilla').classList.contains('hidden')) {
        buscarSencilla();
    } else if (!document.getElementById('vistaCatalogo').classList.contains('hidden')) {
        buscarCatalogo();
    } else if (!document.getElementById('vistaDetallada').classList.contains('hidden')) {
        ejecutarBusqueda();
    }
}

// 4. Modo Enfoque en el Árbol (Focus Mode) y Navegación (Breadcrumbs)
function toggleEnfoqueNodoSeleccionado() {
    if (!nodoSeleccionadoActual) return;
    
    if (nodoEnfoqueId === nodoSeleccionadoActual.id) {
        nodoEnfoqueId = null; // Quitar enfoque
    } else {
        nodoEnfoqueId = nodoSeleccionadoActual.id; // Enfocar
    }
    
    dibujarArbol();
    actualizarPanelEditorNodo();
}

function buscarPadresRecursivo(raiz, id, camino = []) {
    if (raiz.id === id) {
        return [...camino, raiz];
    }
    if (raiz.children) {
        for (const child of raiz.children) {
            const res = buscarPadresRecursivo(child, id, [...camino, raiz]);
            if (res) return res;
        }
    }
    return null;
}

function dibujarBreadcrumbs() {
    const bar = document.getElementById('treeBreadcrumbs');
    if (!bar) return;
    
    if (!nodoEnfoqueId) {
        bar.classList.add('hidden');
        bar.innerHTML = '';
        return;
    }
    
    const camino = buscarPadresRecursivo(arbolMaquinas, nodoEnfoqueId);
    if (!camino) {
        bar.classList.add('hidden');
        return;
    }
    
    const nodesHtml = camino.map((nodo, idx) => {
        const isLast = idx === camino.length - 1;
        const fontClass = isLast ? 'font-black text-indigo-700 font-bold' : 'text-gray-500 hover:text-indigo-600 hover:underline cursor-pointer';
        return `<span class="${fontClass}" onclick="seleccionarNodoYEnfocar('${nodo.id}')">${nodo.label}</span>`;
    }).join(' <span class="text-gray-400 select-none">/</span> ');
    
    bar.innerHTML = `
        <span class="text-gray-400 select-none mr-1 font-bold">👁️ Enfoque:</span>
        ${nodesHtml}
        <button onclick="desactivarEnfoqueArbol()" class="ml-auto text-[9px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded border border-red-200 shadow-sm transition font-bold uppercase tracking-wider shrink-0">Quitar Enfoque</button>
    `;
    bar.classList.remove('hidden');
}

function seleccionarNodoYEnfocar(id) {
    nodoEnfoqueId = id;
    seleccionarNodoArbol(id);
}

function desactivarEnfoqueArbol() {
    nodoEnfoqueId = null;
    dibujarArbol();
    actualizarPanelEditorNodo();
}

// 5. Colección Global de Filtro Base (Huérfanos y Ignorados)
function filtrarColeccionGlobal(dataset) {
    let res = [...dataset];
    
    // A. Filtro de Huérfanos/Inactivos
    if (typeof filtroHuerfanosActivo !== 'undefined' && filtroHuerfanosActivo) {
        const huerfanos = obtenerRepuestosHuerfanosYInactivos();
        const codigosHuerfanos = new Set(huerfanos.map(h => h.inv.codigo));
        res = res.filter(f => codigosHuerfanos.has(f.inv.codigo));
    }
    
    // B. Filtro de Ignorados (Indeseados)
    if (typeof mostrarIgnorados === 'function' && !mostrarIgnorados()) {
        const ignorados = obtenerIgnorados();
        res = res.filter(f => !ignorados.includes(f.inv.codigo.trim().toLowerCase()));
    }
    
    return res;
}

// 6. Fusión Recursiva del Árbol de Máquinas
function fusionarNodosArbol(localNode, backupNode) {
    if (!localNode.linkedCodes) localNode.linkedCodes = [];
    if (backupNode.linkedCodes) {
        backupNode.linkedCodes.forEach(code => {
            if (code && !localNode.linkedCodes.includes(code)) {
                localNode.linkedCodes.push(code);
            }
        });
    }
    if (backupNode.cantReq !== undefined) localNode.cantReq = backupNode.cantReq;
    if (backupNode.expanded !== undefined) localNode.expanded = backupNode.expanded;
    
    if (backupNode.children) {
        if (!localNode.children) localNode.children = [];
        backupNode.children.forEach(bChild => {
            const lChild = localNode.children.find(c => c.id === bChild.id || (c.label === bChild.label && c.type === bChild.type));
            if (lChild) {
                fusionarNodosArbol(lChild, bChild);
            } else {
                localNode.children.push(bChild);
            }
        });
    }
}

// 7. Funciones de Navegación y Búsqueda de Registros en el Modal de Detalles
function obtenerColeccionActiva() {
    if (!document.getElementById('vistaSencilla').classList.contains('hidden')) {
        return _datosSencillaCurrent || [];
    } else if (!document.getElementById('vistaDetallada').classList.contains('hidden')) {
        return DATOS_FILTRADOS || [];
    } else if (!document.getElementById('vistaCatalogo').classList.contains('hidden')) {
        return _datosCatalogoCurrent || [];
    }
    return TODOS_LOS_DATOS || [];
}

function navegarRegistroDetalle(direccion) {
    const col = obtenerColeccionActiva();
    if (!col || col.length === 0 || !itemActualSeleccionado) return;
    
    const index = col.findIndex(x => x.inv.codigo === itemActualSeleccionado.inv.codigo);
    if (index === -1) return;
    
    let nextIndex = index + direccion;
    if (nextIndex < 0) nextIndex = col.length - 1;
    if (nextIndex >= col.length) nextIndex = 0;
    
    const nextFila = col[nextIndex];
    if (nextFila) {
        abrirModalDetalle(nextFila);
    }
}

function buscarYMostrarEnDetalle(codigo) {
    if (!codigo || typeof TODOS_LOS_DATOS === 'undefined') return;
    const clean = codigo.trim().toUpperCase();
    const match = TODOS_LOS_DATOS.find(x => x.inv.codigo.toUpperCase().trim() === clean);
    if (match) {
        abrirModalDetalle(match);
        const inp = document.getElementById('inpBuscarCodigoDetalle');
        if (inp) inp.value = '';
    }
}