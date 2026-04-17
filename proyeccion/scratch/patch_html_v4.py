import re

filePath = "index.html"
with open(filePath, 'r', encoding='utf-8') as f:
    text = f.read()

# Thead Q Consumo
t1 = """                        <th class="q-col" title="Stock Mínimo (Q0)">Q0</th>
                        <th class="q-col" title="Stock Límite Inferior (Q1)">Q1</th>
                        <th class="q-col" title="Stock Mediano (Q2)">Q2</th>
                        <th class="q-col" title="Stock Límite Superior (Q3)">Q3</th>
                        <th class="q-col" title="Stock Máximo (Q4)">Q4</th>"""
r1 = """                        <th class="q-col text-center" title="Cuartiles de Consumo [Q0 - Q1 - Q2 - Q3 - Q4]">Curva de Consumo<br><span class="text-[10px] text-gray-500 font-normal">Mín - P25 - Med - P75 - Máx</span></th>"""
text = text.replace(t1, r1)

# Thead Ultima Compra & Estado
t2 = """                        <th>Última Compra</th>
                        <th class="text-center">Estado (Rotación)</th>"""
r2 = """                        <th class="text-center w-24">Estado<br><span class="text-[10px] text-gray-500 font-normal">Última Compra</span></th>"""
text = text.replace(t2, r2)

# Thead Q Dias
t3 = """                        <th class="q-col" title="Cuartiles días (Mínimo)">Q0</th>
                        <th class="q-col" title="Cuartiles días (Q1)">Q1</th>
                        <th class="q-col" title="Cuartiles días (Mediana)">Q2</th>
                        <th class="q-col" title="Cuartiles días (Q3)">Q3</th>
                        <th class="q-col" title="Cuartiles días (Máximo)">Q4</th>"""
r3 = """                        <th class="q-col text-center" title="Cuartiles de Días entre salidas [Q0 - Q1 - Q2 - Q3 - Q4]">Días entre Salidas<br><span class="text-[10px] text-gray-500 font-normal">Mín - P25 - Med - P75 - Máx</span></th>"""
text = text.replace(t3, r3)

# Tbody Q Consumo
t4 = """                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[0])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[1])}</td>
                    <td class="q-col text-right font-bold text-blue-700">${formatQ(qConsumo[2])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[3])}</td>
                    <td class="q-col text-right text-gray-600">${formatQ(qConsumo[4])}</td>"""
r4 = """                    <td class="q-col text-center text-xs whitespace-nowrap text-gray-600 font-mono tracking-tighter">
                        ${formatQ(qConsumo[0])}<span class="text-gray-300 mx-1">|</span>${formatQ(qConsumo[1])}<span class="text-gray-300 mx-1">|</span><span class="font-bold text-blue-700">${formatQ(qConsumo[2])}</span><span class="text-gray-300 mx-1">|</span>${formatQ(qConsumo[3])}<span class="text-gray-300 mx-1">|</span>${formatQ(qConsumo[4])}
                    </td>"""
text = text.replace(t4, r4)

# Tbody Ultima Compra & Estado
t5 = """                    <td class="text-xs font-semibold text-gray-700">${formatFechaCorto(inv.ultimaCompra)}</td>
                    <td class="text-center"><span class="badge ${estadoClase}">${estado}</span></td>"""
r5 = """                    <td class="text-center p-1 w-24"><span class="badge ${estadoClase} w-full block">${estado}</span><br><span class="text-[10px] text-gray-500 font-semibold mt-1 block">${formatFechaCorto(inv.ultimaCompra)}</span></td>"""
text = text.replace(t5, r5)

# Tbody Q Dias
t6 = """                    <td class="q-col text-right">${qDiasSalidas[0] !== null ? Math.round(qDiasSalidas[0]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[1] !== null ? Math.round(qDiasSalidas[1]) : '-'}</td>
                    <td class="q-col text-right font-bold text-red-600">${qDiasSalidas[2] !== null ? Math.round(qDiasSalidas[2]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[3] !== null ? Math.round(qDiasSalidas[3]) : '-'}</td>
                    <td class="q-col text-right">${qDiasSalidas[4] !== null ? Math.round(qDiasSalidas[4]) : '-'}</td>"""
r6 = """                    <td class="q-col text-center text-xs whitespace-nowrap text-gray-600 font-mono tracking-tighter">
                        ${qDiasSalidas[0] !== null ? Math.round(qDiasSalidas[0]) : '-'}<span class="text-gray-300 mx-1">|</span>${qDiasSalidas[1] !== null ? Math.round(qDiasSalidas[1]) : '-'}<span class="text-gray-300 mx-1">|</span><span class="font-bold text-red-600">${qDiasSalidas[2] !== null ? Math.round(qDiasSalidas[2]) : '-'}</span><span class="text-gray-300 mx-1">|</span>${qDiasSalidas[3] !== null ? Math.round(qDiasSalidas[3]) : '-'}<span class="text-gray-300 mx-1">|</span>${qDiasSalidas[4] !== null ? Math.round(qDiasSalidas[4]) : '-'}
                    </td>"""
text = text.replace(t6, r6)


with open(filePath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Patch applied to index.html successfully.")
