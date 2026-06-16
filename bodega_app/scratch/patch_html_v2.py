import re

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. MODO BODEGUERO UI
html = html.replace(
'''            <div id="controlesSesion" class="hidden flex flex-wrap gap-2 items-center">''',
'''            <div id="controlesSesion" class="hidden flex flex-wrap gap-2 items-center">
                <button id="btnToggleBodeguero" onclick="toggleBodeguero()" class="bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold py-1 px-4 rounded text-sm transition shadow-sm border border-gray-300 flex items-center gap-1">🔒 Lector</button>
                <div class="w-px bg-gray-300 mx-1 h-6"></div>'''
)

# Render class conditions for readonly state
inp_util_sencilla = '''<td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-util w-24 border rounded p-1 text-[10px]" value="${fila.inv.nombreUtil || ''}" onclick="event.stopPropagation()"></td>'''
inp_ubic_sencilla = '''<td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-ubic w-24 border rounded p-1 text-[10px]" value="${fila.inv.ubicacion || ''}" onclick="event.stopPropagation()"></td>'''

new_util_sencilla = '''<td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-util w-24 border rounded p-1 text-[10px] ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${fila.inv.nombreUtil || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>'''
new_ubic_sencilla = '''<td class="p-2"><input type="text" data-codigo="${fila.inv.codigo}" class="in-ubic w-24 border rounded p-1 text-[10px] ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${fila.inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>'''

html = html.replace(inp_util_sencilla, new_util_sencilla).replace(inp_ubic_sencilla, new_ubic_sencilla)

inp_util_det = '''<td><input type="text" data-codigo="${inv.codigo}" class="in-util w-24 border border-gray-300 rounded p-1 text-xs" value="${inv.nombreUtil || ''}" onclick="event.stopPropagation()"></td>'''
inp_ubic_det = '''<td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-24 border border-gray-300 rounded p-1 text-xs" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()"></td>'''

new_util_det = '''<td><input type="text" data-codigo="${inv.codigo}" class="in-util w-24 border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.nombreUtil || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>'''
new_ubic_det = '''<td><input type="text" data-codigo="${inv.codigo}" class="in-ubic w-24 border rounded p-1 text-xs ${!isBodeguero ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent' : 'border-gray-300'}" value="${inv.ubicacion || ''}" onclick="event.stopPropagation()" ${!isBodeguero ? 'readonly' : ''}></td>'''

html = html.replace(inp_util_det, new_util_det).replace(inp_ubic_det, new_ubic_det)


# 2. CARRITO BORRADORES UI
html = html.replace(
'''                    <div class="flex gap-2">
                        <button onclick="procesarSolicitudEmail()" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded text-xs transition">Enviar a Compras</button>
                        <button onclick="generarPdfCarrito()" class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded text-xs transition">PDF</button>
                    </div>''',
'''                    <div class="flex gap-2">
                        <button onclick="procesarSolicitudEmail()" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded text-xs transition">Enviar a Compras</button>
                        <button onclick="generarPdfCarrito()" class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded text-xs transition">PDF</button>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button onclick="guardarBorrador()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-[10px] font-bold py-1 rounded transition">📥 G. Borrador</button>
                        <button onclick="verBorradores()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-[10px] font-bold py-1 rounded transition">📂 Cargar</button>
                    </div>'''
)

