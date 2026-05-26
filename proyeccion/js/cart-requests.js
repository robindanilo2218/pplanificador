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
    if (existing = existente) {
        existing.cant += parseFloat(cant);
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
        
        const q = fila.qConsumo || [null, null, null, null, null];
        document.getElementById('detQ0').innerText = formatQ(q[0]);
        document.getElementById('detQ1').innerText = formatQ(q[1]);
        document.getElementById('detQ2').innerText = formatQ(q[2]);
        document.getElementById('detQ3').innerText = formatQ(q[3]);
        document.getElementById('detQ4').innerText = formatQ(q[4]);
        
        const elMaquinas = document.getElementById('detMaquinas');
        if (elMaquinas) elMaquinas.innerText = fila.maquinasUnicas;

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

        imagenesDetalleActuales = await obtenerImagenesRepuesto(fila.inv.codigo, fila.inv.noParte, true);
        indiceImagenDetalle = 0;
        mostrarImagenDetalle();

        document.getElementById('modalDetalle').classList.remove('hidden');
        if (typeof actualizarBotonIgnoradoModal === 'function') actualizarBotonIgnoradoModal(fila.inv.codigo);
        
        const lst = document.getElementById('lstCodigosDetalle');
        if (lst && typeof TODOS_LOS_DATOS !== 'undefined' && lst.children.length === 0) {
            lst.innerHTML = TODOS_LOS_DATOS.map(x => `<option value="${x.inv.codigo}">${x.inv.descripcion.substring(0, 50)}...</option>`).join('');
        }
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

function obtenerHtmlDetalleNuevoRepuesto(it) {
    if (!it.esNuevo) return '';
    const urg = it.urgencia || 'Normal';
    let urgBadge = '';
    if (urg === 'Critico') {
        urgBadge = `<span style="background-color:#fee2e2;color:#991b1b;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;border:1px solid #fecaca;display:inline-block;vertical-align:middle;">🔴 CRÍTICO</span>`;
    } else if (urg === 'Urgente') {
        urgBadge = `<span style="background-color:#fef9c3;color:#854d0e;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;border:1px solid #fef08a;display:inline-block;vertical-align:middle;">⚡ URGENTE</span>`;
    } else {
        urgBadge = `<span style="background-color:#eff6ff;color:#1e40af;font-size:10px;font-weight:semibold;padding:2px 6px;border-radius:4px;border:1px solid #bfdbfe;display:inline-block;vertical-align:middle;">Normal</span>`;
    }

    const obsText = it.observaciones || '';
    const maqText = it.maquina || '-';
    const secText = it.seccion || '-';

    return `
    <div style="margin-top:6px; padding:8px; background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; font-size:11px; color:#166534; line-height:1.4;">
        <strong>💡 Solicitud de Primera Vez (Repuesto Nuevo):</strong><br>
        • <b>Urgencia:</b> ${urgBadge}<br>
        • <b>Máquina/Destino:</b> <span style="color:#111827; font-weight:bold;">${maqText}</span> | <b>Sección:</b> <span style="color:#111827; font-weight:bold;">${secText}</span>
        ${obsText ? `<br>• <b>Observaciones / Dónde se usa:</b> <span style="color:#374151; font-style:italic;">${obsText}</span>` : ''}
    </div>`;
}

function obtenerTextoDetalleNuevoRepuesto(it, sangria = '    ') {
    if (!it.esNuevo) return '';
    const urg = it.urgencia || 'Normal';
    const obsStr = it.observaciones ? ` | Obs: ${it.observaciones}` : '';
    return `\n${sangria}↳ [SOLICITUD PRIMERA VEZ] Urgencia: ${urg.toUpperCase()} | Destino: ${it.maquina || '-'} - ${it.seccion || '-'}${obsStr}`;
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

        if (it.esNuevo) {
            const urg = it.urgencia || 'Normal';
            let urgBadge = '';
            if (urg === 'Critico') {
                urgBadge = `<span style="background-color:#fee2e2; color:#991b1b; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #fecaca; font-size:9px;">🔴 CRÍTICO</span>`;
            } else if (urg === 'Urgente') {
                urgBadge = `<span style="background-color:#fef9c3; color:#854d0e; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #fef08a; font-size:9px;">⚡ URGENTE</span>`;
            } else {
                urgBadge = `<span style="background-color:#eff6ff; color:#1e40af; font-weight:semibold; padding:2px 6px; border-radius:4px; border:1px solid #bfdbfe; font-size:9px;">Normal</span>`;
            }

            const obsText = it.observaciones || '';
            const maqText = it.maquina || '-';
            const secText = it.seccion || '-';

            html += `<tr><td colspan="4" style="border: 1px solid #ccc; border-top: none; padding: 6px 12px; background-color: #f9fafb; font-size: 10px; color: #374151; line-height: 1.5;">
                        <div style="margin-bottom: 2px;">💡 <strong style="color: #059669;">Solicitud de Primera Vez (Repuesto Nuevo)</strong></div>
                        <div style="margin-bottom: 2px;">
                            <strong>Urgencia:</strong> ${urgBadge} &nbsp;|&nbsp; 
                            <strong>Máquina/Destino:</strong> <span style="color:#111827; font-weight:bold;">${maqText}</span> &nbsp;|&nbsp; 
                            <strong>Sección:</strong> <span style="color:#111827; font-weight:bold;">${secText}</span>
                        </div>
                        ${obsText ? `<div style="margin-top: 2px; color:#4b5563; font-style:italic;"><strong>Observaciones / Dónde se usa:</strong> ${obsText}</div>` : ''}
                    </td></tr>`;
        }

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
    ['nrDescripcion', 'nrNoParte', 'nrObservaciones'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const cantEl = document.getElementById('nrCantidad');
    if (cantEl) cantEl.value = '1';
    const urgEl = document.getElementById('nrUrgencia');
    if (urgEl) urgEl.value = 'Normal';
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

    const urgTag = urgencia === 'Critico' ? '🔴 ' : urgencia === 'Urgente' ? '⚡ ' : '';
    const descFull = obs ? `${desc.toUpperCase()} | OBS: ${obs}` : desc.toUpperCase();

    carrito.push({
        codigo: 'NUEVO-REGISTRO',
        noParte: noParte,
        descripcion: descFull,
        nombreUtil: `${urgTag}Solicitud Primera Vez`,
        urgencia: urgencia,
        maquina: maquina,
        seccion: seccion,
        observaciones: obs,
        cant: cant,
        esNuevo: true
    });

    guardarCarritoLocal();
    actualizarMiniCarrito();
    actualizarBadgeCarrito();
    cerrarModalNuevoRepuesto();

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
                            ${items.map((it, idx) => {
                                const newInfo = obtenerHtmlDetalleNuevoRepuesto(it);
                                return `<tr><td>${idx + 1}</td><td><b>${it.codigo}</b><br><span style="font-size:10px;">${it.noParte || ''}</span></td><td>${it.descripcion}${it.nombreUtil ? `<br><span style="font-size:10px;color:#059669;">${it.nombreUtil}</span>` : ''}${newInfo}</td><td style="text-align:center;font-weight:bold;color:#d97706;">${it.cant}</td></tr>`;
                            }).join('')}
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

            const obsText = item.observaciones ? `<br><span class="text-[10px] text-gray-500 italic"><b>Obs:</b> ${item.observaciones}</span>` : '';
            return `
                    <tr class="${rowClass}">
                        <td class="px-4 py-2">${codigoBadge}${urgBadge}</td>
                        <td class="px-4 py-2 text-xs font-semibold">${item.descripcion}${nombreUtilBadge}${maqInfo}${obsText}</td>
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
            descWithUrg += obtenerTextoDetalleNuevoRepuesto(it, '    ');
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

            const newInfoHtml = obtenerHtmlDetalleNuevoRepuesto(it);

            return `<tr>
                <td>${i + 1}</td>
                <td><b>${it.codigo}</b><br><small>${it.noParte || ''}</small></td>
                <td>${it.descripcion}${it.nombreUtil ? `<br><small style="color:#059669;">${it.nombreUtil}</small>` : ''}${urgHtml}${statsHtml}${newInfoHtml}</td>
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

    const pad = (str, len) => {
        const s = String(str ?? '-').replace(/\r?\n/g, ' ');
        return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
    };

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
            mainRow += obtenerTextoDetalleNuevoRepuesto(it, '     ');
            return mainRow;
        }).join('\n');

        cuerpoTexto =
            `Buen día,\n\n` +
            `${encabezado}\n${header}\n${divider}\n${filas}\n${SEP}\n\n` +
            `Total ítems: ${items.length}\n\nSaludos,\n${gTec || 'Depto. Eléctrico'}`;
    } else {
        cuerpoTexto =
            `Buen día,\n\n` +
            `${encabezado}\n\n` +
            `>>> PEGAR TABLA AQUÍ — presiona CTRL+V en el cuerpo del correo <<<\n\n` +
            `Total ítems: ${items.length}\n\nSaludos,\n${gTec || 'Depto. Eléctrico'}`;
    }

    const cuerpoBase = encodeURIComponent(cuerpoTexto);
    const mailtoUrl = `mailto:${destinatario}?cc=${copia}&subject=${asunto}&body=${cuerpoBase}`;

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
                                    <td class="px-4 py-2"><span class="font-mono text-blue-600 font-bold">${f.it.codigo}</span><br>${f.it.descripcion}${f.it.observaciones ? `<br><span class="text-[10px] text-gray-500 italic"><b>Obs:</b> ${f.it.observaciones}</span>` : ''}</td>
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

// ── Event Listeners ─────────────────────────────────────
document.getElementById('btnImprimirPdf').addEventListener('click', () => {
    const enSencilla = !document.getElementById('vistaSencilla').classList.contains('hidden');
    if (enSencilla) {
        generarPdfVistaSencilla();
    } else {
        generarPdfVistaDetallada();
    }
});

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
