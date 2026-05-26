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
            for (let i = 0; i < fCrudas.length; i++) {
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
            for (let i = 1; i < salidas.length; i++) diasEntreSalidas.push((salidas[i] - salidas[i - 1]) / 86400000);
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

            let resumenMensual = new Array(12).fill(0);
            const hoy = new Date();
            historialSalidas.forEach(h => {
                const d = new Date(h.fecha);
                const diffMeses = (hoy.getFullYear() - d.getFullYear()) * 12 + (hoy.getMonth() - d.getMonth());
                if (diffMeses >= 0 && diffMeses < 12) {
                    resumenMensual[11 - diffMeses] += h.cantidad;
                }
            });

            resultadosTabla.push({
                inv, maquinasUnicas, estado, estadoClase, vecesUsado, primeraSalida, ultimaSalida,
                qDiasSalidas, proyeccionTexto, proyeccionMs, qConsumo, solFecha: sol.fecha,
                solOrigen: sol.origen, demandaAnual: demandaAnual, resumenMensual: resumenMensual
            });
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
