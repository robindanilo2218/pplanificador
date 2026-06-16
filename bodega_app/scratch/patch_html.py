import re
import os

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Layout wrapping
# Find <div id="contenedorFiltros">
html = html.replace(
'''        <div class="w-full border p-4 rounded bg-gray-50 hidden mb-6 shadow-sm" id="contenedorFiltros">''',
'''        <div id="tabsVistas" class="hidden mb-4 flex gap-2">
            <button id="btnTabSencilla" class="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow-sm" onclick="setVista('sencilla')">Vista Sencilla (Catálogo)</button>
            <button id="btnTabDetallada" class="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold shadow-sm" onclick="setVista('detallada')">Vista Detallada</button>
        </div>

        <div id="vistaSencilla" class="hidden grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div class="col-span-2 flex flex-col gap-4">
                <div class="bg-white border rounded p-4 shadow-sm">
                    <label class="block font-bold text-sm mb-2 text-blue-800">Buscador Rápido</label>
                    <div class="flex gap-2">
                        <input type="text" id="busqSencilla" placeholder="Busca por código, descripción, ubicación o nombre útil..." class="w-full border rounded p-2 text-sm outline-none focus:border-blue-500">
                        <button onclick="buscarSencilla()" class="bg-blue-600 text-white px-6 font-bold rounded">Buscar</button>
                        <button id="btnVerTodoSencillo" onclick="limpiarBusquedaSencilla()" class="hidden bg-gray-600 text-white px-4 font-bold rounded" title="Volver al catálogo">Volver</button>
                    </div>
                </div>
                <div class="overflow-auto bg-white border rounded shadow-sm flex-grow" style="height: 60vh;">
                    <table class="min-w-full text-left text-xs bg-white">
                        <thead class="bg-blue-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="p-2 border-b">Añadir</th>
                                <th class="p-2 border-b">Código / Parte</th>
                                <th class="p-2 border-b">Descripción</th>
                                <th class="p-2 border-b">Nombre Útil</th>
                                <th class="p-2 border-b">Ubicación</th>
                                <th class="p-2 border-b text-center">Inv.</th>
                            </tr>
                        </thead>
                        <tbody id="tbodySencilla"></tbody>
                    </table>
                </div>
            </div>

            <div class="col-span-1 flex flex-col gap-4 max-h-[75vh]">
                <div class="bg-orange-50 border border-orange-200 p-3 rounded shadow-sm flex flex-col flex-1 overflow-hidden" id="cardCarrito">
                    <h3 class="font-bold text-orange-800 text-sm mb-2 border-b border-orange-200 pb-1 flex justify-between">
                        <span>🛒 Solicitud Actual (<span id="sencCount">0</span>)</span>
                        <button onclick="vaciarCarrito()" class="text-xs text-red-600 hover:text-red-800">Vaciar</button>
                    </h3>
                    
                    <div class="mb-2 space-y-1 text-xs">
                        <input type="text" id="gMaquina" placeholder="Máquina / Destino *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">
                        <input type="text" id="gSeccion" placeholder="Sección *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">
                        <input type="text" id="gTecnico" placeholder="Técnico (Opcional)" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">
                    </div>

                    <div id="sencillaCarritoItems" class="flex-grow overflow-y-auto mb-2 bg-white rounded border border-orange-100 p-1 space-y-1 text-xs shadow-inner">
                        <div class="text-gray-400 text-center mt-4">Carrito vacío</div>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="procesarSolicitudEmail()" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded text-xs transition">Enviar a Compras</button>
                        <button onclick="generarPdfCarrito()" class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded text-xs transition">PDF</button>
                    </div>
                </div>

                <div class="bg-indigo-50 border border-indigo-200 p-3 rounded shadow-sm flex flex-col flex-1 overflow-hidden">
                    <h3 class="font-bold text-indigo-800 text-sm mb-2 border-b border-indigo-200 pb-1 flex justify-between items-center">
                        📜 Últimas Solicitudes
                        <button onclick="renderHistorialSencillo()" title="Actualizar" class="text-indigo-600">🔄</button>
                    </h3>
                    <div id="sencillaHistorialItems" class="flex-grow overflow-y-auto bg-white rounded border border-indigo-100 p-1 space-y-1 text-xs shadow-inner">
                    </div>
                </div>
            </div>
        </div>

        <div id="vistaDetallada" class="hidden w-full">
        <div class="w-full border p-4 rounded bg-gray-50 hidden mb-6 shadow-sm" id="contenedorFiltros">'''
)

