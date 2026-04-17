
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
                    navigator.serviceWorker.register('./sw.js').catch(err => console.error('Error PWA:', err));
                }
            });
        }

        const codeRegex = /^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$/;
        
        // --- BASE DE DATOS LOCAL ---
        const DB_NAME = 'BodegaDB';
        const STORE_ANALISIS = 'analisisStore';
        const STORE_HISTORIAL = 'historialStore';

        function initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 3);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_ANALISIS)) db.createObjectStore(STORE_ANALISIS);
                    if (!db.objectStoreNames.contains(STORE_HISTORIAL)) db.createObjectStore(STORE_HISTORIAL, { keyPath: 'id_solicitud' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        // --- SISTEMA DE CARRITO, HISTORIAL Y PDF ---
        let carrito = [];
        let itemActualSeleccionado = null; 

        async function guardarCompraEnHistorial(solicitudId, items) {
            try {
                const db = await initDB();
                const tx = db.transaction(STORE_HISTORIAL, 'readwrite');
                const store = tx.objectStore(STORE_HISTORIAL);
                store.put({ id_solicitud: solicitudId, fecha_log: new Date().getTime(), items: items });
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

        const formatQ = (val) => val !== null && val !== undefined ? Math.round(val) : '-';
        function formatFechaCorto(timestamp) {
            if (!timestamp || isNaN(timestamp)) return "-"; 
            const d = new Date(timestamp);
            if (isNaN(d.getTime())) return "-";
            const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
            return localDate.toLocaleDateString('es-GT');
        }

        function abrirModalDetalle(fila) {
            itemActualSeleccionado = fila;
            document.getElementById('detDesc').innerText = fila.inv.descripcion;
            document.getElementById('detCodigo').innerText = `COD: ${fila.inv.codigo} | PN: ${fila.inv.noParte || '-'}`;
            document.getElementById('detStock').innerText = fila.inv.cantidad;
            document.getElementById('detEstado').innerHTML = `<span class="badge ${fila.estadoClase} text-xs shadow-sm">${fila.estado}</span>`;
            document.getElementById('detDemanda').innerText = fila.demandaAnual !== null ? fila.demandaAnual : "N/A";
            document.getElementById('detProyeccion').innerText = fila.proyeccionTexto;
            document.getElementById('detPrimeraSalida').innerText = formatFechaCorto(fila.primeraSalida);
            document.getElementById('detUltimaSalida').innerText = formatFechaCorto(fila.ultimaSalida);
            document.getElementById('detQ0').innerText = formatQ(fila.qConsumo[0]);
            document.getElementById('detQ1').innerText = formatQ(fila.qConsumo[1]);
            document.getElementById('detQ2').innerText = formatQ(fila.qConsumo[2]);
            document.getElementById('detQ3').innerText = formatQ(fila.qConsumo[3]);
            document.getElementById('detQ4').innerText = formatQ(fila.qConsumo[4]);
            document.getElementById('detMaquinas').innerText = fila.maquinasUnicas;

            document.getElementById('inpCant').value = 1;
            document.getElementById('inpMaquina').value = '';
            document.getElementById('inpSerie').value = '';
            document.getElementById('inpModelo').value = '';
            document.getElementById('inpSeccion').value = '';
            document.getElementById('inpTecnico').value = '';
            document.getElementById('inpFechaSug').value = new Date().toISOString().split('T')[0];

            document.getElementById('modalDetalle').classList.remove('hidden');
            setTimeout(() => document.getElementById('inpCant').focus(), 100);
        }

        function cerrarModalDetalle() { document.getElementById('modalDetalle').classList.add('hidden'); itemActualSeleccionado = null; }

        function actualizarBadgeCarrito() {
            const badge = document.getElementById('cartBadge');
            if(carrito.length > 0) { badge.innerText = carrito.length; badge.classList.remove('hidden'); } 
            else { badge.classList.add('hidden'); }
        }

        function agregarAlCarrito() {
            if(!itemActualSeleccionado) return;
            const cant = parseFloat(document.getElementById('inpCant').value);
            const maq = document.getElementById('inpMaquina').value.trim();
            const sec = document.getElementById('inpSeccion').value.trim() || "-";

            if(isNaN(cant) || cant <= 0) { alert("Ingrese una cantidad válida."); return; }
            if(!maq) { alert("Especifique la máquina o destino."); return; }

            carrito.push({
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
            });

            actualizarBadgeCarrito();
            cerrarModalDetalle();
        }

        function abrirCarrito() {
            const contenedor = document.getElementById('contenedorItemsCarrito');
            if(carrito.length === 0) {
                contenedor.innerHTML = '<p class="text-center text-gray-500 my-10">El carrito está vacío.</p>';
            } else {
                contenedor.innerHTML = `
                    <div class="overflow-x-auto border rounded bg-white shadow-sm">
                        <table class="min-w-full text-sm text-left">
                            <thead class="bg-gray-100 text-gray-700">
                                <tr>
                                    <th class="px-4 py-2 border-b">Código</th>
                                    <th class="px-4 py-2 border-b">Descripción</th>
                                    <th class="px-4 py-2 border-b text-center">Cant.</th>
                                    <th class="px-4 py-2 border-b">Destino (Sección)</th>
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
                                        <td class="px-4 py-2 text-center">
                                            <button onclick="eliminarDelCarrito(${index})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 px-2 rounded transition" title="Eliminar">❌</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            document.getElementById('modalCarrito').classList.remove('hidden');
        }

        function cerrarCarrito() { document.getElementById('modalCarrito').classList.add('hidden'); }
        function eliminarDelCarrito(index) { carrito.splice(index, 1); actualizarBadgeCarrito(); abrirCarrito(); }
        function vaciarCarrito() { if(confirm("¿Seguro que deseas vaciar todo el carrito?")) { carrito = []; actualizarBadgeCarrito(); abrirCarrito(); } }

        // --- GENERADOR DE PDF (NUEVA FUNCIÓN) ---
        function generarPdfCarrito() {
            if(carrito.length === 0) return alert("El carrito está vacío. Añade repuestos primero.");
            
            const d = new Date();
            const idSol = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + 
                          d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') + 
                          d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');

            // Crear el div oculto para el formato del PDF
            let printDiv = document.createElement('div');
            printDiv.id = 'cartPrintArea';
            printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 20px;">
                    <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
                        <h1 style="color: #1e3a8a; font-size: 24px; margin:0;">EMPRESAS GALINDO</h1>
                        <h2 style="font-size: 16px; margin: 5px 0 0 0; color:#555;">SOLICITUD TÉCNICA - DEPTO. ELÉCTRICO</h2>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size:14px;">
                        <div><strong>No. Solicitud:</strong> ${idSol}</div>
                        <div><strong>Fecha:</strong> ${new Date().toLocaleString('es-GT')}</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background-color: #f3f4f6; text-align: left;">
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">#</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Código / Parte</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Descripción</th>
                                <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">Cant.</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Máquina / Sección</th>
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
                                </tr>
                            `).join('')}
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
            
            window.print(); // Abre el diálogo nativo de PDF/Impresora
            
            // Limpieza
            document.body.classList.remove('printing-cart');
            document.body.removeChild(printDiv);
        }

        async function procesarSolicitudEmail() {
            if(carrito.length === 0) return alert("No hay items en el carrito.");

            const d = new Date();
            const idSol = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + 
                          d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') + 
                          d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');

            const destinatario = "dorozco@empresasgalindo.com";
            const copia = "electrico.cogusa@empresasgalindo.com";
            const asunto = encodeURIComponent(`SOLICITUD DE COMPRA REPUESTOS #${idSol} - DEPTO ELECTRICO`);

            let tablaHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; font-size: 12px; border: 1px solid #ccc; padding: 15px;">
                    <h2 style="color:#1e3a8a; margin-top:0;">SOLICITUD DE REPUESTOS #${idSol}</h2>
                    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
                        <thead style="background-color: #f3f4f6; color: #1f2937;">
                            <tr>
                                <th>#</th><th>Código / Parte</th><th>Descripción</th><th style="text-align: center;">Cant.</th>
                                <th>Máquina / Sección</th><th>Serie / Modelo</th><th>F. Sugerida</th><th>Técnico</th>
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
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            try {
                await guardarCompraEnHistorial(idSol, carrito);

                const htmlBlob = new Blob([tablaHtml], { type: 'text/html' });
                const textBlob = new Blob(["Pega aquí con CTRL+V la tabla."], { type: 'text/plain' });
                await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);

                alert(`✅ Solicitud #${idSol} generada y copiada al portapapeles.\n\nAl abrirse el correo, haz clic en el cuerpo y presiona CTRL + V.\n\n(También puedes usar el botón de 'Descargar PDF' y adjuntarlo si lo prefieres)`);
            } catch (err) {
                alert("No se pudo copiar automáticamente al portapapeles, pero se guardó en el historial. Puedes usar la opción de PDF al abrir el correo.");
            } finally {
                let cuerpoBase = encodeURIComponent(`David,\n\nAdjunto solicitud de compra #${idSol} para mantenimiento:\n\n[PRESIONA CTRL + V AQUÍ PARA PEGAR LA TABLA O ADJUNTA EL PDF]\n\nSaludos.`);
                window.location.href = `mailto:${destinatario}?cc=${copia}&subject=${asunto}&body=${cuerpoBase}`;

                carrito = []; actualizarBadgeCarrito(); cerrarCarrito();
            }
        }

        // --- RENDERIZADO DEL HISTORIAL ---
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
            if(selMaq.options.length <= 1) {
                const maqs = new Set();
                data.forEach(sol => sol.items.forEach(it => maqs.add(it.maquina)));
                [...maqs].sort().forEach(m => selMaq.innerHTML += `<option value="${m}">${m}</option>`);
            }

            if(data.length === 0) { cont.innerHTML = '<p class="text-center text-gray-500 py-10">No hay historial de compras.</p>'; return; }

            let filas = [];
            data.forEach(sol => {
                const d = new Date(sol.fecha_log);
                const fechaStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                
                sol.items.forEach(it => {
                    let ok = true;
                    if(fTiempo === 'hoy' && ahora - sol.fecha_log > unDia) ok = false;
                    if(fTiempo === 'semana' && ahora - sol.fecha_log > unaSemana) ok = false;
                    if(fTiempo === 'mes' && (d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear())) ok = false;
                    if(fMaq !== 'todas' && it.maquina.toLowerCase() !== fMaq) ok = false;

                    if(ok) filas.push({ id: sol.id_solicitud, ms: sol.fecha_log, fecha: fechaStr, it: it });
                });
            });

            filas.sort((a,b) => b.ms - a.ms);

            if(filas.length === 0) { cont.innerHTML = '<p class="text-center text-gray-500 py-10">Sin resultados.</p>'; return; }

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
                            </tr>
                        </thead>
                        <tbody>
                            ${filas.map(f => `
                                <tr class="border-b hover:bg-gray-50 text-xs">
                                    <td class="px-4 py-2 font-bold text-indigo-700">${f.id}</td>
                                    <td class="px-4 py-2 text-gray-600">${f.fecha}</td>
                                    <td class="px-4 py-2"><span class="font-mono text-blue-600 font-bold">${f.it.codigo}</span><br>${f.it.descripcion}</td>
                                    <td class="px-4 py-2 text-center font-bold text-orange-600 text-sm">${f.it.cant}</td>
                                    <td class="px-4 py-2"><b>${f.it.maquina}</b><br><span class="text-gray-500">${f.it.seccion}</span></td>
                                    <td class="px-4 py-2">${f.it.tecnico}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // --- SISTEMA ORIGINAL INTACTO DE LECTURA Y RENDERIZADO ---
        let TODOS_LOS_DATOS = []; 
        let DATOS_FILTRADOS = [];
        let PUNTERO_PAGINA = 0;
        const REGISTROS_POR_PAGINA = 50;

        function renderizarBloqueTabla() {
            const tbody = document.getElementById('tableBody');
            const bloque = DATOS_FILTRADOS.slice(PUNTERO_PAGINA, PUNTERO_PAGINA + REGISTROS_POR_PAGINA);
            
            bloque.forEach(fila => {
                const { inv, maquinasUnicas, estado, estadoClase, vecesUsado, primeraSalida, ultimaSalida, qDiasSalidas, proyeccionTexto, proyeccionMs, qConsumo, solFecha, solOrigen } = fila;
                const tr = document.createElement('tr');
                
                // ASIGNAR EVENTO CLICK A LA FILA
                tr.className = "hover:bg-blue-50 transition duration-150 cursor-pointer";
                tr.onclick = () => abrirModalDetalle(fila);
                
                tr.innerHTML = `
                    <td><div class="cell-scroll mw-120 font-bold text-xs" title="${inv.codigo}">${inv.codigo}</div></td>
                    <td><div class="cell-scroll mw-120 text-xs text-gray-600" title="${inv.noParte || '-'}">${inv.noParte || "-"}</div></td>
                    <td><div class="cell-scroll mw-200 text-xs" title="${inv.descripcion}">${inv.descripcion}</div></td>
                    <td class="text-center font-bold text-blue-900 bg-blue-50">${inv.cantidad}</td>
                    
                    <td class="sol-col text-xs text-center">${formatFechaCorto(solFecha)}</td>
                    <td class="sol-col text-xs text-center font-semibold text-gray-700">${solOrigen}</td>
                    
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[0])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[1])}</td>
                    <td class="q-col text-right font-bold text-blue-700">${formatQ(qConsumo[2])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[3])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[4])}</td>
                    <td><div class="cell-scroll mw-150 text-xs" title="${maquinasUnicas}">${maquinasUnicas}</div></td>
                    <td class="text-xs font-semibold text-gray-700">${formatFechaCorto(inv.ultimaCompra)}</td>
                    <td class="text-center"><span class="badge ${estadoClase}">${estado}</span></td>
                    <td class="text-center font-bold">${vecesUsado}</td>
                    <td class="text-center font-bold text-purple-700 bg-purple-50">${fila.demandaAnual !== null ? fila.demandaAnual : '-'}</td>
                    <td class="text-xs">${formatFechaCorto(primeraSalida)}</td>
                    <td class="text-xs">${formatFechaCorto(ultimaSalida)}</td>
                    <td class="q-col text-right">${qDiasSalidas[0] !== null ? Math.round(qDiasSalidas[0]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[1] !== null ? Math.round(qDiasSalidas[1]) : '-'}</td>
                    <td class="q-col text-right font-bold text-red-600">${qDiasSalidas[2] !== null ? Math.round(qDiasSalidas[2]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[3] !== null ? Math.round(qDiasSalidas[3]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[4] !== null ? Math.round(qDiasSalidas[4]) : '-'}</td>
                    <td class="proj-col text-sm no-print" data-val="${proyeccionMs||0}">${proyeccionTexto}</td>
                    <td class="proj-col text-sm hidden print:table-cell">${proyeccionTexto}</td>
                `;
                tbody.appendChild(tr);
            });

            PUNTERO_PAGINA += bloque.length;
            document.getElementById('countVisibles').innerText = PUNTERO_PAGINA;
            document.getElementById('countTotalFiltrados').innerText = DATOS_FILTRADOS.length;
            
            if (PUNTERO_PAGINA < DATOS_FILTRADOS.length) { document.getElementById('controlesPaginacion').classList.remove('hidden'); } 
            else { document.getElementById('controlesPaginacion').classList.add('hidden'); }
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

        function ejecutarBusqueda() {
            const fBusqueda = document.getElementById('busquedaTexto').value.toLowerCase().trim();
            const tipoBusqueda = document.getElementById('tipoBusqueda').value;
            const fStock = document.getElementById('filtroStock').value;
            const fProy = document.getElementById('filtroProyeccion').value;
            const fGrupo = document.getElementById('filtroGrupo').value;
            const fMaquina = document.getElementById('filtroMaquina').value;
            const fEstado = document.getElementById('filtroEstado').value;
            const fUltimaSalida = document.getElementById('filtroUltimaSalida').value;
            const fDesde = document.getElementById('filtroSalidaDesde').value;
            const fHasta = document.getElementById('filtroSalidaHasta').value;

            const contRango = document.getElementById('contenedorRangoSalidas');
            if (fUltimaSalida === 'rango') { contRango.classList.remove('hidden'); contRango.classList.add('flex'); } 
            else { contRango.classList.add('hidden'); contRango.classList.remove('flex'); }

            const now = new Date(); const currentYear = now.getFullYear(); const currentMonth = now.getMonth();

            DATOS_FILTRADOS = TODOS_LOS_DATOS.filter(fila => {
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
                    else if (fStock === 'resto' && fila.inv.cantidad <= 1) mostrar = false;
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
                    }
                }

                return mostrar;
            });

            document.getElementById('tableBody').innerHTML = "";
            PUNTERO_PAGINA = 0;
            renderizarBloqueTabla();
        }

        document.getElementById('busquedaTexto').addEventListener('keypress', (e) => { if (e.key === 'Enter') ejecutarBusqueda(); });
        document.getElementById('btnEjecutarBusqueda').addEventListener('click', ejecutarBusqueda);
        ['filtroStock', 'filtroProyeccion', 'filtroGrupo', 'filtroMaquina', 'filtroEstado', 'tipoBusqueda', 'filtroUltimaSalida', 'filtroSalidaDesde', 'filtroSalidaHasta'].forEach(id => {
            document.getElementById(id).addEventListener('change', ejecutarBusqueda);
        });

        document.getElementById('btnCargarMas').addEventListener('click', renderizarBloqueTabla);
        document.getElementById('btnMostrarImportar').addEventListener('click', () => document.getElementById('zonaImportacion').classList.remove('hidden'));
        document.getElementById('btnBorrarDatos').addEventListener('click', async () => {
            if(confirm("¿Seguro que quieres borrar la base de datos y el historial guardado?")) { await borrarDatosLocales(); location.reload(); }
        });
        document.getElementById('btnImprimirPdf').addEventListener('click', () => window.print());

        let sortAscendente = true; 
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

        function inicializarInterfaz(datos) {
            TODOS_LOS_DATOS = datos.resultadosTabla;
            TODOS_LOS_DATOS.sort((a, b) => {
                if (!a.proyeccionMs && !b.proyeccionMs) return (b.ultimaSalida || 0) - (a.ultimaSalida || 0); 
                if (!a.proyeccionMs) return 1; if (!b.proyeccionMs) return -1;
                return a.proyeccionMs - b.proyeccionMs; 
            });

            const selGrupo = document.getElementById('filtroGrupo');
            const selMaquina = document.getElementById('filtroMaquina');
            selGrupo.innerHTML = '<option value="todos">Todos</option>';
            datos.gruposUnicos.sort().forEach(g => selGrupo.innerHTML += `<option value="${g}">${g}</option>`);
            selMaquina.innerHTML = '<option value="todas">Todas</option>';
            datos.maquinasUnicas.sort().forEach(m => selMaquina.innerHTML += `<option value="${m}">${m}</option>`);

            document.getElementById('resultTable').classList.remove('hidden');
            document.getElementById('contenedorFiltros').classList.remove('hidden');
            document.getElementById('zonaImportacion').classList.add('hidden');
            document.getElementById('controlesSesion').classList.remove('hidden');
            document.getElementById('pantallaCarga').classList.add('hidden');
            ejecutarBusqueda();
        }

        // LECTURA DE ARCHIVOS Y PROCESAMIENTO
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
                                        const wbHTML = XLSX.utils.table_to_book(table, {cellDates: true});
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
                            inventarioFiltrado[codigo] = { codigo, grupo: grupoCodigo, noParte: String(noParte), descripcion: desc, cantidad: cant, ultimaCompra: fechaCompra };
                        } else if (fechaCompra && (!inventarioFiltrado[codigo].ultimaCompra || fechaCompra > inventarioFiltrado[codigo].ultimaCompra)) {
                            inventarioFiltrado[codigo].ultimaCompra = fechaCompra;
                            inventarioFiltrado[codigo].cantidad = cant;
                            inventarioFiltrado[codigo].noParte = String(noParte);
                        }
                    } catch (e) {}
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
                    for(let i=0; i < fCrudas.length; i++) {
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
                    for (let i = 1; i < salidas.length; i++) diasEntreSalidas.push((salidas[i] - salidas[i-1]) / 86400000);
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

                    resultadosTabla.push({ inv, maquinasUnicas, estado, estadoClase, vecesUsado, primeraSalida, ultimaSalida, qDiasSalidas, proyeccionTexto, proyeccionMs, qConsumo, solFecha: sol.fecha, solOrigen: sol.origen, demandaAnual: demandaAnual });
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

        // --- ARRANQUE ---
        document.addEventListener('DOMContentLoaded', async () => {
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
    
