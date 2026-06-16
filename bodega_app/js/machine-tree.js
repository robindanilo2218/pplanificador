// -----------------------------------------------------
// 7. GESTIÓN DEL ÁRBOL DE REPUESTOS EN MÁQUINA
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

function calcularEstadoNodo(nodo) {
    if (typeof TODOS_LOS_DATOS === 'undefined' || !TODOS_LOS_DATOS) {
        return { falta: 0, sinVincular: 0 };
    }
    if (!debeMostrarNodoSistema(nodo)) {
        return { falta: 0, sinVincular: 0 };
    }
    const hasChildren = nodo.children && nodo.children.length > 0;
    if (!hasChildren) {
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

function calcularNodosVisiblesYOpacos() {
    idsVisibles.clear();
    idsOpacos.clear();

    if (!nodoSeleccionadoActual) {
        return;
    }

    const camino = buscarPadresRecursivo(arbolMaquinas, nodoSeleccionadoActual.id) || [];
    const idsPathSelected = new Set(camino.map(n => n.id));
    camino.forEach(n => idsVisibles.add(n.id));

    const descendientes = [];
    const obtenerDescendientesIds = (n) => {
        descendientes.push(n.id);
        if (n.children) {
            n.children.forEach(obtenerDescendientesIds);
        }
    };
    obtenerDescendientesIds(nodoSeleccionadoActual);
    descendientes.forEach(id => idsVisibles.add(id));

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

function dibujarArbol() {
    const container = document.getElementById('treeContainer');
    if (!container) return;

    if (!arbolMaquinas) {
        container.innerHTML = "<div class='text-gray-400 py-6 text-center'>Error al cargar la estructura del árbol.</div>";
        return;
    }

    if (typeof dibujarBreadcrumbs === 'function') dibujarBreadcrumbs();

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

function dibujarNodoRecursivo(nodo, nivel) {
    if (!debeMostrarNodoSistema(nodo)) {
        return "";
    }

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

    if (nodoSeleccionadoActual && idsOpacos.has(nodo.id)) {
        colorClass += ' opacity-40 hover:opacity-100 transition-opacity duration-200';
    }

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

function buscarPadreDeNodo(parent, childId) {
    if (!parent.children) return null;
    if (parent.children.some(c => c.id === childId)) return parent;
    for (const child of parent.children) {
        const found = buscarPadreDeNodo(child, childId);
        if (found) return found;
    }
    return null;
}

async function toggleNodoExpansión(id) {
    if (!arbolMaquinas) return;
    const nodo = buscarNodoPorId(arbolMaquinas, id);
    if (nodo) {
        nodo.expanded = nodo.expanded === false ? true : false;
        dibujarArbol();
        await guardarArbolMaquinas(arbolMaquinas);
    }
}

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

function seleccionarNodoArbol(id) {
    if (!arbolMaquinas) return;
    const nodo = buscarNodoPorId(arbolMaquinas, id);
    if (nodo) {
        modoEdicionActivo = false;
        nodoSeleccionadoActual = nodo;
        dibujarArbol();
        actualizarPanelEditorNodo();
        cargarRepuestosVinculadosNodo();
    }
}

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

    modoEdicionActivo = false;
    dibujarArbol();
    actualizarPanelEditorNodo();
    cargarRepuestosVinculadosNodo();
    await guardarArbolMaquinas(arbolMaquinas);

    alert("✅ Cambios guardados en el nodo correctamente.");
}

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

async function cargarRepuestosVinculadosNodo() {
    const list = document.getElementById('repuestosVinculadosList');
    const badge = document.getElementById('badgeCantVinculados');
    if (!list) return;

    if (badge) badge.innerText = "0";

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

    if (!specsText.trim()) {
        listSugs.innerHTML = `
            <div class="text-gray-400 text-center py-6 text-[10px] flex flex-col items-center gap-1 bg-gray-50 border border-dashed rounded p-3 leading-normal">
                <span>💡 Agregue especificaciones técnicas (como marca, HP, RPM, rodamientos, etc.) arriba para buscar automáticamente repuestos relacionados en Bodega.</span>
            </div>`;
        if (badgeSugs) badgeSugs.innerText = "0";
        return;
    }

    const combText = (labelText + " " + specsText).toLowerCase();
    const tokens = combText.match(/[a-z0-9]+/g) || [];

    const ruido = new Set([
        "sistema", "del", "los", "las", "para", "con", "linea", "equipo", "maquina", 
        "potencia", "control", "seguridad", "neumatico", "hidraulico", "principal", 
        "abrir", "cerrar", "seccion", "brazos", "anilox", "blower", "vacio", "bandas", 
        "botoneria", "sensores", "inductivos", "encoder", "plc", "valvulas", 
        "electrovalvulas", "presion", "temperatura", "botones", "emergencia", 
        "pasadores", "tarjetas", "safe", "datos", "placa",
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

    const sugeridos = TODOS_LOS_DATOS.map(fila => {
        const { inv } = fila;
        const codigo = inv.codigo;
        const noParte = inv.noParte || '';
        const desc = inv.descripcion || '';
        const nombreUtil = inv.nombreUtil || '';

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

function animarBotonVinculacion(btn) {
    if (!btn) return;
    btn.innerHTML = "🔌 Vinculado";
    btn.className = "bg-green-600 text-white font-bold py-0.5 px-2 rounded text-[9px] transition shadow-sm shrink-0 scale-95";
}

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

    const clon = clonarNodoConNuevosIds(nodoSeleccionadoActual, newLabel);

    if (!parent.children) parent.children = [];
    parent.children.push(clon);

    dibujarArbol();
    seleccionarNodoArbol(clon.id);
    await guardarArbolMaquinas(arbolMaquinas);

    alert(`✅ Estructura duplicada correctamente como "${newLabel}".`);
}

function existeLabelEnHermanos(parent, label) {
    if (!parent || !parent.children) return false;
    return parent.children.some(c => c.label.toLowerCase().trim() === label.toLowerCase().trim());
}

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
    
    document.body.addEventListener('click', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;

        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) return;

        const tr = e.target.closest('tr[data-repuesto-codigo]');
        if (!tr) return;

        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.closest('button') || e.target.closest('a')) {
            return;
        }

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

    inicializarTooltipRepuestos();
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

// ── Sincronización de búsquedas e interacciones de tooltip ──
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

function iniciarVinculacionDeCodigo(codigo) {
    if (!codigo) return;
    CODIGO_PENDIENTE_VINCULAR = codigo;
    
    const banner = document.getElementById('bannerVinculacionPendiente');
    const label = document.getElementById('codigoVincularLabel');
    if (banner && label) {
        label.innerText = codigo;
        banner.classList.remove('hidden');
    }
    
    const tooltip = document.getElementById('repuestoTooltip');
    if (tooltip) tooltip.classList.add('hidden');
    
    setVista('repuestosMaquina');
    
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

async function vincularCodigoPendienteActual() {
    if (!CODIGO_PENDIENTE_VINCULAR || !nodoSeleccionadoActual) return;
    
    const codigo = CODIGO_PENDIENTE_VINCULAR;
    await vincularCodigoRapido(codigo);
    
    cancelarVinculacionPendiente();
    alert(`✅ El repuesto ${codigo} ha sido vinculado con éxito a "${nodoSeleccionadoActual.label}".`);
}

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

function irANodoEnArbol(id) {
    if (!arbolMaquinas) return;
    
    const tooltip = document.getElementById('repuestoTooltip');
    if (tooltip) tooltip.classList.add('hidden');
    if (typeof cerrarModalDetalle === 'function') cerrarModalDetalle();
    
    setVista('repuestosMaquina');
    
    expandirAncestrosDeNodo(arbolMaquinas, id);
    
    seleccionarNodoArbol(id);
    
    setTimeout(() => {
        const el = document.querySelector(`.bg-blue-100.border-blue-300`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('animate-pulse');
            setTimeout(() => el.classList.remove('animate-pulse'), 2000);
        }
    }, 300);
}

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

function generarPdfArbolMaquinas() {
    if (!arbolMaquinas) return alert("No hay datos del árbol para imprimir.");

    let nodoARenderizar = arbolMaquinas;
    let tituloReporte = "Estructura de Planta y Equipos";
    let subtituloReporte = "REPORTE COMPLETO DE MÁQUINAS Y REPUESTOS VINCULADOS";

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

// ── Nuevas Funcionalidades Avanzadas ─────────────────────
let nodoEnfoqueId = null;
let filtroHuerfanosActivo = false;

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
        const esHuerfano = !codigosVinculados.has(codigoClean);
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
    
    ['bannerFiltroHuerfanosSencilla', 'bannerFiltroHuerfanosCatalogo', 'bannerFiltroHuerfanosDetallada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    
    setVista('sencilla');
}

function desactivarFiltroHuerfanos() {
    filtroHuerfanosActivo = false;
    
    ['bannerFiltroHuerfanosSencilla', 'bannerFiltroHuerfanosCatalogo', 'bannerFiltroHuerfanosDetallada'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    if (!document.getElementById('vistaSencilla').classList.contains('hidden')) {
        buscarSencilla();
    } else if (!document.getElementById('vistaCatalogo').classList.contains('hidden')) {
        buscarCatalogo();
    } else if (!document.getElementById('vistaDetallada').classList.contains('hidden')) {
        ejecutarBusqueda();
    }
}

function toggleEnfoqueNodoSeleccionado() {
    if (!nodoSeleccionadoActual) return;
    
    if (nodoEnfoqueId === nodoSeleccionadoActual.id) {
        nodoEnfoqueId = null;
    } else {
        nodoEnfoqueId = nodoSeleccionadoActual.id;
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

function filtrarColeccionGlobal(dataset) {
    let res = [...dataset];
    
    if (typeof filtroHuerfanosActivo !== 'undefined' && filtroHuerfanosActivo) {
        const huerfanos = obtenerRepuestosHuerfanosYInactivos();
        const codigosHuerfanos = new Set(huerfanos.map(h => h.inv.codigo));
        res = res.filter(f => codigosHuerfanos.has(f.inv.codigo));
    }
    
    if (typeof mostrarIgnorados === 'function' && !mostrarIgnorados()) {
        const ignorados = obtenerIgnorados();
        res = res.filter(f => !ignorados.includes(f.inv.codigo.trim().toLowerCase()));
    }
    
    return res;
}

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