# 3. SCRIPTS ADDITIONS
js_additions = '''
        // --- MODO BODEGUERO ---
        let isBodeguero = sessionStorage.getItem('isBodeguero') === 'true';

        function toggleBodeguero() {
            if(isBodeguero) {
                if(confirm("¿Cerrar sesión de Bodeguero? (Los campos volverán a ser de solo lectura para los técnicos)")) {
                    isBodeguero = false;
                    sessionStorage.setItem('isBodeguero', 'false');
                    aplicarEstadoBodeguero();
                }
            } else {
                const pin = prompt("Ingrese el PIN de Bodega para editar ubicaciones y nombres útiles:");
                if(pin === "1234" || pin === "bodega") {
                    isBodeguero = true;
                    sessionStorage.setItem('isBodeguero', 'true');
                    aplicarEstadoBodeguero();
                } else {
                    if(pin !== null) alert("PIN incorrecto.");
                }
            }
        }

        function aplicarEstadoBodeguero() {
            const btn = document.getElementById('btnToggleBodeguero');
            if(btn) {
                if(isBodeguero) {
                    btn.innerHTML = '🔓 Bodeguero';
                    btn.className = 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 font-bold py-1 px-4 rounded text-sm transition shadow-sm border border-yellow-400 flex items-center gap-1';
                } else {
                    btn.innerHTML = '🔒 Lector';
                    btn.className = 'bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold py-1 px-4 rounded text-sm transition shadow-sm border border-gray-300 flex items-center gap-1';
                }
            }
            
            document.querySelectorAll('.in-ubic, .in-util').forEach(inp => {
                inp.readOnly = !isBodeguero;
                if(!isBodeguero) {
                    inp.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed', 'border-transparent');
                    inp.classList.remove('border-gray-300');
                } else {
                    inp.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed', 'border-transparent');
                    inp.classList.add('border-gray-300');
                }
            });
            
            // Re-render required to ensure DOM states match variable
            if(typeof PUNTERO_PAGINA !== 'undefined') {
                if(!document.getElementById('vistaSencilla').classList.contains('hidden')) {
                    buscarSencilla();
                } else {
                    document.getElementById('tableBody').innerHTML = "";
                    PUNTERO_PAGINA = 0;
                    renderizarBloqueTabla();
                }
            }
        }

        // --- CARRITOS BORRADORES ---
        window.addEventListener('load', aplicarEstadoBodeguero);

        function guardarBorrador() {
            if(carrito.length === 0) return alert("El carrito está vacío");
            const maqReq = document.getElementById('gMaquina').value || 'Sin_Maquina';
            const name = prompt("Nombre corto para este borrador:", maqReq);
            if(!name) return;
            const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
            borradores.push({
                id: Date.now(), 
                nombre: name, 
                items: carrito, 
                form: { 
                    maq: document.getElementById('gMaquina').value, 
                    sec: document.getElementById('gSeccion').value, 
                    tec: document.getElementById('gTecnico').value 
                } 
            });
            localStorage.setItem('cartBorradores', JSON.stringify(borradores));
            carrito = [];
            actualizarMiniCarrito();
            actualizarBadgeCarrito();
        }

        function verBorradores() {
            const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
            if(borradores.length === 0) return alert("No hay borradores guardados.");
            
            const cont = document.getElementById('sencillaHistorialItems');
            if(!cont) return;
            
            cont.innerHTML = `<div class="font-bold text-gray-600 mb-2 border-b pb-1">Borradores Guardados</div>` + 
            borradores.map((b, idx) => `
                <div class="border rounded p-2 hover:bg-yellow-50 cursor-pointer transition mb-1 bg-yellow-100 shadow-sm" onclick="cargarBorrador(${idx})">
                    <div class="flex justify-between items-center border-b border-yellow-200 pb-1 mb-1">
                        <span class="font-bold text-yellow-800 text-[10px]">${b.nombre}</span>
                        <button onclick="event.stopPropagation(); borrarBorrador(${idx})" class="text-red-500 hover:text-red-700 text-xs text-[10px] bg-red-50 px-1 rounded">X</button>
                    </div>
                    <div class="text-[10px] flex justify-between items-center">
                        <span class="text-gray-500">${new Date(b.id).toLocaleDateString()}</span>
                        <span class="bg-yellow-200 text-yellow-800 font-bold px-1 rounded border border-yellow-300 shadow-sm">${b.items.length} ítems</span>
                    </div>
                </div>
            `).join('') + `<button onclick="renderHistorialSencillo()" class="mt-3 w-full text-[10px] bg-indigo-50 border border-indigo-200 p-1 text-indigo-700 font-bold rounded">Volver al Historial</button>`;
        }

        function cargarBorrador(idx) {
            const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
            const b = borradores[idx];
            if(!b) return;
            if(carrito.length > 0 && !confirm("Tienes items activos en el carrito. Cargarlo lo sobrescribirá. ¿Continuar?")) return;
            
            carrito = b.items;
            document.getElementById('gMaquina').value = b.form.maq || '';
            document.getElementById('gSeccion').value = b.form.sec || '';
            document.getElementById('gTecnico').value = b.form.tec || '';
            
            borradores.splice(idx, 1);
            localStorage.setItem('cartBorradores', JSON.stringify(borradores));
            
            actualizarMiniCarrito();
            actualizarBadgeCarrito();
            renderHistorialSencillo();
        }

        function borrarBorrador(idx) {
            const borradores = JSON.parse(localStorage.getItem('cartBorradores') || '[]');
            borradores.splice(idx, 1);
            localStorage.setItem('cartBorradores', JSON.stringify(borradores));
            verBorradores();
        }

        // --- FILTRO DE LIMPIEZA DE NOMBRES ---
        function generarNombreUtil(desc) {
            if(!desc) return "";
            let n = desc.toUpperCase();
            const ruido = [/DE BOLAS /g, /NSK/g, /SKF/g, /MARCA /g, /TIPO /g, /RODILLOS /g, /DE AGUJAS /g, /NTN/g, /FAG/g, /TIMKEN/g, /DE CONTACTO ANGULAR/g];
            ruido.forEach(r => n = n.replace(r, ""));
            return n.replace(/\s+/g, ' ').trim();
        }
'''

html = html.replace('// --- RENDERIZADO DEL HISTORIAL ---', js_additions + '\n        // --- RENDERIZADO DEL HISTORIAL ---')


# Modify assignment of empty nombreUtil
html = html.replace(
'''ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', nombreUtil: metaDatos[codigo] ? metaDatos[codigo].nombreUtil : '' };''',
'''ubicacion: metaDatos[codigo] ? metaDatos[codigo].ubicacion : '', nombreUtil: metaDatos[codigo] && metaDatos[codigo].nombreUtil ? metaDatos[codigo].nombreUtil : generarNombreUtil(desc) };'''
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)
print("Patch 2 successful!")
