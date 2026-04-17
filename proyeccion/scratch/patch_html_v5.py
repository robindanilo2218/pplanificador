import re
import sys

filePath = "index.html"
with open(filePath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Agregando propiedades al metaDatos (persistence check)
target_meta = """                if(oldData && oldData.resultadosTabla) {
                    oldData.resultadosTabla.forEach(f => {
                        metaDatos[f.inv.codigo] = { ubicacion: f.inv.ubicacion || '', nombreUtil: f.inv.nombreUtil || '' };
                    });
                }"""

replacement_meta = """                if(oldData && oldData.resultadosTabla) {
                    oldData.resultadosTabla.forEach(f => {
                        metaDatos[f.inv.codigo] = { 
                            ubicacion: f.inv.ubicacion || '', 
                            nombreUtil: f.inv.nombreUtil || '',
                            ingresoManual: f.inv.ingresoManual || null,
                            salidasLocales: f.inv.salidasLocales || [],
                            oldCantidad: f.inv.cantidad
                        };
                    });
                }"""

# 2. Asignando metaDatos a los items en inventarioFiltrado
target_inv = """                    if (!inventarioFiltrado[codigo]) {
                        inventarioFiltrado[codigo] = { codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, ultimaCompra: fechaCompra, ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : generarNombreUtil(desc) };
                    } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {"""

replacement_inv = """                    if (!inventarioFiltrado[codigo]) {
                        let mIngreso = null;
                        let mSalidas = [];
                        if (metaDatos[codigo]) {
                            mIngreso = metaDatos[codigo].ingresoManual;
                            // Reset local salidas if base quantity changed from last known!
                            if (metaDatos[codigo].oldCantidad !== undefined && parseFloat(metaDatos[codigo].oldCantidad) === cant) {
                                mSalidas = metaDatos[codigo].salidasLocales;
                            }
                        }
                        inventarioFiltrado[codigo] = { 
                            codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, 
                            ultimaCompra: fechaCompra, 
                            ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', 
                            nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : generarNombreUtil(desc),
                            ingresoManual: mIngreso,
                            salidasLocales: mSalidas
                        };
                    } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {"""

# 3. Agregando las columnas nuevas al Thead
target_thead = """                        <th>Ubicación</th>
                        <th>Cant.</th>
                        <th class="sol-col" title="Fecha solicitud - Origen">Solicitud<br><span class="text-[10px] text-gray-500 font-normal">Origen</span></th>"""

replacement_thead = """                        <th>Ubicación</th>
                        <th title="Ingreso manual (Cantidad / Fecha)">Ing. Manual</th>
                        <th>Cant.</th>
                        <th class="sol-col" title="Fecha solicitud - Origen">Solicitud<br><span class="text-[10px] text-gray-500 font-normal">Origen</span></th>"""

target_thead2 = """                        <th class="proj-col hidden print:table-cell">Proyección Sig. Compra</th>
                    </tr>"""

replacement_thead2 = """                        <th class="proj-col hidden print:table-cell">Proyección Sig. Compra</th>
                        <th class="text-center bg-red-50 text-red-800" title="Salidas Rápidas (Bypass)">🏃 Salidas</th>
                    </tr>"""

# 4. Agregando las celdas al Tbody
target_tbody = """                    <td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-full min-w-[100px] border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>
                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>
                    
                    <td class="sol-col p-2 text-center text-xs"><b>${formatFechaCorto(solFecha)}</b><br><span class="text-[10px] text-gray-500 font-semibold">${solOrigen}</span></td>"""

replacement_tbody = """                    <td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-full min-w-[100px] border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>
                    
                    <td class="text-center p-1 cursor-pointer hover:bg-yellow-50 min-w-[60px]" onclick="abrirModalIngreso('${inv.codigo}')">
                        ${inv.ingresoManual ? `<span class="font-bold text-green-700 text-xs">${inv.ingresoManual.cantidad}</span><br><span class="text-[9px] text-gray-500">${inv.ingresoManual.fecha}</span>` : `<span class="text-[10px] text-gray-300 italic">Clic</span>`}
                    </td>

                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>
                    
                    <td class="sol-col p-2 text-center text-xs"><b>${formatFechaCorto(solFecha)}</b><br><span class="text-[10px] text-gray-500 font-semibold">${solOrigen}</span></td>"""

target_tbody2 = """                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight no-print" data-val="${proyeccionMs||0}">${proyeccionTexto}</td>
                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight hidden print:table-cell">${proyeccionTexto}</td>
                `;"""

replacement_tbody2 = """                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight no-print" data-val="${proyeccionMs||0}">${proyeccionTexto}</td>
                    <td class="proj-col text-[10px] whitespace-normal max-w-[100px] leading-tight hidden print:table-cell">${proyeccionTexto}</td>
                    
                    <td class="text-center p-1 w-20 bg-red-50">
                        <div class="flex items-center justify-between gap-1 w-full relative">
                            <button class="bg-red-500 hover:bg-red-600 text-white rounded w-5 h-5 text-sm font-bold flex items-center justify-center -mt-0.5" onclick="abrirModalSalidaLocal('${inv.codigo}')" title="Registrar una salida">-</button>
                            <span class="font-bold text-gray-800 text-xs cursor-pointer px-1 block w-full text-center hover:bg-red-200 rounded" onclick="verHistorialSalidasLocales('${inv.codigo}')" title="Ver devoluciones / historial">${inv.salidasLocales ? inv.salidasLocales.reduce((acc, s) => acc + s.cantidad, 0) : 0}</span>
                            <button class="bg-gray-400 hover:bg-gray-500 text-white rounded w-5 h-5 text-xs font-bold flex items-center justify-center -mt-0.5" onclick="corregirSalidaLocal('${inv.codigo}')" title="Revertir (Eliminar última salida)">+</button>
                        </div>
                    </td>
                `;"""

# Appending Modals to the body
target_modals_end = """    <!-- MODAL DETALLE -->"""

replacement_modals_end = """
    <!-- MODAL INGRESO MANUAL -->
    <div id="modalIngresoManual" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hidden">
        <div class="bg-white rounded p-4 w-96 shadow-lg">
            <h3 class="text-lg font-bold text-gray-800 mb-4" id="tituloModalIngreso">Ingreso Manual</h3>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a ingresar</label>
            <input type="number" id="inputIngresoCant" class="w-full border rounded p-2 mb-3" min="1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" id="inputIngresoFecha" class="w-full border rounded p-2 mb-4">
            
            <div class="flex justify-end gap-2">
                <button class="px-4 py-2 bg-gray-300 rounded text-gray-800 font-bold hover:bg-gray-400" onclick="cerrarModalIngreso()">Cancelar</button>
                <button class="px-4 py-2 bg-blue-600 rounded text-white font-bold hover:bg-blue-700" onclick="guardarIngresoManual()">Guardar</button>
            </div>
            <div class="mt-4 text-center">
                <button class="text-red-500 text-xs hover:underline" onclick="borrarIngresoManual()">Borrar Ingreso Actual</button>
            </div>
        </div>
    </div>

    <!-- MODAL SALIDA RÁPIDA -->
    <div id="modalSalidaRapida" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hidden">
        <div class="bg-white rounded p-4 w-96 shadow-lg">
            <h3 class="text-lg font-bold text-red-600 mb-4" id="tituloModalSalida">Registrar Salida Rápida (-1)</h3>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Máquina</label>
            <input type="text" id="inputSalidaMaquina" class="w-full border rounded p-2 mb-3 uppercase" placeholder="Ej. LÍNEA 1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Sección</label>
            <input type="text" id="inputSalidaSeccion" class="w-full border rounded p-2 mb-4 uppercase" placeholder="Ej. EMPAQUE">
            
            <div class="flex justify-end gap-2">
                <button class="px-4 py-2 bg-gray-300 rounded text-gray-800 font-bold hover:bg-gray-400" onclick="cerrarModalSalida()">Cancelar</button>
                <button class="px-4 py-2 bg-red-600 rounded text-white font-bold hover:bg-red-700" onclick="guardarSalidaRapida()">Registrar Salida</button>
            </div>
        </div>
    </div>

    <!-- MODAL DETALLE -->"""

# Appending JavaScript functionality at the VERY END of JS script Block
target_js_end = """        });
    </script>"""

replacement_js_end = """
        // ======================= COMPONENTES CONTROL DE INVENTARIO LOCAL =====================
        let currentItemForIngreso = null;
        function abrirModalIngreso(codigo) {
            if(!isBodeguero) { alert("Solo modo bodeguero permite estas modificaciones."); return; }
            currentItemForIngreso = codigo;
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            document.getElementById('tituloModalIngreso').innerText = `Ingreso: ${codigo}`;
            if (row && row.inv.ingresoManual) {
                document.getElementById('inputIngresoCant').value = row.inv.ingresoManual.cantidad;
                document.getElementById('inputIngresoFecha').value = row.inv.ingresoManual.fecha;
            } else {
                document.getElementById('inputIngresoCant').value = "";
                document.getElementById('inputIngresoFecha').value = new Date().toISOString().slice(0, 10);
            }
            document.getElementById('modalIngresoManual').classList.remove('hidden');
        }

        function cerrarModalIngreso() {
            document.getElementById('modalIngresoManual').classList.add('hidden');
            currentItemForIngreso = null;
        }

        function guardarIngresoManual() {
            const cant = document.getElementById('inputIngresoCant').value;
            const f = document.getElementById('inputIngresoFecha').value;
            if(!cant || !f) { alert("Rellene cantidad y fecha"); return; }
            
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForIngreso);
            if(row) {
                row.inv.ingresoManual = { cantidad: parseFloat(cant), fecha: formatFechaCorto(new Date(f).getTime()) };
                // Also format properly keeping standard text
            }
            procesarGuardadoLocalRapido();
            cerrarModalIngreso();
        }

        function borrarIngresoManual() {
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForIngreso);
            if(row) { row.inv.ingresoManual = null; }
            procesarGuardadoLocalRapido();
            cerrarModalIngreso();
        }

        let currentItemForSalida = null;
        function abrirModalSalidaLocal(codigo) {
            currentItemForSalida = codigo;
            document.getElementById('tituloModalSalida').innerText = `Registrar 1 Salida: ${codigo}`;
            // Optional: Inherit last used machine/section from globals? 
            document.getElementById('inputSalidaMaquina').value = document.getElementById('globalMaquina')?.value || "";
            document.getElementById('inputSalidaSeccion').value = document.getElementById('globalSeccion')?.value || "";
            document.getElementById('modalSalidaRapida').classList.remove('hidden');
            setTimeout(() => document.getElementById('inputSalidaMaquina').focus(), 100);
        }

        function cerrarModalSalida() {
            document.getElementById('modalSalidaRapida').classList.add('hidden');
            currentItemForSalida = null;
        }

        function guardarSalidaRapida() {
            const maq = document.getElementById('inputSalidaMaquina').value.trim().toUpperCase() || 'S/D';
            const sec = document.getElementById('inputSalidaSeccion').value.trim().toUpperCase() || 'S/D';
            
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForSalida);
            if(row) {
                if(!row.inv.salidasLocales) row.inv.salidasLocales = [];
                row.inv.salidasLocales.push({
                    cantidad: 1,
                    maquina: maq,
                    seccion: sec,
                    timestamp: new Date().getTime()
                });
            }
            procesarGuardadoLocalRapido();
            cerrarModalSalida();
        }

        function corregirSalidaLocal(codigo) {
            if(!confirm("¿Desea revertir (eliminar) la ÚLTIMA salida registrada de este ítem?")) return;
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            if(row && row.inv.salidasLocales && row.inv.salidasLocales.length > 0) {
                row.inv.salidasLocales.pop(); // removes last entry
                procesarGuardadoLocalRapido();
            } else {
                alert("No hay salidas locales para revertir.");
            }
        }

        function verHistorialSalidasLocales(codigo) {
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            if(row && row.inv.salidasLocales && row.inv.salidasLocales.length > 0) {
                let msg = `Historial Salidas Locales (Bypass) - ${codigo}\\n\\n`;
                row.inv.salidasLocales.forEach(s => {
                    msg += `- 1 unidad -> Máq: ${s.maquina} | Sec: ${s.seccion} (${new Date(s.timestamp).toLocaleString()})\\n`;
                });
                msg += `\\n(Estas salidas se limpian auto cuando subes un CSV actualizado que asiente la cantidad final)`;
                alert(msg);
            } else {
                alert("No hay salidas registradas localmente en bypass.");
            }
        }

        async function procesarGuardadoLocalRapido() {
            const setGrupos = new Set();
            const setMaquinas = new Set();
            TODOS_LOS_DATOS.forEach(d => { setGrupos.add(d.inv.grupo); if(d.maquinasUnicas) d.maquinasUnicas.split(', ').forEach(m => setMaquinas.add(m)); });
            
            await guardarDatos({ resultadosTabla: TODOS_LOS_DATOS, gruposUnicos: Array.from(setGrupos), maquinasUnicas: Array.from(setMaquinas) });
            // Re-render
            const currentT = document.getElementById('tableBody');
            currentT.innerHTML = "";
            renderizarBloqueTabla();
        }

        });
    </script>"""

text = text.replace(target_meta, replacement_meta)
text = text.replace(target_inv, replacement_inv)
text = text.replace(target_thead, replacement_thead)
text = text.replace(target_thead2, replacement_thead2)
text = text.replace(target_tbody, replacement_tbody)
text = text.replace(target_tbody2, replacement_tbody2)
text = text.replace(target_modals_end, replacement_modals_end)
text = text.replace(target_js_end, replacement_js_end)

with open(filePath, 'w', encoding='utf-8') as f:
    f.write(text)

print("HTML Patched with Local Inventory Features")