# Replace table headers in Detailed View
html = html.replace(
'''                        <th>Código</th>
                        <th>No. Parte</th>
                        <th>Descripción</th>
                        <th>Cant.</th>''',
'''                        <th>Código</th>
                        <th>No. Parte</th>
                        <th>Descripción</th>
                        <th>Nombre Útil</th>
                        <th>Ubicación</th>
                        <th>Cant.</th>'''
)

# Replace render table block
html = html.replace(
'''                    <td><div class="cell-scroll mw-200 text-xs" title="${inv.descripcion}">${inv.descripcion}</div></td>
                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>''',
'''                    <td><div class="cell-scroll mw-200 text-xs" title="${inv.descripcion}">${inv.descripcion}</div></td>
                    <td><input type="text" data-codigo="${inv.codigo}" class="in-util w-24 border border-gray-300 rounded p-1 text-xs" value="${inv.nombreUtil || ''}" onclick="event.stopPropagation()"></td>
                    <td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-24 border border-gray-300 rounded p-1 text-xs" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()"></td>
                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>'''
)

# 2. Add listener to persist data on change
js_persist = '''
        document.getElementById('tableBody').addEventListener('change', (e) => {
            if(e.target.classList.contains('in-util') || e.target.classList.contains('in-ubic')) {
                const cod = e.target.getAttribute('data-codigo');
                const val = e.target.value.trim();
                const obj = TODOS_LOS_DATOS.find(x => x.inv.codigo === cod);
                if(obj) {
                    if(e.target.classList.contains('in-util')) obj.inv.nombreUtil = val;
                    if(e.target.classList.contains('in-ubic')) obj.inv.ubicacion = val;
                    guardarDatosEnFondo();
                }
            }
        });

        document.getElementById('tbodySencilla').addEventListener('change', (e) => {
            if(e.target.classList.contains('in-util') || e.target.classList.contains('in-ubic')) {
                const cod = e.target.getAttribute('data-codigo');
                const val = e.target.value.trim();
                const obj = TODOS_LOS_DATOS.find(x => x.inv.codigo === cod);
                if(obj) {
                    if(e.target.classList.contains('in-util')) obj.inv.nombreUtil = val;
                    if(e.target.classList.contains('in-ubic')) obj.inv.ubicacion = val;
                    guardarDatosEnFondo();
                    // Sync detailed table inputs if they exist in DOM
                    const dupInput = document.querySelector(`#tableBody input[data-codigo="${cod}"].${e.target.classList[0]}`);
                    if(dupInput) dupInput.value = val;
                }
            }
        });

        async function guardarDatosEnFondo() {
            try {
                const setGrupos = new Set(TODOS_LOS_DATOS.map(d=>d.inv.grupo));
                const setMaquinas = new Set(); TODOS_LOS_DATOS.forEach(d => { if(d.maquinasUnicas) d.maquinasUnicas.split(',').forEach(m=>setMaquinas.add(m.trim()))});
                await guardarDatos({ resultadosTabla: TODOS_LOS_DATOS, gruposUnicos: Array.from(setGrupos), maquinasUnicas: Array.from(setMaquinas) });
            } catch(e) { console.error("Error guardando fondo", e); }
        }
        
'''

