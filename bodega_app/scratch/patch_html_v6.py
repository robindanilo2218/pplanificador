import re

filePath = "index.html"
with open(filePath, 'r', encoding='utf-8') as f:
    text = f.read()

def replace_or_fail(target, replacement, text):
    if target not in text:
        # Fallback to regex spacing
        t_normalized = re.sub(r'\\s+', r'\\s+', re.escape(target))
        match = re.search(t_normalized, text)
        if match:
            return text[:match.start()] + replacement + text[match.end():]
        print(f"FAILED TO FIND:\\n{target}\\n")
        return text
    return text.replace(target, replacement)

# 1. Agregando propiedades al metaDatos (persistence check)
target_meta = """if(oldData && oldData.resultadosTabla) {
                    oldData.resultadosTabla.forEach(f => {
                        metaDatos[f.inv.codigo] = { ubicacion: f.inv.ubicacion || '', nombreUtil: f.inv.nombreUtil || '' };
                    });
                }"""

replacement_meta = """if(oldData && oldData.resultadosTabla) {
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
target_inv = """if (!inventarioFiltrado[codigo]) {
                            inventarioFiltrado[codigo] = { codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, ultimaCompra: fechaCompra, ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : generarNombreUtil(desc) };
                        } else if"""

replacement_inv = """if (!inventarioFiltrado[codigo]) {
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
                                nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : generarNombreUtil(desc),
                                ingresoManual: mIngreso,
                                salidasLocales: mSalidas
                            };
                        } else if"""

# 3. Thead1
target_thead = """                        <th>Ubicación</th>
                        <th>Cant.</th>
                        <th class="sol-col" title="Fecha solicitud - Origen">Solicitud<br><span class="text-[10px] text-gray-500 font-normal">Origen</span></th>"""

replacement_thead = """                        <th>Ubicación</th>
                        <th title="Ingreso manual (Cantidad / Fecha)" class="bg-green-50 w-20">Ing. Manual</th>
                        <th>Cant.</th>
                        <th class="sol-col" title="Fecha solicitud - Origen">Solicitud<br><span class="text-[10px] text-gray-500 font-normal">Origen</span></th>"""

# Thead2
target_thead2 = """                        <th class="proj-col hidden print:table-cell">Proyección Sig. Compra</th>
                    </tr>"""

replacement_thead2 = """                        <th class="proj-col hidden print:table-cell">Proyección Sig. Compra</th>
                        <th class="text-center bg-red-50 text-red-800" title="Salidas Rápidas (Bypass)">🏃 Salidas</th>
                    </tr>"""

# 4. Tbody
target_tbody = """                    <td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-full min-w-[100px] border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>
                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>"""

replacement_tbody = """                    <td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-full min-w-[100px] border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>
                    
                    <td class="text-center p-1 cursor-pointer hover:bg-green-100 min-w-[60px] bg-green-50/50" onclick="abrirModalIngreso('${inv.codigo}')">
                        ${inv.ingresoManual ? `<span class="font-bold text-green-700 text-xs">${inv.ingresoManual.cantidad}</span><br><span class="text-[9px] text-gray-500">${inv.ingresoManual.fecha}</span>` : `<span class="text-[10px] text-gray-400 italic">Clic...</span>`}
                    </td>

                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>"""

# Tbody2
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

# 5. Modals (add before <!-- MODAL DETALLE -->)
target_modals_end = """<!-- MODAL DETALLE -->"""

replacement_modals_end = """<!-- MODAL INGRESO MANUAL -->
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

# 6. JS functions (add before </body>)
target_js_end = """        });
    </script>"""

