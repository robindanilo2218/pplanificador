// -----------------------------------------------------
// 6. MOTOR DE IMÁGENES LOCALES Y VISTA CATÁLOGO
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

// Guarda índices en IndexedDB
async function guardarIndicesImagenes() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_ANALISIS, 'readwrite');
        tx.objectStore(STORE_ANALISIS).put({
            exact: IMAGENES_INDEX,
            simp: IMAGENES_SIMPLIFIED_INDEX
        }, 'imagenesIndices');
        return new Promise(r => tx.oncomplete = r);
    } catch (e) {
        console.warn("No se pudo guardar los índices de imágenes en DB:", e);
    }
}

// Carga índices de IndexedDB
async function cargarIndicesImagenes() {
    try {
        const db = await initDB();
        return new Promise(r => {
            const req = db.transaction(STORE_ANALISIS, 'readonly').objectStore(STORE_ANALISIS).get('imagenesIndices');
            req.onsuccess = () => r(req.result);
            req.onerror = () => r(null);
        });
    } catch (e) {
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
            const perm = await handle.queryPermission(options);
            
            const indices = await cargarIndicesImagenes();
            if (indices && indices.exact && Object.keys(indices.exact).length > 0) {
                IMAGENES_INDEX = indices.exact;
                IMAGENES_SIMPLIFIED_INDEX = indices.simp;
                console.log("Índices cargados desde DB (arranque ultra-rápido).", Object.keys(IMAGENES_INDEX).length);
                
                if (perm === 'granted') {
                    ocultarBotonPermisoReconexion();
                } else {
                    mostrarBotonPermisoReconexion();
                }
                
                if (document.getElementById('vistaCatalogo') && !document.getElementById('vistaCatalogo').classList.contains('hidden')) {
                    renderCatalogo(TODOS_LOS_DATOS);
                }
            } else {
                if (perm === 'granted') {
                    await inicializarCarpetaImagenes(handle);
                } else {
                    mostrarBotonPermisoReconexion();
                }
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
        await guardarIndicesImagenes();

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

                        const matchSuffix = baseName.match(/(.+)_(\d+)$/);
                        let baseKey = baseName;
                        let suffixNum = 1;
                        if (matchSuffix) {
                            baseKey = matchSuffix[1];
                            suffixNum = parseInt(matchSuffix[2], 10);
                        }

                        const exactKey = baseKey.trim().toLowerCase();
                        const simpKey = simplifyKey(baseKey);

                        if (!IMAGENES_INDEX[exactKey]) IMAGENES_INDEX[exactKey] = [];
                        IMAGENES_INDEX[exactKey].push({ handle: entry, suffix: suffixNum });

                        if (!IMAGENES_SIMPLIFIED_INDEX[simpKey]) IMAGENES_SIMPLIFIED_INDEX[simpKey] = [];
                        IMAGENES_SIMPLIFIED_INDEX[simpKey].push({ handle: entry, suffix: suffixNum });

                        encolarGeneracionThumbnail(entry, exactKey, simpKey);
                    }
                }
            }
        } catch (e) {
            console.warn(`Error al leer ruta: ${path}`, e);
        }
    }

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
    if (!fullQuality) {
        const thumb = await cargarThumbnailDesdeDb(codigo, noParte);
        if (thumb) {
            return [thumb];
        }
    }
    
    if (!dirImagenesHandle) {
        const thumb = await cargarThumbnailDesdeDb(codigo, noParte);
        return thumb ? [thumb] : [];
    }

    const keyCodigo = codigo ? codigo.trim().toLowerCase() : '';
    const keyNoParte = noParte ? noParte.trim().toLowerCase() : '';
    const simpCodigo = simplifyKey(codigo);
    const simpNoParte = simplifyKey(noParte);

    let entries = [];

    if (keyCodigo && IMAGENES_INDEX[keyCodigo]) {
        entries = IMAGENES_INDEX[keyCodigo];
    }
    else if (keyNoParte && keyNoParte !== '-' && IMAGENES_INDEX[keyNoParte]) {
        entries = IMAGENES_INDEX[keyNoParte];
    }
    else if (simpCodigo && IMAGENES_SIMPLIFIED_INDEX[simpCodigo]) {
        entries = IMAGENES_SIMPLIFIED_INDEX[simpCodigo];
    }
    else if (simpNoParte && simpNoParte !== '-' && IMAGENES_SIMPLIFIED_INDEX[simpNoParte]) {
        entries = IMAGENES_SIMPLIFIED_INDEX[simpNoParte];
    }

    const urls = [];
    for (const entry of entries) {
        const url = await obtenerUrlDeHandle(entry.handle);
        if (url) urls.push(url);
    }
    
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
async function abrirImagenPantallaCompleta(codigo, noParte, thumbSrc) {
    const m = document.getElementById('modalImagenCompleta');
    const img = document.getElementById('imgPantallaCompleta');
    if (m && img) {
        img.src = thumbSrc; 
        m.classList.remove('hidden');
        
        try {
            if (dirImagenesHandle) {
                const options = { mode: 'read' };
                if ((await dirImagenesHandle.queryPermission(options)) !== 'granted') {
                    const granted = await dirImagenesHandle.requestPermission(options);
                    if (granted === 'granted') {
                        ocultarBotonPermisoReconexion();
                    }
                }
            }

            const fullImgs = await obtenerImagenesRepuesto(codigo, noParte, true);
            if (fullImgs && fullImgs.length > 0) {
                img.src = fullImgs[0];
            }
        } catch (e) {
            console.warn("No se pudo cargar la imagen original en alta calidad", e);
        }
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
                <div class="relative w-full h-40 bg-gray-50 flex items-center justify-center border-b overflow-hidden cursor-pointer" onclick="abrirImagenPantallaCompleta('${codigo}', '${noParte}', this.querySelector('img').src)">
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

// ── Cola de procesamiento y Caché de Imágenes ───────────
let queueThumbnails = [];
let processThumbnailsRunning = false;

function encolarGeneracionThumbnail(fileHandle, exactKey, simpKey) {
    queueThumbnails.push({ fileHandle, exactKey, simpKey });
    procesarColaThumbnails();
}

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
        await new Promise(r => setTimeout(r, 40));
    }
    
    processThumbnailsRunning = false;
}

async function generarYGuardarThumbnail(fileHandle, exactKey, simpKey) {
    try {
        const db = await initDB();
        
        const cacheVal = await new Promise(r => {
            const req = db.transaction(STORE_THUMBNAILS, 'readonly').objectStore(STORE_THUMBNAILS).get(exactKey);
            req.onsuccess = () => r(req.result);
            req.onerror = () => r(null);
        });
        
        if (cacheVal) {
            return;
        }
        
        const file = await fileHandle.getFile();
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
                
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.4);
                resolve(thumbnailDataUrl);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

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