# 3. Add UI View Toggle logic and Simple Search logic
js_view = '''
        function setVista(v) {
            const btnS = document.getElementById('btnTabSencilla');
            const btnD = document.getElementById('btnTabDetallada');
            const secS = document.getElementById('vistaSencilla');
            const secD = document.getElementById('vistaDetallada');

            if(v === 'sencilla') {
                secS.classList.remove('hidden');
                secD.classList.add('hidden');
                secD.classList.remove('w-full'); // Remove detailed layout wrapper class? No, it's hidden anyway
                btnS.classList.replace('bg-gray-200','bg-blue-600'); btnS.classList.replace('text-gray-800','text-white');
                btnD.classList.replace('bg-blue-600','bg-gray-200'); btnD.classList.replace('text-white','text-gray-800');
                renderSencilla(TODOS_LOS_DATOS);
                renderHistorialSencillo();
                actualizarMiniCarrito();
            } else {
                secS.classList.add('hidden');
                secD.classList.remove('hidden');
                btnD.classList.replace('bg-gray-200','bg-blue-600'); btnD.classList.replace('text-gray-800','text-white');
                btnS.classList.replace('bg-blue-600','bg-gray-200'); btnS.classList.replace('text-white','text-gray-800');
                ejecutarBusqueda();
            }
        }

        function buscarSencilla() {
            const term = document.getElementById('busqSencilla').value.toLowerCase().trim();
            if(!term) { renderSencilla(TODOS_LOS_DATOS); document.getElementById('btnVerTodoSencillo').classList.add('hidden'); return; }
            
            const terms = term.split(/\s+/);
            const filtrados = TODOS_LOS_DATOS.filter(fila => {
                const text = `${fila.inv.codigo} ${fila.inv.descripcion} ${fila.inv.noParte} ${fila.inv.nombreUtil||''} ${fila.inv.ubicacion||''}`.toLowerCase();
                return terms.every(t => text.includes(t));
            });
            renderSencilla(filtrados);
            document.getElementById('btnVerTodoSencillo').classList.remove('hidden');
        }

        function limpiarBusquedaSencilla() {
            document.getElementById('busqSencilla').value = "";
            buscarSencilla();
            document.getElementById('btnVerTodoSencillo').classList.add('hidden');
        }

        function renderSencilla(datos) {
            const tbody = document.getElementById('tbodySencilla');
            if(!datos || datos.length === 0) { tbody.innerHTML = "<tr><td colspan='6' class='text-center p-4'>Sin resultados.</td></tr>"; return; }
            
            const htmlArr = datos.slice(0, 150).map(fila => `
                <tr class="border-b hover:bg-blue-50 transition cursor-pointer" onclick="abrirModalDetalleSencillo('${fila.inv.codigo}')">
                    <td class="p-1">
                        <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px]" onclick="event.stopPropagation(); simpleAddToCart('${fila.inv.codigo}', 1)">+1</button>
                    </td>
                    <td class="p-2 max-w-[100px] break-words"><b>${fila.inv.codigo}</b><br><span class="text-[10px] text-gray-500">${fila.inv.noParte||'-'}</span></td>
                    <td class="p-2 max-w-[150px] break-words leading-tight" title="${fila.inv.descripcion}">${fila.inv.descripcion}</td>
                    <td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-util w-24 border rounded p-1 text-[10px]" value="${fila.inv.nombreUtil || ''}" onclick="event.stopPropagation()"></td>
                    <td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-ubic w-24 border rounded p-1 text-[10px]" value="${fila.inv.ubicacion || ''}" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-center font-bold text-blue-800">${fila.inv.cantidad}</td>
                </tr>
            `);
            tbody.innerHTML = htmlArr.join('');
        }

        function abrirModalDetalleSencillo(codigo) {
            const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
            if(fila) abrirModalDetalle(fila);
        }

        function simpleAddToCart(codigo, cant) {
            const fila = TODOS_LOS_DATOS.find(f => f.inv.codigo === codigo);
            if(!fila) return;
            
            carrito.push({
                codigo: fila.inv.codigo,
                noParte: fila.inv.noParte || "-",
                descripcion: fila.inv.descripcion,
                cant: parseFloat(cant)
            });
            actualizarMiniCarrito();
            actualizarBadgeCarrito();
        }

        function actualizarMiniCarrito() {
            const contSenc = document.getElementById('sencillaCarritoItems');
            if(!contSenc) return;
            document.getElementById('sencCount').innerText = carrito.length;

            if(carrito.length === 0) {
                contSenc.innerHTML = '<div class="text-gray-400 text-center mt-4">Carrito vacío</div>';
                return;
            }

            contSenc.innerHTML = carrito.map((it, idx) => `
                <div class="flex justify-between items-center border-b pb-1">
                    <div class="leading-tight flex-1 pr-2">
                        <span class="font-bold text-[10px] text-blue-800">${it.codigo}</span><br>
                        <span class="text-[10px] truncate block max-w-[150px]" title="${it.descripcion}">${it.descripcion}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="font-black text-orange-600 px-1">${it.cant}</span>
                        <button onclick="eliminarDelCarrito(${idx})" class="text-red-500 hover:text-red-700 bg-red-50 rounded px-1 text-[10px]">❌</button>
                    </div>
                </div>
            `).join('');
        }
        
        async function renderHistorialSencillo() {
            const cont = document.getElementById('sencillaHistorialItems');
            if(!cont) return;
            const data = await obtenerHistorial();
            if(data.length === 0) {
                cont.innerHTML = '<div class="text-gray-400 text-center mt-4">Sin historial</div>';
                return;
            }

            data.sort((a,b) => b.fecha_log - a.fecha_log);
            const recientes = data.slice(0, 20);

            cont.innerHTML = recientes.map(h => {
                const d = new Date(h.fecha_log);
                const itemsCount = h.items ? h.items.length : 0;
                return `
                <div class="border rounded p-2 hover:bg-indigo-50 cursor-pointer transition mb-1 bg-white shadow-sm" onclick="cargarItemsHistorial(this, '${h.id_solicitud}')" data-sol-data='${JSON.stringify(h.items).replace(/'/g, "&#39;")}'>
                    <div class="flex justify-between items-center border-b border-indigo-100 pb-1 mb-1">
                        <span class="font-mono font-bold text-indigo-700 text-[10px]">${h.id_solicitud}</span>
                        <span class="text-[9px] text-gray-500">${d.toLocaleDateString()}</span>
                    </div>
                    <div class="text-[10px] flex justify-between items-center">
                        <span class="font-bold text-gray-700">${h.form?.maquina || '-'}</span>
                        <span class="bg-indigo-100 text-indigo-800 font-bold px-1 rounded">${itemsCount} ítem(s)</span>
                    </div>
                </div>`;
            }).join('');
        }

        function cargarItemsHistorial(el, idSol) {
            // Restore visual active state
            document.querySelectorAll('#sencillaHistorialItems > div').forEach(d => {
                d.classList.remove('bg-indigo-100', 'border-indigo-400');
                d.classList.add('bg-white');
            });
            el.classList.add('bg-indigo-100', 'border-indigo-400');
            el.classList.remove('bg-white');

            const jsondata = el.getAttribute('data-sol-data');
            const items = JSON.parse(jsondata);
            
            // Highlight these items in the left list. We map their codes.
            const codes = items.map(i => i.codigo);
            const filtrados = TODOS_LOS_DATOS.filter(fila => codes.includes(fila.inv.codigo));

            document.getElementById('btnVerTodoSencillo').classList.remove('hidden');
            renderSencilla(filtrados);
        }

'''
html = html.replace('// --- SISTEMA DE CARRITO, HISTORIAL Y PDF ---', js_view + '\n        // --- SISTEMA DE CARRITO, HISTORIAL Y PDF ---')
html = html.replace('// --- SISTEMA ORIGINAL INTACTO DE LECTURA Y RENDERIZADO ---', js_persist + '\n        // --- SISTEMA ORIGINAL INTACTO DE LECTURA Y RENDERIZADO ---')