replacement_js_end = """        // --- COMPONENTES CONTROL DE INVENTARIO LOCAL ---
        let currentItemForIngreso = null;
        window.abrirModalIngreso = function(codigo) {
            if(!isBodeguero) { alert("Solo modo bodeguero permite estas modificaciones."); return; }
            currentItemForIngreso = codigo;
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            document.getElementById('tituloModalIngreso').innerText = `Ingreso: ${codigo}`;
            if (row && row.inv.ingresoManual) {
                document.getElementById('inputIngresoCant').value = row.inv.ingresoManual.cantidad;
                let parsedDate = new Date(row.inv.ingresoManual.fecha.split('/').reverse().join('-'));
                document.getElementById('inputIngresoFecha').value = isNaN(parsedDate) ? new Date().toISOString().slice(0,10) : parsedDate.toISOString().slice(0, 10);
            } else {
                document.getElementById('inputIngresoCant').value = "";
                document.getElementById('inputIngresoFecha').value = new Date().toISOString().slice(0, 10);
            }
            document.getElementById('modalIngresoManual').classList.remove('hidden');
        };

        window.cerrarModalIngreso = function() {
            document.getElementById('modalIngresoManual').classList.add('hidden');
            currentItemForIngreso = null;
        };

        window.guardarIngresoManual = function() {
            const cant = document.getElementById('inputIngresoCant').value;
            const f = document.getElementById('inputIngresoFecha').value;
            if(!cant || !f) { alert("Rellene cantidad y fecha"); return; }
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForIngreso);
            if(row) {
                row.inv.ingresoManual = { cantidad: parseFloat(cant), fecha: formatFechaCorto(new Date(f).getTime() + 86400000) }; // +1 day fix timezone offset
            }
            procesarGuardadoLocalRapido();
            cerrarModalIngreso();
        };

        window.borrarIngresoManual = function() {
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForIngreso);
            if(row) { row.inv.ingresoManual = null; }
            procesarGuardadoLocalRapido();
            cerrarModalIngreso();
        };

        let currentItemForSalida = null;
        window.abrirModalSalidaLocal = function(codigo) {
            currentItemForSalida = codigo;
            document.getElementById('tituloModalSalida').innerText = `Registrar 1 Salida: ${codigo}`;
            document.getElementById('inputSalidaMaquina').value = document.getElementById('globalMaquina')?.value || "";
            document.getElementById('inputSalidaSeccion').value = document.getElementById('globalSeccion')?.value || "";
            document.getElementById('modalSalidaRapida').classList.remove('hidden');
            setTimeout(() => document.getElementById('inputSalidaMaquina').focus(), 100);
        };

        window.cerrarModalSalida = function() {
            document.getElementById('modalSalidaRapida').classList.add('hidden');
            currentItemForSalida = null;
        };

        window.guardarSalidaRapida = function() {
            const maq = document.getElementById('inputSalidaMaquina').value.trim().toUpperCase() || 'S/D';
            const sec = document.getElementById('inputSalidaSeccion').value.trim().toUpperCase() || 'S/D';
            
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === currentItemForSalida);
            if(row) {
                if(!row.inv.salidasLocales) row.inv.salidasLocales = [];
                row.inv.salidasLocales.push({ cantidad: 1, maquina: maq, seccion: sec, timestamp: new Date().getTime() });
            }
            procesarGuardadoLocalRapido();
            cerrarModalSalida();
        };

        window.corregirSalidaLocal = function(codigo) {
            if(!confirm("¿Desea revertir (eliminar) la ÚLTIMA salida registrada en local de este ítem?")) return;
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            if(row && row.inv.salidasLocales && row.inv.salidasLocales.length > 0) {
                row.inv.salidasLocales.pop(); 
                procesarGuardadoLocalRapido();
            } else {
                alert("No hay salidas locales para revertir.");
            }
        };

        window.verHistorialSalidasLocales = function(codigo) {
            const row = TODOS_LOS_DATOS.find(d => d.inv.codigo === codigo);
            if(row && row.inv.salidasLocales && row.inv.salidasLocales.length > 0) {
                let msg = `Historial de Salidas Bypass - [${codigo}]\\n\\n`;
                row.inv.salidasLocales.forEach(s => {
                    msg += `- 1 unidad -> Máq: ${s.maquina} | Sec: ${s.seccion} (${new Date(s.timestamp).toLocaleString()})\\n`;
                });
                msg += `\\n(Estas salidas se limpiarán automáticamente al subir el CSV actualizado que descuente el stock real)`;
                alert(msg);
            } else {
                alert("No hay salidas registradas localmente.");
            }
        };

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

text = replace_or_fail(target_meta, replacement_meta, text)
text = replace_or_fail(target_inv, replacement_inv, text)
text = replace_or_fail(target_thead, replacement_thead, text)
text = replace_or_fail(target_thead2, replacement_thead2, text)
text = replace_or_fail(target_tbody, replacement_tbody, text)
text = replace_or_fail(target_tbody2, replacement_tbody2, text)
text = replace_or_fail(target_modals_end, replacement_modals_end, text)
text = replace_or_fail(target_js_end, replacement_js_end, text)

with open(filePath, 'w', encoding='utf-8') as f:
    f.write(text)

print("HTML Patched with STRICT mode.")
