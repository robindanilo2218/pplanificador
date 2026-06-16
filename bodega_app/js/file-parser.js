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
    const btn = document.getElementById('btnProcesar');
    const syncProgress = document.getElementById('syncProgress');
    if(btn) btn.disabled = true;
    if(syncProgress) {
        syncProgress.classList.remove('hidden');
        syncProgress.innerText = "Leyendo configuración bodega.json...";
    }

    try {
        const harResponse = await fetch('./bodega.json');
        if (!harResponse.ok) throw new Error("No se encontró bodega.json local");
        const harData = await harResponse.json();

        const reqEntry = harData.log.entries.find(e => e.request.url.includes('Control1.aspx') && e.request.method === 'POST');
        if (!reqEntry) throw new Error("No se encontró configuración de Control1.aspx en el HAR");

        const req = reqEntry.request;
        const url = req.url;
        const headers = {};
        req.headers.forEach(h => {
            const name = h.name.toLowerCase();
            if (name !== 'host' && name !== 'content-length' && !name.startsWith('sec-') && name !== 'accept-encoding') {
                headers[h.name] = h.value;
            }
        });

        let body = null;
        if (req.postData && req.postData.text) {
            body = req.postData.text;
        }

        if(syncProgress) syncProgress.innerText = "Conectando al servidor en vivo...";
        
        const liveResponse = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!liveResponse.ok) throw new Error("Error HTTP al conectar: " + liveResponse.status);
        
        if(syncProgress) syncProgress.innerText = "Procesando datos...";
        const htmlText = await liveResponse.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const table = doc.querySelector('table');
        if (!table) throw new Error("No se encontró la tabla en la respuesta del servidor.");

        const wbHTML = XLSX.utils.table_to_book(table, { cellDates: true });
        const datosInventario = XLSX.utils.sheet_to_json(wbHTML.Sheets[wbHTML.SheetNames[0]]);

        const setGrupos = new Set();
        const setMaquinas = new Set();
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

        let resultadosTabla = [];
        Object.keys(inventarioFiltrado).forEach(codigo => {
            const inv = inventarioFiltrado[codigo];
            resultadosTabla.push({
                inv,
                maquinasUnicas: "-",
                estado: "Sin movimiento",
                estadoClase: "bg-gray-200 text-gray-700",
                vecesUsado: 0,
                primeraSalida: null,
                ultimaSalida: null,
                qDiasSalidas: [null, null, null, null, null],
                proyeccionTexto: "N/A",
                proyeccionMs: "",
                qConsumo: [null, null, null, null, null],
                solFecha: null,
                solOrigen: "-",
                demandaAnual: null,
                resumenMensual: new Array(12).fill(0)
            });
        });

        const datosParaGuardar = { resultadosTabla, gruposUnicos: Array.from(setGrupos), maquinasUnicas: Array.from(setMaquinas) };
        await guardarDatos(datosParaGuardar);
        inicializarInterfaz(datosParaGuardar);
        
        if(syncProgress) {
            syncProgress.innerText = "¡Sincronización exitosa!";
            setTimeout(() => syncProgress.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error(error);
        alert("Error al procesar: " + error.message);
        if(syncProgress) syncProgress.classList.add('hidden');
    } finally {
        if(btn) btn.disabled = false;
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