# Overwrite process
html = html.replace("document.getElementById('contenedorFiltros').classList.remove('hidden');", "document.getElementById('tabsVistas').classList.remove('hidden'); setVista('sencilla');")

# Fix init loading mapping data preservation
html = html.replace(
'''                const datosInventario = await leerExcel(fileExcel);
                let inventarioFiltrado = {};''',
'''                const datosInventario = await leerExcel(fileExcel);
                let inventarioFiltrado = {};

                const oldData = await cargarDatos();
                const metaDatos = {};
                if(oldData && oldData.resultadosTabla) {
                    oldData.resultadosTabla.forEach(f => {
                        metaDatos[f.inv.codigo] = { ubicacion: f.inv.ubicacion || '', nombreUtil: f.inv.nombreUtil || '' };
                    });
                }'''
)

html = html.replace(
'''                        if (!inventarioFiltrado[codigo]) {
                            inventarioFiltrado[codigo] = { codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, ultimaCompra: fechaCompra };
                        } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {''',
'''                        if (!inventarioFiltrado[codigo]) {
                            inventarioFiltrado[codigo] = { codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, ultimaCompra: fechaCompra, ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', nombreUtil: metaDatos[codigo] ? metaDatos[codigo].nombreUtil : '' };
                        } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {'''
)

