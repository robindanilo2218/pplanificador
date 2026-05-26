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
