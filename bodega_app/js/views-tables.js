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

// ── Salidas Locales (Bypass) ───────────────────────────
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

    inv.cantidad = Math.max(0, (inv.cantidad || 0) - 1);

    procesarGuardadoLocalRapido();
    cerrarModalSalida();

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