# Overwrite Email generation & PDF logic handling Cart
# Simplify agregarAlCarrito in modalDetalle to sync with simple logic.
html = html.replace(
'''            carrito.push({
                codigo: itemActualSeleccionado.inv.codigo,
                noParte: itemActualSeleccionado.inv.noParte || "-",
                descripcion: itemActualSeleccionado.inv.descripcion,
                cant: cant,
                maquina: maq,
                serie: document.getElementById('inpSerie').value.trim() || "-",
                modelo: document.getElementById('inpModelo').value.trim() || "-",
                seccion: sec,
                tecnico: document.getElementById('inpTecnico').value.trim() || "-",
                fechaSugerida: document.getElementById('inpFechaSug').value
            });''',
'''            carrito.push({
                codigo: itemActualSeleccionado.inv.codigo,
                noParte: itemActualSeleccionado.inv.noParte || "-",
                descripcion: itemActualSeleccionado.inv.descripcion,
                cant: cant
            });
            // Update global form if explicitly filled here
            if(maq) document.getElementById('gMaquina').value = maq;
            if(sec !== "-") document.getElementById('gSeccion').value = sec;
            const tec = document.getElementById('inpTecnico').value.trim();
            if(tec) document.getElementById('gTecnico').value = tec;

            actualizarMiniCarrito();'''
)

# In modalCarrito rendering table, remove maquina and seccion column
html = html.replace(
'''                                    <th class="px-4 py-2 border-b">Destino (Sección)</th>
                                    <th class="px-4 py-2 border-b text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${carrito.map((item, index) => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="px-4 py-2 font-mono text-xs font-bold text-blue-700">${item.codigo}</td>
                                        <td class="px-4 py-2 text-xs font-semibold">${item.descripcion}</td>
                                        <td class="px-4 py-2 text-center font-black text-lg text-orange-600">${item.cant}</td>
                                        <td class="px-4 py-2 text-xs"><b>${item.maquina}</b><br><span class="text-gray-500">${item.seccion}</span></td>
                                        <td class="px-4 py-2 text-center">''',
'''                                    <th class="px-4 py-2 border-b text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${carrito.map((item, index) => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="px-4 py-2 font-mono text-xs font-bold text-blue-700">${item.codigo}</td>
                                        <td class="px-4 py-2 text-xs font-semibold">${item.descripcion}</td>
                                        <td class="px-4 py-2 text-center font-black text-lg text-orange-600">${item.cant}</td>
                                        <td class="px-4 py-2 text-center">'''
)

# Re-link eliminarDelCarrito to also sync Sencilla View
html = html.replace(
'''function eliminarDelCarrito(index) { carrito.splice(index, 1); actualizarBadgeCarrito(); abrirCarrito(); }''',
'''function eliminarDelCarrito(index) { carrito.splice(index, 1); actualizarBadgeCarrito(); actualizarMiniCarrito(); const m = document.getElementById('modalCarrito'); if(!m.classList.contains('hidden')) abrirCarrito(); }
function vaciarCarrito() { if(confirm("¿Seguro que deseas vaciar todo el carrito?")) { carrito = []; actualizarBadgeCarrito(); actualizarMiniCarrito(); const m = document.getElementById('modalCarrito'); if(!m.classList.contains('hidden')) abrirCarrito(); } }'''
)
html = html.replace('''function vaciarCarrito() { if(confirm("¿Seguro que deseas vaciar todo el carrito?")) { carrito = []; actualizarBadgeCarrito(); abrirCarrito(); } }''', '')


# Ensure PDF has maquina/seccion from global form instead of items
html = html.replace(
'''            // Crear el div oculto para el formato del PDF
            let printDiv = document.createElement('div');
            printDiv.id = 'cartPrintArea';''',
'''            const gMaq = document.getElementById('gMaquina') ? document.getElementById('gMaquina').value.trim() : 'No esp.';
            const gSec = document.getElementById('gSeccion') ? document.getElementById('gSeccion').value.trim() : 'No esp.';
            const gTec = document.getElementById('gTecnico') ? document.getElementById('gTecnico').value.trim() : '';

            // Crear el div oculto para el formato del PDF
            let printDiv = document.createElement('div');
            printDiv.id = 'cartPrintArea';'''
)

