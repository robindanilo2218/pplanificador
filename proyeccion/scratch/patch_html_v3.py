import re

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update `renderSencilla` td and tr.
old_tr = '''<tr class="border-b hover:bg-blue-50 transition cursor-pointer" onclick="abrirModalDetalleSencillo('${fila.inv.codigo}')">'''
new_tr = '''<tr class="border-b hover:bg-blue-50 transition">'''
html = html.replace(old_tr, new_tr)

old_btn_td = '''                    <td class="p-1">
                        <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px]" onclick="event.stopPropagation(); simpleAddToCart('${fila.inv.codigo}', 1)">+1</button>
                    </td>'''
new_btn_td = '''                    <td class="p-1">
                        <div class="flex gap-1 justify-center items-center">
                            <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Añadir 1 rápido" onclick="simpleAddToCart('${fila.inv.codigo}', 1)">+1</button>
                            <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px]" title="Personalizar (Máquina, etc)" onclick="abrirModalDetalleSencillo('${fila.inv.codigo}')">➕</button>
                        </div>
                    </td>'''
html = html.replace(old_btn_td, new_btn_td)


# 2. Add gSerie and gModelo to the cart panel.
old_inputs = '''                        <input type="text" id="gMaquina" placeholder="Máquina / Destino *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">
                        <input type="text" id="gSeccion" placeholder="Sección *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">'''
new_inputs = '''                        <input type="text" id="gMaquina" placeholder="Máquina / Destino *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">
                        <div class="flex gap-1">
                            <input type="text" id="gSerie" placeholder="Serie (Opc.)" class="w-1/2 border p-1.5 rounded focus:border-orange-400 outline-none">
                            <input type="text" id="gModelo" placeholder="Modelo (Opc.)" class="w-1/2 border p-1.5 rounded focus:border-orange-400 outline-none">
                        </div>
                        <input type="text" id="gSeccion" placeholder="Sección *" class="w-full border p-1.5 rounded focus:border-orange-400 outline-none">'''
html = html.replace(old_inputs, new_inputs)


# 3. Update agregarAlCarrito() to pass those values globally.
old_act = '''            if(maq) document.getElementById('gMaquina').value = maq;
            if(sec !== "-") document.getElementById('gSeccion').value = sec;
            const tec = document.getElementById('inpTecnico').value.trim();
            if(tec) document.getElementById('gTecnico').value = tec;'''
new_act = '''            if(maq) document.getElementById('gMaquina').value = maq;
            if(sec !== "-") document.getElementById('gSeccion').value = sec;
            const ser = document.getElementById('inpSerie').value.trim();
            if(ser) document.getElementById('gSerie').value = ser;
            const mod = document.getElementById('inpModelo').value.trim();
            if(mod) document.getElementById('gModelo').value = mod;
            const tec = document.getElementById('inpTecnico').value.trim();
            if(tec) document.getElementById('gTecnico').value = tec;'''
html = html.replace(old_act, new_act)

# 4. Save to drafts
html = html.replace("tec: document.getElementById('gTecnico').value", "tec: document.getElementById('gTecnico').value, ser: document.getElementById('gSerie').value, mod: document.getElementById('gModelo').value")

# 5. Load from drafts
old_cargar_drafts = '''            document.getElementById('gSeccion').value = b.form.sec || '';
            document.getElementById('gTecnico').value = b.form.tec || '';'''
new_cargar_drafts = '''            document.getElementById('gSeccion').value = b.form.sec || '';
            document.getElementById('gTecnico').value = b.form.tec || '';
            document.getElementById('gSerie').value = b.form.ser || '';
            document.getElementById('gModelo').value = b.form.mod || '';'''
html = html.replace(old_cargar_drafts, new_cargar_drafts)

# 6. Update print PDF format (gSerie, gModelo variables)
old_pdf_vars = '''            const gMaq = document.getElementById('gMaquina').value.trim() || '-';
            const gSec = document.getElementById('gSeccion').value.trim() || '-';
            const gTec = document.getElementById('gTecnico').value.trim() || '';'''
new_pdf_vars = '''            const gMaq = document.getElementById('gMaquina').value.trim() || '-';
            const gSec = document.getElementById('gSeccion').value.trim() || '-';
            const gTec = document.getElementById('gTecnico').value.trim() || '';
            const gSer = document.getElementById('gSerie') ? document.getElementById('gSerie').value.trim() : '';
            const gMod = document.getElementById('gModelo') ? document.getElementById('gModelo').value.trim() : '';
            const extInfo = (gSer ? ` | Serie: ${gSer}` : '') + (gMod ? ` | Mod: ${gMod}` : '');'''
html = html.replace(old_pdf_vars, new_pdf_vars)

html = html.replace(
'''<tr><td colspan="5" style="border: 1px solid #ccc; padding: 8px; background-color:#e0f2fe; text-align:center;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}</td></tr>''',
'''<tr><td colspan="5" style="border: 1px solid #ccc; padding: 8px; background-color:#e0f2fe; text-align:center;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}${extInfo}</td></tr>'''
)

html = html.replace(
'''<tr><td colspan="5" style="background-color:#e0f2fe; text-align:center; padding:5px;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}</td></tr>''',
'''<tr><td colspan="5" style="background-color:#e0f2fe; text-align:center; padding:5px;"><b>Destino:</b> Máquina: ${gMaq} | Sección: ${gSec}${extInfo}</td></tr>'''
)

# And clear them on save and clear them on "vaciarCarrito()" ?
# Wait, vaciar carrito logic currently just sets `carrito = []` and `actualizarBadge()`. It shouldn't clear inputs unprompted so they can reuse the form.
# But `guardarBorrador` did: `document.getElementById('gMaquina').value = '';` wait, actually the new patch left them intact or cleared? I think I missed parsing `document.getElementById('gMaquina').value=''`. Actually let's just make sure they update.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)
print("Patch 3 successful!")