html = html.replace(
'''<th style="border: 1px solid #ccc; padding: 8px;">Máquina / Sección</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Serie / Modelo</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Técnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${carrito.map((it, idx) => `
                                <tr>
                                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${idx+1}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px;"><b>${it.codigo}</b><br><span style="font-size:10px;">PN: ${it.noParte}</span></td>
                                    <td style="border: 1px solid #ccc; padding: 8px;">${it.descripcion}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center; font-weight:bold;">${it.cant}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px;"><b>${it.maquina}</b><br>${it.seccion}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px; font-size:10px;">S: ${it.serie}<br>M: ${it.modelo}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px;">${it.tecnico}</td>
                                </tr>''',
'''<th style="border: 1px solid #ccc; padding: 8px;">Técnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5" style="border: 1px solid #ccc; padding: 8px; background-color:#e0f2fe; text-align:center;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}</td></tr>
                            ${carrito.map((it, idx) => `
                                <tr>
                                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${idx+1}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px;"><b>${it.codigo}</b><br><span style="font-size:10px;">PN: ${it.noParte}</span></td>
                                    <td style="border: 1px solid #ccc; padding: 8px;">${it.descripcion}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px; text-align:center; font-weight:bold;">${it.cant}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px;">${gTec}</td>
                                </tr>'''
)

# Email process global modification
html = html.replace(
'''        async function procesarSolicitudEmail() {
            if(carrito.length === 0) return alert("No hay items en el carrito.");

            const d = new Date();''',
'''        async function procesarSolicitudEmail() {
            if(carrito.length === 0) return alert("No hay items en el carrito.");
            
            const gMaq = document.getElementById('gMaquina').value.trim() || '-';
            const gSec = document.getElementById('gSeccion').value.trim() || '-';
            const gTec = document.getElementById('gTecnico').value.trim() || '';

            const formData = { maquina: gMaq, seccion: gSec, tecnico: gTec };

            const d = new Date();'''
)

html = html.replace(
'''                                <th>Máquina / Sección</th><th>Serie / Modelo</th><th>F. Sugerida</th><th>Técnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${carrito.map((item, idx) => `
                                <tr>
                                    <td>${idx+1}</td>
                                    <td style="font-family: monospace;"><b>${item.codigo}</b><br><span style="font-size:10px; color:#555;">PN: ${item.noParte}</span></td>
                                    <td>${item.descripcion}</td>
                                    <td style="text-align: center; font-weight: bold; color: #d97706; font-size:15px;">${item.cant}</td>
                                    <td><b>${item.maquina}</b><br>${item.seccion}</td>
                                    <td style="font-size:10px;">S: ${item.serie}<br>M: ${item.modelo}</td>
                                    <td>${item.fechaSugerida}</td>
                                    <td>${item.tecnico}</td>
                                </tr>''',
'''                                <th>Técnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5" style="background-color:#e0f2fe; text-align:center; padding:5px;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}</td></tr>
                            ${carrito.map((item, idx) => `
                                <tr>
                                    <td>${idx+1}</td>
                                    <td style="font-family: monospace;"><b>${item.codigo}</b><br><span style="font-size:10px; color:#555;">PN: ${item.noParte}</span></td>
                                    <td>${item.descripcion}</td>
                                    <td style="text-align: center; font-weight: bold; color: #d97706; font-size:15px;">${item.cant}</td>
                                    <td>${gTec}</td>
                                </tr>'''
)

html = html.replace('''await guardarCompraEnHistorial(idSol, carrito);''', '''await guardarCompraEnHistorial(idSol, carrito, formData);''')
html = html.replace('''carrito = []; actualizarBadgeCarrito(); cerrarCarrito();''', '''carrito = []; actualizarBadgeCarrito(); actualizarMiniCarrito(); cerrarCarrito(); renderHistorialSencillo();''')

# History modification
html = html.replace(
'''        async function guardarCompraEnHistorial(solicitudId, items) {
            try {
                const db = await initDB();
                const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                const store = tx.objectStore(STORE_HISTORIAL);
                store.put({ id_solicitud: solicitudId, fecha_log: new Date().getTime(), items: items });''',
'''        async function guardarCompraEnHistorial(solicitudId, items, formInfo) {
            try {
                const db = await initDB();
                const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                const store = tx.objectStore(STORE_HISTORIAL);
                store.put({ id_solicitud: solicitudId, fecha_log: new Date().getTime(), items: items, form: formInfo || {} });'''
)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)
print("Patch successful!")
