
const CLIENT_ID = 'TU_CLIENT_ID';
const API_KEY = 'TU_API_KEY';

let state = {
    currentDate: new Date(),
    viewMode: localStorage.getItem('viewMode') || 'week',
    lunchHour: parseInt(localStorage.getItem('lunchHour')) || 12,
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    activeTaskId: null,
    timer: null,
    defaultCategories: JSON.parse(localStorage.getItem('defaultCategories')) || [],
    defaultSubcategories: JSON.parse(localStorage.getItem('defaultSubcategories')) || [],
    defaultLeaders: JSON.parse(localStorage.getItem('defaultLeaders')) || [],
    defaultProcesses: JSON.parse(localStorage.getItem('defaultProcesses')) || [], // NUEVO
    shifts: JSON.parse(localStorage.getItem('shifts')) || { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    managerName: localStorage.getItem('managerName') || '' // NUEVO: Para filtro CSV
};

// Migracion de datos viejos (assignee string -> assignees array)
state.tasks.forEach(t => {
    if (t.assignee && !t.assignees) t.assignees = [t.assignee];
    if (!t.assignees) t.assignees = [];
    delete t.assignee;
});

document.addEventListener('DOMContentLoaded', () => {
    populateHourSelects();
    document.getElementById('lunchSelector').value = state.lunchHour;
    document.getElementById('viewSelector').value = state.viewMode;
    renderApp();
    restoreTimer();

    // Auto-scroll a las 7:00 AM para no ver la medianoche de entrada
    setTimeout(() => {
        const startHourEl = document.getElementById('hour-7');
        if (startHourEl) startHourEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
});

// --- RENDERIZADO GLOBAL ---
function renderApp() {
    renderHeader();
    renderGrid();
    renderTable();
    updateDashboard();
    updateDatalists();
    renderLeaders();
    renderConfigLists(); // Inicializar listas de configuraciÃ³n
}

// --- CALENDARIO ---
function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    if (state.viewMode === 'calendar') {
        renderTraditionalCalendar(grid);
        return;
    }


    let daysCount = 7;
    let startDate = getStartOfWeek(state.currentDate);

    if (state.viewMode === 'month') {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        daysCount = new Date(year, month + 1, 0).getDate();
        startDate = new Date(year, month, 1);
    }

    grid.style.gridTemplateColumns = `50px repeat(${daysCount}, minmax(130px, 1fr))`;
    grid.style.gridTemplateRows = '';
    grid.style.height = 'auto';

    grid.appendChild(createDiv('header-corner', ''));
    const dayNames = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];

    for (let i = 0; i < daysCount; i++) {
        const d = new Date(startDate); d.setDate(d.getDate() + i);
        const isToday = isSameDay(d, new Date());
        const dayName = dayNames[d.getDay()];

        // NUEVO: Renderizar lÃ­deres de turno
        const onDuty = state.shifts[d.getDay()] || [];
        const onDutyStr = onDuty.length > 0 ? `<div style="font-size:0.7em; color:#88d8b0; line-height: 1.2; margin-top:5px; word-break: break-word; text-align:center;">ðŸ‘· ${onDuty.join(', ')}</div>` : '';

        grid.appendChild(createDiv(`day-header ${isToday ? 'today' : ''}`, `<div>${dayName}</div><div style="font-size:1.1em; font-weight:bold;">${d.getDate()}</div>${onDutyStr}`));
    }

    for (let h = 0; h <= 23; h++) {
        const timeCol = createDiv('time-col', `${h}:00`);
        timeCol.id = `hour-${h}`;
        grid.appendChild(timeCol);

        for (let i = 0; i < daysCount; i++) {
            const d = new Date(startDate); d.setDate(d.getDate() + i);
            const dateStr = formatDate(d);
            const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
            const isToday = isSameDay(d, new Date());
            const div = document.createElement('div');

            if (h === state.lunchHour) {
                div.className = `slot lunch-row ${isToday ? 'today-col' : ''}`;
                if (i === 3 || (state.viewMode === 'month' && i % 7 === 3)) {
                    // Cambiado a posiciÃ³n absoluta para no estorbar a las tareas apiladas
                    const lbl = document.createElement('span');
                    lbl.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:0.7em; color:#555; pointer-events:none; z-index:1;";
                    lbl.textContent = "ALMUERZO";
                    div.appendChild(lbl);
                }
            } else {
                div.className = `slot ${isWeekend ? 'weekend-col' : ''} ${isToday ? 'today-col' : ''}`;
            }

            // MODIFICADO: Asignar el evento de clic primero
            div.onclick = (e) => {
                // Si el clic es directamente en el div (no en una tarjeta), abrir modal
                if (e.target === div || e.target.closest('.slot') === div && !e.target.closest('.task-card')) {
                    openModalNew(dateStr, h);
                }
            };

            // NUEVA LÃ“GICA: Filtrar para permitir mÃºltiples tareas en la misma hora
            const slotTasks = state.tasks.filter(t => t.date === dateStr && t.hour === h);

            if (slotTasks.length > 0) {
                slotTasks.forEach(task => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.innerHTML = renderCard(task);
                    const cardEl = cardWrapper.firstElementChild;
                    cardEl.onclick = (e) => {
                        e.stopPropagation();
                        openOptions(task);
                    };
                    div.appendChild(cardEl);
                });
            }

            grid.appendChild(div);
        }
    }
}

function renderTraditionalCalendar(grid) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // removed.getDay(); 
    // removed.getDate();
    const rowsCount = Math.ceil((daysInMonth + startOffset) / 7);

    grid.style.gridTemplateColumns = `repeat(7, minmax(120px, 1fr))`;
    grid.style.gridTemplateRows = `auto repeat(${rowsCount}, minmax(100px, 1fr))`;
    grid.style.height = 'calc(100vh - 160px)';

    const dayNames = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];

    for (let i = 0; i < 7; i++) {
        grid.appendChild(createDiv('day-header', `<div>${dayNames[i]}</div>`));
    }

    // removed.getDay(); 
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(createDiv('slot weekend-col', ''));
    }

    // removed.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = formatDate(dateObj);
        const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
        const isToday = isSameDay(dateObj, new Date());

        const div = document.createElement('div');
        div.className = `slot ${isWeekend ? 'weekend-col' : ''} ${isToday ? 'today-col' : ''}`;
        div.style.padding = "5px";

        const dayBadge = document.createElement('div');
        dayBadge.style.cssText = "text-align: right; font-weight: bold; font-size: 1.1em; margin-bottom: 5px; color: #888;";
        if (isToday) dayBadge.style.color = "var(--accent)";
        dayBadge.innerHTML = d;
        div.appendChild(dayBadge);

        div.onclick = (e) => {
            if (e.target === div || e.target === dayBadge || e.target.closest('.slot') === div && !e.target.closest('.task-card')) {
                openModalNew(dateStr, 8); // Default 8 AM
            }
        };

        const dayTasks = state.tasks.filter(t => t.date === dateStr);
        dayTasks.sort((a, b) => a.hour - b.hour);

        dayTasks.forEach(task => {
            const cardWrapper = document.createElement('div');
            cardWrapper.innerHTML = renderCard(task);
            const cardEl = cardWrapper.firstElementChild;

            const titleDiv = cardEl.querySelector('.card-title');
            if (titleDiv) {
                const timeSpan = document.createElement('span');
                timeSpan.style.cssText = "font-weight:normal; color:#fff; font-size: 0.9em; margin-right:4px; background: rgba(255,255,255,0.1); padding: 0 4px; border-radius: 4px;";
                timeSpan.textContent = `${task.hour}:00`;
                titleDiv.prepend(timeSpan);
            }

            cardEl.onclick = (e) => {
                e.stopPropagation();
                openOptions(task);
            };
            div.appendChild(cardEl);
        });

        grid.appendChild(div);
    }
}

function renderCard(task) {
    const cat = task.category || task.title.split(' ')[0];
    const sub = task.subcategory || '';
    const color = stringToColor(cat);

    let typeIcon = '';
    if (task.maintenanceType === 'preventivo') typeIcon = 'ðŸ›¡ï¸';
    else if (task.maintenanceType === 'correctivo') typeIcon = 'ðŸ”§';
    else if (task.maintenanceType === 'proyecto') typeIcon = 'ðŸ—ï¸';

    const assigneesStr = (task.assignees && task.assignees.length > 0) ? task.assignees.join(', ') : '';

    return `
                <div class="task-card ${task.status}" style="border-left-color:${color}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-weight:bold; color:${color}; white-space:nowrap; overflow:hidden; padding-right:5px;">${cat}</div>
                        <div style="display:flex; gap:4px; align-items:center;">
                            ${typeIcon ? `<span style="font-size:0.9em;" title="${task.maintenanceType}">${typeIcon}</span>` : ''}
                            <div class="task-id-badge">${task.taskCode || ''}</div>
                        </div>
                    </div>
                    <div style="color:#aaa;">${sub}</div>
                    ${assigneesStr ? `<div style="font-size:0.75em; color:#88d8b0; margin-top:2px;">ðŸ‘¤ ${assigneesStr}</div>` : ''}
                    ${task.seconds > 0 ? `<div style="text-align:right; font-family:monospace; font-size:0.9em;">${formatTime(task.seconds)}</div>` : ''}
                </div>
            `;
}

// --- GESTIÃ“N DE PERSONAL (MODAL) ---
function addAssignRow(name = '', days = [1, 2, 3, 4, 5]) {
    const container = document.getElementById('assignList');
    const div = document.createElement('div');
    div.className = 'assign-row';

    let daysHtml = '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];
    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
        const checked = days.includes(d) ? 'checked' : '';
        const color = (d === 0 || d === 6) ? '#f0ad4e' : '#fff';
        daysHtml += `<label style="margin-right:8px; font-size:0.8em; color:${color};"><input type="checkbox" value="${d}" class="assign-day-chk" ${checked}> ${dayNames[d]}</label>`;
    });

    div.innerHTML = `
                <div style="display:flex; gap:10px; margin-bottom:8px;">
                    <input type="text" class="input-dark assign-name" list="leadersList" placeholder="LÃ­der o TÃ©cnico..." value="${name}" style="flex:1;">
                    <button class="btn-sm btn-remove" onclick="this.parentElement.parentElement.remove()">X</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; padding-left:5px;">
                    ${daysHtml}
                </div>
            `;
    container.appendChild(div);
}

function getAssignmentsFromUI() {
    const assignments = [];
    document.querySelectorAll('.assign-row').forEach(row => {
        const nameStr = row.querySelector('.assign-name').value.trim();
        const days = Array.from(row.querySelectorAll('.assign-day-chk:checked')).map(chk => parseInt(chk.value));
        if (nameStr && days.length > 0) {
            // Si el usuario escribe varios separados por coma (ej: "Juan, Pedro")
            nameStr.split(',').forEach(n => {
                const cleanName = n.trim();
                if (cleanName) assignments.push({ name: cleanName, days });
            });
        }
    });
    return assignments;
}

// --- GESTIÃ“N DE COSTOS DINÃMICOS ---
function addCostRow(name = '', val = '') {
    const container = document.getElementById('costList');
    const div = document.createElement('div');
    div.className = 'cost-row';
    div.innerHTML = `
                <input type="text" class="input-dark cost-name" placeholder="Concepto (ej: Mano de obra)" value="${name}">
                <input type="number" class="input-dark cost-val" placeholder="0.00" value="${val}" oninput="updateTotalCostDisplay()">
                <button class="btn-sm btn-remove" onclick="this.parentElement.remove(); updateTotalCostDisplay()">X</button>
            `;
    container.appendChild(div);
    updateTotalCostDisplay();
}

function updateTotalCostDisplay() {
    let total = 0;
    document.querySelectorAll('.cost-val').forEach(inp => {
        total += parseFloat(inp.value) || 0;
    });
    document.getElementById('totalCostDisplay').textContent = `Q${total.toFixed(2)}`;
    return total;
}

function getCostBreakdownFromUI() {
    const breakdown = [];
    let total = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const nameInput = row.querySelector('.cost-name');
        const valInput = row.querySelector('.cost-val');

        if (!nameInput || !valInput) return; // Evita el error "Cannot read properties of null"

        const name = nameInput.value.trim();
        const val = parseFloat(valInput.value) || 0;
        if (name) {
            breakdown.push({ name, value: val });
            total += val;
        }
    });
    return { breakdown, total };
}

// --- GESTIÃ“N DE TAREAS ---
function openModalNew(dateStr, hour) {
    document.getElementById('modalTitle').textContent = "Nueva PlanificaciÃ³n";
    document.getElementById('editingGroupId').value = "";

    // Mostrar advertencia si es almuerzo
    const isLunch = (hour === state.lunchHour);
    const warningEl = document.getElementById('lunchWarning');
    if (warningEl) warningEl.style.display = isLunch ? 'block' : 'none';

    document.getElementById('inpCat').value = "";
    document.getElementById('inpSub').value = "";
    filterSubcategories(); // Filtrar subcategorÃ­as reseteadas
    document.getElementById('inpProcess').value = "";
    document.getElementById('inpDetail').value = "";
    document.getElementById('inpMaintType').value = "preventivo";
    document.getElementById('inpPriority').value = "medium";

    // Determinar el dÃ­a de la semana clickeado
    const clickedDate = new Date(dateStr + "T00:00:00");
    const clickedDay = clickedDate.getDay();

    // MODIFICADO: Resetear dÃ­as (L-V por defecto, si hizo clic en S-D, lo marca)
    [0, 1, 2, 3, 4, 5, 6].forEach(d => {
        if (d >= 1 && d <= 5) {
            document.getElementById(`day-${d}`).checked = true;
        } else {
            document.getElementById(`day-${d}`).checked = (d === clickedDay);
        }
    });

    // Resetear Asignaciones
    document.getElementById('assignList').innerHTML = '';
    addAssignRow(); // Agrega una fila vacÃ­a por defecto

    // Resetear Recurrencia
    document.getElementById('inpRepeatCheck').checked = false;
    document.getElementById('inpRepeatNum').value = 1;
    document.getElementById('inpRepeatUnit').value = "weeks";
    document.getElementById('inpRepeatUntil').value = "";
    toggleRepeatUI();

    // Limpiar y resetear costos
    document.getElementById('costList').innerHTML = '';
    addCostRow('Mano de Obra', '');
    addCostRow('Repuestos', '');

    document.getElementById('inpDateStart').value = dateStr;
    document.getElementById('inpDateEnd').value = dateStr;
    document.getElementById('inpStartHour').value = hour;
    document.getElementById('inpEndHour').value = hour + 1;

    document.getElementById('modalTask').style.display = 'flex';
}

function saveTaskRange() {
    const cat = document.getElementById('inpCat').value.trim();
    const sub = document.getElementById('inpSub').value.trim();
    const process = document.getElementById('inpProcess').value.trim();
    const detail = document.getElementById('inpDetail').value.trim();
    const maintType = document.getElementById('inpMaintType').value;
    const priority = document.getElementById('inpPriority').value;

    const assignments = getAssignmentsFromUI();

    // Recurrencia
    const repeatCheck = document.getElementById('inpRepeatCheck').checked;
    const repeatNum = Math.max(1, parseInt(document.getElementById('inpRepeatNum').value) || 1);
    const repeatUnit = document.getElementById('inpRepeatUnit').value;
    const repeatUntil = document.getElementById('inpRepeatUntil').value;
    const recurrenceData = repeatCheck ? { checked: true, num: repeatNum, unit: repeatUnit, until: repeatUntil } : null;

    const selectedDays = [0, 1, 2, 3, 4, 5, 6].filter(d => document.getElementById(`day-${d}`).checked);
    if (selectedDays.length === 0) return alert("Debe seleccionar al menos un dÃ­a de la semana.");

    const { breakdown, total } = getCostBreakdownFromUI();

    const dateStart = new Date(document.getElementById('inpDateStart').value + "T00:00:00");
    const dateEnd = new Date(document.getElementById('inpDateEnd').value + "T00:00:00");
    const hStart = parseInt(document.getElementById('inpStartHour').value);
    const hEnd = parseInt(document.getElementById('inpEndHour').value);
    const editId = document.getElementById('editingGroupId').value;

    if (!cat || hEnd <= hStart || dateEnd < dateStart) return alert("Verifique datos de fechas y horas.");

    // --- LÃ“GICA DE PRESERVACIÃ“N HISTÃ“RICA ---
    let executedTasks = [];
    if (editId) {
        executedTasks = state.tasks.filter(t => t.groupId === editId && (t.seconds > 0 || t.status === 'done' || t.status === 'running'));
        state.tasks = state.tasks.filter(t => !(t.groupId === editId && t.seconds === 0 && t.status === 'planned'));

        executedTasks.forEach(t => {
            t.category = cat;
            t.subcategory = sub;
            t.process = process;
            t.detail = detail;
            t.maintenanceType = maintType;
            t.priority = priority;
            t.title = `${cat} ${sub}`;
            t.recurrence = recurrenceData;
            t.selectedDays = selectedDays;
            t.baseStartDate = document.getElementById('inpDateStart').value;
            t.baseEndDate = document.getElementById('inpDateEnd').value;
            // No sobreescribimos los assignees de las tareas ejecutadas para preservar la historia de quiÃ©n la hizo.
        });
    }

    const newGroupId = editId || ('GRP_' + Date.now());

    let currentTaskCode = "";
    if (editId && executedTasks.length > 0) {
        currentTaskCode = executedTasks[0].taskCode;
    } else if (editId) {
        const existing = state.tasks.find(t => t.groupId === editId);
        if (existing) currentTaskCode = existing.taskCode;
    }

    if (!currentTaskCode) {
        const codes = state.tasks.map(t => parseInt((t.taskCode || 'T-0').replace('T-', '')) || 0);
        currentTaskCode = `T-${((codes.length > 0 ? Math.max(...codes) : 0) + 1).toString().padStart(3, '0')}`;
    }

    // --- CÃLCULO DE INTERVALOS RECURRENTES ---
    let intervals = [];
    let currS = new Date(dateStart); currS.setHours(0, 0, 0, 0);
    let currE = new Date(dateEnd); currE.setHours(0, 0, 0, 0);
    let limitD = repeatCheck && repeatUntil ? new Date(repeatUntil) : new Date(currE);
    limitD.setHours(23, 59, 59, 999);

    let maxLoops = 500; // LÃ­mite de seguridad
    while (currS <= limitD && maxLoops-- > 0) {
        intervals.push({ s: new Date(currS), e: new Date(currE) });

        if (!repeatCheck) break; // Si no repite, solo hace el primero

        if (repeatUnit === 'weeks') { currS.setDate(currS.getDate() + repeatNum * 7); currE.setDate(currE.getDate() + repeatNum * 7); }
        else if (repeatUnit === 'months') { currS.setMonth(currS.getMonth() + repeatNum); currE.setMonth(currE.getMonth() + repeatNum); }
        else if (repeatUnit === 'years') { currS.setFullYear(currS.getFullYear() + repeatNum); currE.setFullYear(currE.getFullYear() + repeatNum); }
    }

    // --- GENERACIÃ“N DE NUEVOS SLOTS ---
    let potentialSlots = [];
    intervals.forEach(inv => {
        let cursor = new Date(inv.s);
        while (cursor <= inv.e) {
            let day = cursor.getDay();
            if (selectedDays.includes(day)) {
                for (let h = hStart; h < hEnd; h++) {
                    if (h !== state.lunchHour) potentialSlots.push({ date: formatDate(cursor), hour: h });
                }
            }
            cursor.setDate(cursor.getDate() + 1);
        }
    });

    // Evitar duplicar un slot planeado justo donde ya hay uno ejecutado
    let finalNewSlots = potentialSlots.filter(ps => !executedTasks.some(et => et.date === ps.date && et.hour === ps.hour));

    let totalSlots = executedTasks.length + finalNewSlots.length;
    if (totalSlots === 0) return alert("El rango y dÃ­as seleccionados no generan ninguna hora laborable.");

    const costPerSlot = total / totalSlots;

    // Actualizar costos de las tareas ejecutadas (histÃ³ricas)
    executedTasks.forEach(t => {
        t.cost = costPerSlot;
        t.originalTotal = total;
        t.breakdown = breakdown;
    });

    // Crear las tareas planeadas
    finalNewSlots.forEach(slot => {
        const slotDateObj = new Date(slot.date + "T00:00:00");
        const dayOfWeek = slotDateObj.getDay();

        // Determinar quiÃ©n trabaja este dÃ­a segÃºn la configuraciÃ³n del modal
        const slotAssignees = assignments.filter(a => a.days.includes(dayOfWeek)).map(a => a.name);

        state.tasks.push({
            id: Date.now() + Math.random(),
            groupId: newGroupId,
            date: slot.date,
            hour: slot.hour,
            category: cat,
            subcategory: sub,
            process: process,
            detail: detail,
            maintenanceType: maintType,
            priority: priority,
            title: `${cat} ${sub}`,
            taskCode: currentTaskCode,
            assignees: slotAssignees, // Array de tÃ©cnicos para este dÃ­a
            cost: costPerSlot,
            originalTotal: total,
            breakdown: breakdown,
            selectedDays: selectedDays,
            recurrence: recurrenceData,
            baseStartDate: document.getElementById('inpDateStart').value,
            baseEndDate: document.getElementById('inpDateEnd').value,
            status: 'planned',
            seconds: 0
        });
    });

    saveLocal();
    closeModal();
    renderApp();
}

function toggleRepeatUI() {
    const isChecked = document.getElementById('inpRepeatCheck').checked;
    document.getElementById('repeatUI').style.display = isChecked ? 'block' : 'none';
}

function actionEditTask() {
    const task = state.tasks.find(t => t.id === state.activeOptionsId);
    if (!task) return;

    const group = state.tasks.filter(t => t.groupId === task.groupId);
    group.sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour));
    const first = group[0];

    document.getElementById('modalOptions').style.display = 'none';
    document.getElementById('modalTask').style.display = 'flex';
    document.getElementById('modalTitle').textContent = "Editar Serie";
    document.getElementById('editingGroupId').value = first.groupId;

    document.getElementById('inpCat').value = first.category || first.title.split(' ')[0];
    filterSubcategories(); // Amarrar listas de acuerdo a la categorÃ­a cargada
    document.getElementById('inpSub').value = first.subcategory || '';
    document.getElementById('inpProcess').value = first.process || '';
    document.getElementById('inpDetail').value = first.detail || '';
    document.getElementById('inpMaintType').value = first.maintenanceType || 'preventivo';
    document.getElementById('inpPriority').value = first.priority || 'medium';

    // Cargar Asignaciones leyendo los dÃ­as de cada persona en la serie
    document.getElementById('assignList').innerHTML = '';
    const assignmentsMap = {};
    group.forEach(t => {
        const [y, m, d] = t.date.split('-');
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        (t.assignees || []).forEach(name => {
            if (!assignmentsMap[name]) assignmentsMap[name] = new Set();
            assignmentsMap[name].add(dayOfWeek);
        });
    });

    const names = Object.keys(assignmentsMap);
    if (names.length > 0) {
        names.forEach(name => addAssignRow(name, Array.from(assignmentsMap[name])));
    } else {
        addAssignRow(); // Fila vacÃ­a si no habÃ­a nadie
    }

    // Cargar Recurrencia
    if (first.recurrence) {
        document.getElementById('inpRepeatCheck').checked = first.recurrence.checked;
        document.getElementById('inpRepeatNum').value = first.recurrence.num;
        document.getElementById('inpRepeatUnit').value = first.recurrence.unit;
        document.getElementById('inpRepeatUntil').value = first.recurrence.until;
    } else {
        document.getElementById('inpRepeatCheck').checked = false;
    }
    toggleRepeatUI();

    // Cargar dÃ­as seleccionados
    if (first.selectedDays) {
        [0, 1, 2, 3, 4, 5, 6].forEach(d => document.getElementById(`day-${d}`).checked = first.selectedDays.includes(d));
    }

    // Cargar Costos
    document.getElementById('costList').innerHTML = '';
    if (first.breakdown && Array.isArray(first.breakdown)) {
        first.breakdown.forEach(item => addCostRow(item.name, item.value));
    } else if (first.originalTotal) { addCostRow('Costo General', first.originalTotal); }
    else { addCostRow('Mano de Obra', ''); addCostRow('Repuestos', ''); }
    updateTotalCostDisplay();

    // Cargar Fechas y Horas Originales Base
    document.getElementById('inpDateStart').value = first.baseStartDate || first.date;
    document.getElementById('inpDateEnd').value = first.baseEndDate || group[group.length - 1].date;

    const dayTasks = group.filter(t => t.date === (first.baseStartDate || first.date));
    if (dayTasks.length > 0) {
        document.getElementById('inpStartHour').value = Math.min(...dayTasks.map(t => t.hour));
        document.getElementById('inpEndHour').value = Math.max(...dayTasks.map(t => t.hour)) + 1;
    }
}

function actionDuplicateTask() {
    actionEditTask(); // Carga todos los datos en el modal

    document.getElementById('modalTitle').textContent = "Duplicar Serie";
    document.getElementById('editingGroupId').value = ""; // Al limpiar esto, se crea un nuevo ID y Grupo

    // Ajustar fechas para que empiecen HOY
    const today = new Date();
    const startInput = document.getElementById('inpDateStart');
    const endInput = document.getElementById('inpDateEnd');

    const oldStart = new Date(startInput.value + "T00:00:00");
    const oldEnd = new Date(endInput.value + "T00:00:00");
    const diffTime = Math.abs(oldEnd - oldStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    startInput.value = formatDate(today);

    const newEnd = new Date(today);
    newEnd.setDate(newEnd.getDate() + diffDays);
    endInput.value = formatDate(newEnd);

    // Ajustar la fecha "Hasta" de recurrencia si existe
    const repeatUntilInput = document.getElementById('inpRepeatUntil');
    if (repeatUntilInput.value) {
        const oldUntil = new Date(repeatUntilInput.value + "T00:00:00");
        const diffUntilTime = Math.abs(oldUntil - oldStart);
        const diffUntilDays = Math.ceil(diffUntilTime / (1000 * 60 * 60 * 24));
        const newUntil = new Date(today);
        newUntil.setDate(newUntil.getDate() + diffUntilDays);
        repeatUntilInput.value = formatDate(newUntil);
    }
}

// --- DASHBOARD & UTILS ---
function updateDashboard() {
    // Filtrar solo tareas de la semana actual para mostrar costos reales de la semana
    const s = getStartOfWeek(state.currentDate);
    const e = new Date(s); e.setDate(e.getDate() + 7);

    const visibleTasks = state.tasks.filter(t => {
        const d = new Date(t.date);
        return d >= s && d < e;
    });

    const total = visibleTasks.reduce((a, b) => a + (b.cost || 0), 0);
    document.getElementById('dashCost').textContent = `Q${total.toFixed(2)}`;

    // Calcular desglose proporcional visual
    // Como el cost per slot ya estÃ¡ dividido, podemos intentar reconstruir categorÃ­as
    // Nota: Esto es aproximado si los slots tienen costos parciales.
    let breakdownStats = {};
    visibleTasks.forEach(t => {
        if (t.breakdown) {
            // La tarea tiene un desglose global. Su costo de slot es una fracciÃ³n.
            // Calculamos la fracciÃ³n que representa este slot del total original
            // t.cost = costo de este slot. t.originalTotal = costo total.
            const ratio = t.cost / (t.originalTotal || 1); // CuÃ¡nto pesa este slot

            t.breakdown.forEach(b => {
                if (!breakdownStats[b.name]) breakdownStats[b.name] = 0;
                // Sumamos la parte proporcional de este concepto para esta hora
                if (t.originalTotal > 0) {
                    breakdownStats[b.name] += (b.value * (t.cost / t.originalTotal));
                }
            });
        } else {
            if (!breakdownStats['General']) breakdownStats['General'] = 0;
            breakdownStats['General'] += t.cost;
        }
    });

    let html = '<ul style="padding-left:15px; margin:0;">';
    for (const [key, val] of Object.entries(breakdownStats)) {
        html += `<li><b>${key}:</b> Q${val.toFixed(2)}</li>`;
    }
    html += '</ul>';
    document.getElementById('dashBreakdown').innerHTML = html;

    // --- LÃ“GICA DEL GRÃFICO DE PRIORIDADES ---
    // Filtrar tareas que no estÃ©n terminadas
    const activeTasks = state.tasks.filter(t => t.status === 'planned' || t.status === 'running');

    // Agrupar por groupId para contar el proyecto/serie como 1 sola tarea
    const uniqueTasks = new Map();
    activeTasks.forEach(t => {
        if (!uniqueTasks.has(t.groupId)) {
            uniqueTasks.set(t.groupId, t);
        }
    });

    // Contar prioridades
    const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
    uniqueTasks.forEach(t => {
        const p = t.priority || 'medium';
        if (priorityCounts[p] !== undefined) priorityCounts[p]++;
    });

    // Encontrar el valor mÃ¡ximo para escalar las barras (mÃ­nimo 1 para no dividir por 0)
    const maxCount = Math.max(...Object.values(priorityCounts), 1);

    // Actualizar barras en el DOM
    ['urgent', 'high', 'medium', 'low'].forEach(p => {
        const count = priorityCounts[p];
        const percentage = (count / maxCount) * 100;
        document.getElementById(`bar-${p}`).style.width = `${percentage}%`;
        document.getElementById(`count-${p}`).textContent = count;
    });
}

// --- VISTA TABLA ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const fCat = document.getElementById('filterCat').value.toLowerCase();
    const fSub = document.getElementById('filterSub').value.toLowerCase();

    const groupedTasks = new Map();

    state.tasks.forEach(t => {
        if (!groupedTasks.has(t.groupId)) {
            groupedTasks.set(t.groupId, {
                ...t,
                slots: [t],
                totalCost: t.cost || 0,
                totalSeconds: t.seconds || 0,
                allAssignees: new Set(t.assignees || [])
            });
        } else {
            const group = groupedTasks.get(t.groupId);
            group.slots.push(t);
            group.totalCost += (t.cost || 0);
            group.totalSeconds += (t.seconds || 0);
            (t.assignees || []).forEach(a => group.allAssignees.add(a));
            if (t.status === 'running') group.status = 'running';
        }
    });

    const summaryTasks = Array.from(groupedTasks.values()).map(group => {
        // Ordenar los bloques cronolÃ³gicamente
        group.slots.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);

        const firstSlot = group.slots[0];
        const lastSlot = group.slots[group.slots.length - 1];

        group.startStr = `${firstSlot.date} ${firstSlot.hour}:00`;
        group.endStr = `${lastSlot.date} ${lastSlot.hour + 1}:00`;

        // Llave para ordenar la tabla (por fecha de inicio)
        group.sortKey = firstSlot.date + firstSlot.hour.toString().padStart(2, '0');

        // Si TODOS los bloques estÃ¡n terminados, marcar el grupo como terminado
        if (group.slots.every(s => s.status === 'done')) {
            group.status = 'done';
        }

        return group;
    });

    // 3. Ordenar por fecha de inicio (descendente, lo mÃ¡s nuevo arriba)
    summaryTasks.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    // 4. Aplicar filtros y pintar la tabla
    summaryTasks.forEach(t => {
        const cat = (t.category || t.title.split(' ')[0]).toLowerCase();
        const sub = (t.subcategory || '').toLowerCase();

        if (fCat && !cat.includes(fCat)) return;
        if (fSub && !sub.includes(fSub)) return;

        let typeLabel = '-';
        if (t.maintenanceType) {
            typeLabel = (t.maintenanceType === 'preventivo' ? 'ðŸ›¡ï¸ ' : (t.maintenanceType === 'correctivo' ? 'ðŸ”§ ' : 'ðŸ—ï¸ ')) +
                t.maintenanceType.charAt(0).toUpperCase() + t.maintenanceType.slice(1);
        }

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => openOptionsById(t.id);
        const assigneesArr = Array.from(t.allAssignees);
        const assignStr = assigneesArr.length > 0 ? assigneesArr.join(', ') : '<span style="color:#888; font-style:italic;">Sin asignar</span>';

        tr.innerHTML = `
                    <td><span class="task-id-badge">${t.taskCode || 'N/A'}</span></td>
                    <td>${typeLabel}</td>
                    <td>${t.startStr}</td>
                    <td>${t.endStr}</td>
                    <td style="color:${stringToColor(t.category || cat)}; font-weight:bold;">${t.category || cat.toUpperCase()}</td>
                    <td>${t.subcategory || ''}</td>
                    <td>${assignStr}</td>
                    <td>${t.detail || t.title}</td>
                    <td>Q${t.totalCost.toFixed(2)}</td>
                    <td style="font-family:monospace;">${formatTime(t.totalSeconds)}</td>
                    <td>${t.status === 'done' ? 'âœ…' : (t.status === 'running' ? 'â–¶ï¸' : 'ðŸ“…')}</td>
                `;
        tbody.appendChild(tr);
    });
}

// --- VISTA LÃDERES ---
function renderLeaders() {
    const container = document.getElementById('leadersContainer');
    container.innerHTML = '';

    // Agrupar tareas Ãºnicas por groupId
    const uniqueGroups = new Map();
    state.tasks.forEach(t => {
        if (!uniqueGroups.has(t.groupId)) {
            uniqueGroups.set(t.groupId, {
                ...t,
                totalSecs: 0,
                allAssignees: new Set(t.assignees || [])
            });
        } else {
            const g = uniqueGroups.get(t.groupId);
            g.totalSecs += (t.seconds || 0);
            (t.assignees || []).forEach(a => g.allAssignees.add(a));
        }
    });

    const unassignedGroups = [];
    const leadersMap = new Map();

    uniqueGroups.forEach(g => {
        if (g.allAssignees.size === 0) {
            unassignedGroups.push(g);
        } else {
            g.allAssignees.forEach(leader => {
                if (!leadersMap.has(leader)) leadersMap.set(leader, []);
                leadersMap.get(leader).push(g);
            });
        }
    });

    // 1. RENDERIZAR BANDEJA DE TAREAS SIN ASIGNAR
    let html = '';
    if (unassignedGroups.length > 0) {
        html += `
                    <div class="leader-card" style="border: 1px solid #f44336; background: rgba(244, 67, 54, 0.05);">
                        <h3 style="color:#f44336; margin-top:0; border-bottom:1px solid #f44336; padding-bottom:10px;">âš ï¸ Tareas Sin AsignaciÃ³n</h3>
                `;

        unassignedGroups.forEach(g => {
            const typeIcon = g.maintenanceType === 'preventivo' ? 'ðŸ›¡ï¸' : (g.maintenanceType === 'correctivo' ? 'ðŸ”§' : (g.maintenanceType === 'proyecto' ? 'ðŸ—ï¸' : ''));
            html += `
                        <div style="background:#1e1e1e; padding:12px; border-radius:6px; margin-bottom:10px; border:1px solid #444; cursor:pointer;" onclick="openOptionsById(${g.id})">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <span style="font-size:1.2em;" title="${g.maintenanceType}">${typeIcon}</span>
                                    <span class="task-id-badge" style="margin: 0 5px;">${g.taskCode || '-'}</span>
                                    <b style="color:${stringToColor(g.category)}">${g.category}</b>
                                </div>
                                <span style="font-size:0.8em; color:#aaa; background:#333; padding:2px 6px; border-radius:4px;">${g.date}</span>
                            </div>
                            <div style="font-size:0.85em; color:#aaa; margin:5px 0 10px 0;">${g.detail || g.subcategory || 'Sin detalles adicionales'}</div>
                            
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="quickAssign_${g.groupId}" list="leadersList" placeholder="TÃ©cnico(s) separados por coma..." class="input-dark" style="padding:8px; flex:1;" onclick="event.stopPropagation()">
                                <button class="btn btn-save" style="padding:8px 15px; flex:0 0 auto;" onclick="event.stopPropagation(); quickAssign('${g.groupId}')">Asignar</button>
                            </div>
                        </div>
                    `;
        });
        html += `</div>`;
    }

    // 2. RENDERIZAR TAREAS ASIGNADAS POR LÃDER
    const sortedLeaders = Array.from(leadersMap.keys()).sort((a, b) => a.localeCompare(b));

    sortedLeaders.forEach(leader => {
        const tasks = leadersMap.get(leader);
        html += `
                    <div class="leader-card">
                        <div class="leader-header">
                            <h3 style="margin:0; color:var(--accent);">ðŸ‘¤ ${leader}</h3>
                            <span style="background:#333; padding:4px 10px; border-radius:12px; font-size:0.8em; font-weight:bold;">${tasks.length} proyectos</span>
                        </div>
                        <table class="data-table" style="font-size:0.85em; margin-top:10px;">
                            <thead><tr><th>ID</th><th>Tipo/Prio</th><th>Tarea</th><th>Estado / Tiempo</th></tr></thead>
                            <tbody>
                `;

        tasks.forEach(t => {
            const prioColor = t.priority === 'urgent' ? '#ff003c' : (t.priority === 'high' ? '#fffb00' : (t.priority === 'medium' ? '#00e5ff' : '#81c784'));
            const typeIcon = t.maintenanceType === 'preventivo' ? 'ðŸ›¡ï¸' : (t.maintenanceType === 'correctivo' ? 'ðŸ”§' : (t.maintenanceType === 'proyecto' ? 'ðŸ—ï¸' : ''));

            html += `
                        <tr style="cursor:pointer;" onclick="openOptionsById(${t.id})">
                            <td><span class="task-id-badge">${t.taskCode || '-'}</span></td>
                            <td style="text-align:center;">
                                <div style="font-size:1.2em; margin-bottom:4px;" title="${t.maintenanceType || ''}">${typeIcon}</div>
                                <div style="width:12px; height:12px; border-radius:50%; background:${prioColor}; box-shadow: 0 0 5px ${prioColor}; margin:auto;"></div>
                            </td>
                            <td><b>${t.category}</b><br><span style="color:#aaa">${t.detail || t.subcategory}</span></td>
                            <td>
                                ${t.status === 'done' ? 'âœ… Finalizada' : (t.status === 'running' ? 'â–¶ï¸ En Progreso' : 'ðŸ“… Pendiente')}
                                ${t.totalSecs > 0 ? `<br><span style="font-family:monospace; color:#888;">â±ï¸ ${formatTime(t.totalSecs)}</span>` : ''}
                            </td>
                        </tr>
                    `;
        });

        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
}

// NUEVA FUNCIÃ“N: AsignaciÃ³n rÃ¡pida desde la bandeja de "Sin asignar"
function quickAssign(groupId) {
    const input = document.getElementById(`quickAssign_${groupId}`);
    const val = input.value.trim();
    if (!val) return alert("Escriba al menos un nombre.");

    const names = val.split(',').map(n => n.trim()).filter(Boolean);

    let found = false;
    state.tasks.forEach(t => {
        if (t.groupId === groupId) {
            // Reemplaza o agrega a todos los bloques de la serie
            t.assignees = names;
            found = true;
        }
    });

    if (found) {
        saveLocal();
        renderApp();
    }
}

// --- HELPERS ---
function openOptions(task) {
    state.activeOptionsId = task.id;
    document.getElementById('optTitle').textContent = task.category || task.title;
    document.getElementById('optSub').textContent = `${task.subcategory || ''} - ${task.detail || ''}`;
    document.getElementById('modalOptions').style.display = 'flex';
}

function openOptionsById(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) openOptions(task);
}

function actionStartTimer() {
    const task = state.tasks.find(t => t.id === state.activeOptionsId);
    document.getElementById('modalOptions').style.display = 'none';

    if (task.status === 'running') {
        // Detener tarea
        task.status = 'done';
        stopTimer();
        saveLocal();
        renderApp();
    } else {
        if (state.activeTaskId) stopTimer();

        // --- MAGIA: Mover tarea al dÃ­a y hora actuales ---
        const now = new Date();
        task.date = formatDate(now);
        task.hour = now.getHours();

        task.status = 'running';
        state.activeTaskId = task.id;

        // Forzar la vista a la semana/mes actual para ver la tarea moverse
        state.currentDate = new Date();

        startTimer();
        saveLocal();
        renderApp();

        // Scroll automÃ¡tico para centrar la pantalla en la tarea en progreso
        setTimeout(() => {
            const hourEl = document.getElementById(`hour-${task.hour}`);
            if (hourEl) hourEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
    }
}
function actionDeleteTask() {
    const task = state.tasks.find(t => t.id === state.activeOptionsId);
    if (confirm("Â¿Eliminar toda la serie?")) {
        state.tasks = state.tasks.filter(t => t.groupId !== task.groupId);
        saveLocal(); renderApp();
        document.getElementById('modalOptions').style.display = 'none';
    }
}
function startTimer() { if (state.timer) clearInterval(state.timer); state.timer = setInterval(() => { const t = state.tasks.find(x => x.id === state.activeTaskId); if (t) { t.seconds++; renderApp(); saveLocal(); } }, 1000); }
function stopTimer() { clearInterval(state.timer); state.activeTaskId = null; }
function restoreTimer() { const r = state.tasks.find(t => t.status === 'running'); if (r) { state.activeTaskId = r.id; startTimer(); } }
function switchView(viewName, btn) { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view')); document.getElementById(viewName + '-view').classList.add('active-view'); document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active')); if (btn) btn.classList.add('active'); }
function updateLunchTime() { state.lunchHour = parseInt(document.getElementById('lunchSelector').value); localStorage.setItem('lunchHour', state.lunchHour); renderApp(); }
function changeViewMode() { state.viewMode = document.getElementById('viewSelector').value; localStorage.setItem('viewMode', state.viewMode); renderApp(); }

// Actualizamos saveLocal para guardar configuraciones
function saveLocal() {
    localStorage.setItem('tasks', JSON.stringify(state.tasks));
    localStorage.setItem('defaultCategories', JSON.stringify(state.defaultCategories));
    localStorage.setItem('defaultSubcategories', JSON.stringify(state.defaultSubcategories));
    localStorage.setItem('defaultLeaders', JSON.stringify(state.defaultLeaders));
    localStorage.setItem('defaultProcesses', JSON.stringify(state.defaultProcesses));
    localStorage.setItem('shifts', JSON.stringify(state.shifts));
    localStorage.setItem('managerName', state.managerName);
}

function closeModal() { document.getElementById('modalTask').style.display = 'none'; }
function populateHourSelects() { let html = ''; for (let i = 0; i <= 23; i++) html += `<option value="${i}">${i}:00</option>`; document.getElementById('inpStartHour').innerHTML = html; document.getElementById('inpEndHour').innerHTML = html; }
function getStartOfWeek(d) { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff)); }
function formatDate(d) { return d.toISOString().split('T')[0]; }
function isSameDay(d1, d2) { return formatDate(d1) === formatDate(d2); }
function createDiv(cls, html) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }

// Nueva funciÃ³n para el botÃ³n Hoy
function goToToday() {
    state.currentDate = new Date();
    renderApp();

    // Forzar vista de calendario si estaba en otra pestaÃ±a
    switchView('calendar', document.querySelector('.tab-btn'));

    // Auto-scroll a las 7:00 AM
    setTimeout(() => {
        const startHourEl = document.getElementById('hour-7');
        if (startHourEl) startHourEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
}

function changeDate(n) {
    if (state.viewMode === 'week') {
        state.currentDate.setDate(state.currentDate.getDate() + (n * 7));
    } else {
        state.currentDate.setMonth(state.currentDate.getMonth() + n);
    }
    renderApp();
}

function stringToColor(str) { let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return `hsl(${hash % 360}, 60%, 45%)`; }
function formatTime(s) { return new Date(s * 1000).toISOString().substr(11, 8); }
function getWeekNumber(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }

function renderHeader() {
    if (state.viewMode === 'week') {
        const s = getStartOfWeek(state.currentDate); const e = new Date(s); e.setDate(e.getDate() + 6);
        document.getElementById('weekLabel').textContent = `Semana ${getWeekNumber(s)}`;
        document.getElementById('monthLabel').textContent = `${s.getDate()} ${s.toLocaleDateString('es', { month: 'short' })} - ${e.getDate()} ${e.toLocaleDateString('es', { month: 'short' })}`;
    } else {
        document.getElementById('weekLabel').textContent = state.currentDate.toLocaleDateString('es', { month: 'long', year: 'numeric' }).toUpperCase();
        document.getElementById('monthLabel').textContent = 'Vista Mensual';
    }
}

// Modificado para fusionar tareas actuales con configuraciones por defecto
function updateDatalists() {
    const dynCats = state.tasks.map(t => t.category || t.title.split(' ')[0]);
    const cats = [...new Set([...dynCats, ...state.defaultCategories])].filter(Boolean);
    const optsCats = cats.map(c => `<option value="${c}">`).join('');
    document.getElementById('catList').innerHTML = optsCats;
    document.getElementById('catListRef').innerHTML = optsCats;

    // Reubicamos el seteo de subcategorÃ­as en una funciÃ³n atada a la categorÃ­a
    filterSubcategories();

    // Extraer lÃ­deres de los arrays assignees
    const dynLeaders = [];
    state.tasks.forEach(t => { if (t.assignees) dynLeaders.push(...t.assignees); });
    const leaders = [...new Set([...dynLeaders, ...state.defaultLeaders])].filter(Boolean);
    const optsLeaders = leaders.map(l => `<option value="${l}">`).join('');
    if (document.getElementById('leadersList')) document.getElementById('leadersList').innerHTML = optsLeaders;
}

// NUEVA FUNCIÃ“N: Amarra las subcategorÃ­as (secciones) a la categorÃ­a (mÃ¡quina)
function filterSubcategories() {
    const catInput = document.getElementById('inpCat');
    if (!catInput) return; // Por si acaso estemos en otra vista

    const cat = catInput.value.trim().toLowerCase();
    let subs = [];

    if (!cat) {
        // Si estÃ¡ vacÃ­o, mostrar todas (dinÃ¡micas histÃ³ricas y las default)
        const dynSubs = state.tasks.map(t => t.subcategory);
        subs = [...new Set([...dynSubs, ...state.defaultSubcategories])].filter(Boolean);
    } else {
        // Filtrar solo las que coincidan histÃ³ricamente con esta mÃ¡quina
        const dynSubsForCat = state.tasks
            .filter(t => (t.category || t.title.split(' ')[0]).toLowerCase() === cat)
            .map(t => t.subcategory)
            .filter(Boolean);

        if (dynSubsForCat.length > 0) {
            subs = [...new Set(dynSubsForCat)];
        } else {
            // MÃ¡quina nueva, no tiene subcategorÃ­as previas, mostrar defaults de secciones.
            subs = [...new Set([...state.defaultSubcategories])].filter(Boolean);
        }
    }

    const optsSubs = subs.map(c => `<option value="${c}">`).join('');
    const subListRef = document.getElementById('subListRef');
    if (subListRef) subListRef.innerHTML = optsSubs;
}

// --- FUNCIONES DE CONFIGURACIÃ“N ---
function renderConfigLists() {
    const renderList = (arr, containerId, type) => {
        if (!arr || arr.length === 0) {
            document.getElementById(containerId).innerHTML = '<span style="color:#888; font-style:italic; padding:10px; display:block;">No hay elementos. Agrega uno arriba.</span>';
            return;
        }
        const html = arr.map((item, index) => `
                    <div style="background:#222; border:1px solid #444; padding:4px 10px; border-radius:15px; display:inline-flex; align-items:center; gap:8px; font-size:0.9em;">
                        <span>${item}</span>
                        <button style="background:none; border:none; color:#f44336; cursor:pointer; font-weight:bold; font-size:1.2em; padding:0; margin:0; line-height:1;" onclick="removeDefault('${type}', ${index})">&times;</button>
                    </div>
                `).join('');
        document.getElementById(containerId).innerHTML = html;
    };

    renderList(state.defaultCategories, 'listDefaultCats', 'categories');
    renderList(state.defaultSubcategories, 'listDefaultSubs', 'subcategories');
    renderList(state.defaultProcesses, 'listDefaultProcesses', 'processes');
    renderList(state.defaultLeaders, 'listDefaultLeaders', 'leaders');

    // NUEVO: Renderizar lista de turnos
    const dayNamesLong = ['Domingo', 'Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado'];
    let shiftsHtml = '';
    for (let d = 0; d < 7; d++) {
        if (state.shifts[d] && state.shifts[d].length > 0) {
            shiftsHtml += `<div style="margin-bottom: 8px;"><strong style="color:var(--accent); display:inline-block; width:75px;">${dayNamesLong[d]}:</strong> `;
            state.shifts[d].forEach((ldr, idx) => {
                shiftsHtml += `<span style="background:#333; padding:3px 8px; border-radius:12px; margin-right:5px; display:inline-block; margin-bottom:4px;">${ldr} <span style="color:#f44336; cursor:pointer; margin-left:5px; font-weight:bold;" onclick="removeShift(${d}, ${idx})">Ã—</span></span>`;
            });
            shiftsHtml += `</div>`;
        }
    }
    document.getElementById('listShifts').innerHTML = shiftsHtml || '<span style="color:#888; font-style:italic;">Sin turnos configurados.</span>';
}

// NUEVO: Funciones de manejo de turnos
function addShift() {
    const day = document.getElementById('shiftDay').value;
    const leader = document.getElementById('shiftLeader').value.trim();
    if (!leader) return;
    if (!state.shifts[day]) state.shifts[day] = [];
    if (!state.shifts[day].includes(leader)) {
        state.shifts[day].push(leader);
        saveLocal();
        renderConfigLists();
        renderGrid(); // Refrescar solo el calendario para ver el cambio
    }
    document.getElementById('shiftLeader').value = '';
}

function removeShift(day, index) {
    state.shifts[day].splice(index, 1);
    saveLocal();
    renderConfigLists();
    renderGrid();
}

function addDefault(type, inputId) {
    const val = document.getElementById(inputId).value.trim();
    if (!val) return;

    if (type === 'categories' && !state.defaultCategories.includes(val)) state.defaultCategories.push(val);
    if (type === 'subcategories' && !state.defaultSubcategories.includes(val)) state.defaultSubcategories.push(val);
    if (type === 'processes' && !state.defaultProcesses.includes(val)) state.defaultProcesses.push(val);
    if (type === 'leaders' && !state.defaultLeaders.includes(val)) state.defaultLeaders.push(val);

    document.getElementById(inputId).value = ''; // Limpiar input
    saveLocal();
    renderConfigLists();
    updateDatalists(); // Refrescar los selectores/datalists globalmente
}

function removeDefault(type, index) {
    if (type === 'categories') state.defaultCategories.splice(index, 1);
    if (type === 'subcategories') state.defaultSubcategories.splice(index, 1);
    if (type === 'processes') state.defaultProcesses.splice(index, 1);
    if (type === 'leaders') state.defaultLeaders.splice(index, 1);

    saveLocal();
    renderConfigLists();
    updateDatalists();
}

// --- FUNCIONES DE IMPORTACIÃ“N CSV ---
let csvData = null;

function openCSVImporter() {
    document.getElementById('modalCSV').style.display = 'flex';
    document.getElementById('csvManagerName').value = state.managerName;
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('csvTypeSection').style.display = 'none';
    document.getElementById('csvResults').style.display = 'none';
    document.getElementById('btnImportCSV').disabled = true;
}

function closeCSVModal() {
    document.getElementById('modalCSV').style.display = 'none';
    csvData = null;
}

function previewCSV() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        if (lines.length < 2) {
            alert('El archivo CSV debe tener al menos un encabezado y una fila de datos.');
            return;
        }

        // Parsear CSV simple (asume delimitador de coma)
        const rows = lines.map(line => {
            const cells = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    cells.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            cells.push(current.trim());
            return cells;
        });

        const headers = rows[0].map(h => h.replace(/"/g, '').trim());
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = row[i] ? row[i].replace(/"/g, '').trim() : '';
            });
            return obj;
        });

        csvData = { headers, data };

        // Filtrar por gerente
        const managerName = document.getElementById('csvManagerName').value.trim();
        const encargadoCol = headers.find(h => h.toLowerCase().includes('encargado'));

        let filteredData = data;
        if (managerName && encargadoCol) {
            filteredData = data.filter(row => row[encargadoCol] === managerName);
        }

        // Mostrar estadÃ­sticas
        document.getElementById('csvStats').innerHTML = `
                    ðŸ“Š <b>Total de filas:</b> ${data.length}<br>
                    ${managerName ? `âœ… <b>Filas del gerente "${managerName}":</b> ${filteredData.length}<br>` : ''}
                    ${managerName && filteredData.length < data.length ? `âŒ <b>Filas descartadas:</b> ${data.length - filteredData.length}` : ''}
                `;

        document.getElementById('csvPreview').style.display = 'block';
        document.getElementById('csvTypeSection').style.display = 'block';
        document.getElementById('btnImportCSV').disabled = false;

        // Guardar datos filtrados
        csvData.filteredData = filteredData;
    };
    reader.readAsText(file);
}

function selectImportType(type) {
    document.querySelectorAll('input[name="importType"]').forEach(r => {
        r.checked = (r.value === type);
        r.parentElement.style.border = r.checked ? '2px solid var(--accent)' : '2px solid transparent';
    });
}

function executeCSVImport() {
    if (!csvData || !csvData.filteredData) return;

    const managerName = document.getElementById('csvManagerName').value.trim();
    const importType = document.querySelector('input[name="importType"]:checked').value;
    const data = csvData.filteredData;

    // Guardar nombre del gerente
    if (managerName) {
        state.managerName = managerName;
    }

    // Extraer valores Ãºnicos
    const categories = new Set();
    const subcategories = new Set();
    const processes = new Set();
    const leaders = new Set();

    const maqCol = csvData.headers.find(h => h.toLowerCase().includes('maquina'));
    const secCol = csvData.headers.find(h => h.toLowerCase().includes('seccion'));
    const depCol = csvData.headers.find(h => h.toLowerCase().includes('departamento'));
    const autCol = csvData.headers.find(h => h.toLowerCase().includes('autorizador'));

    data.forEach(row => {
        if (maqCol && row[maqCol]) categories.add(row[maqCol]);
        if (secCol && row[secCol]) subcategories.add(row[secCol]);
        if (depCol && row[depCol]) processes.add(row[depCol]);
        if (autCol && row[autCol]) leaders.add(row[autCol]);
    });

    // Fusionar con listas existentes
    const newCats = [...categories].filter(c => !state.defaultCategories.includes(c));
    const newSubs = [...subcategories].filter(s => !state.defaultSubcategories.includes(s));
    const newProcs = [...processes].filter(p => !state.defaultProcesses.includes(p));
    const newLeaders = [...leaders].filter(l => !state.defaultLeaders.includes(l));

    state.defaultCategories.push(...newCats);
    state.defaultSubcategories.push(...newSubs);
    state.defaultProcesses.push(...newProcs);
    state.defaultLeaders.push(...newLeaders);

    // Mostrar resultados
    let resultsHTML = `
                <p><b>ðŸ“Š Resultados de la importaciÃ³n:</b></p>
                <ul style="margin:5px 0; padding-left:20px; font-size:0.9em;">
                    <li>${categories.size} categorÃ­as encontradas (${newCats.length} nuevas)</li>
                    <li>${subcategories.size} subcategorÃ­as encontradas (${newSubs.length} nuevas)</li>
                    <li>${processes.size} procesos encontrados (${newProcs.length} nuevos)</li>
                    <li>${leaders.size} tÃ©cnicos encontrados (${newLeaders.length} nuevos)</li>
                    <li>${data.length} filas procesadas</li>
                </ul>
            `;

    // OPCIÃ“N B: IMPORTAR HISTORIAL (tareas completadas con fechas originales)
    if (importType === 'B') {
        const fechaCol = csvData.headers.find(h => h.toLowerCase().includes('fecha') && h.toLowerCase().includes('contabiliz'));
        const descCol = csvData.headers.find(h => h.toLowerCase().includes('descripcion'));

        if (!fechaCol) {
            resultsHTML += `<p style="color:#f44336;">âŒ Error: No se encontrÃ³ columna de "Fecha Contabilizacion" en el CSV.</p>`;
        } else {
            let tasksCreated = 0;
            const tasksByDate = new Map(); // Para distribuir horarios

            // Generar cÃ³digo de tarea base
            const codes = state.tasks.map(t => parseInt((t.taskCode || 'T-0').replace('T-', '')) || 0);
            let nextTaskNum = (codes.length > 0 ? Math.max(...codes) : 0) + 1;

            data.forEach(row => {
                // Parsear fecha (formato: "2/1/2023" o similar)
                const fechaStr = row[fechaCol];
                if (!fechaStr) return;

                const dateParts = fechaStr.split('/');
                if (dateParts.length !== 3) return;

                const [month, day, year] = dateParts;
                const taskDate = new Date(year, month - 1, day);
                const dateStr = formatDate(taskDate);

                // Asignar hora: distribuir desde 00:00 hasta 06:00 si hay varias el mismo dÃ­a
                if (!tasksByDate.has(dateStr)) tasksByDate.set(dateStr, []);
                const tasksOnDate = tasksByDate.get(dateStr);
                const hour = Math.min(tasksOnDate.length, 6); // 00:00 a 06:00
                tasksOnDate.push(hour);

                const groupId = 'GRP_CSV_B_' + Date.now() + '_' + tasksCreated;
                const taskCode = `T-${nextTaskNum.toString().padStart(3, '0')}`;
                nextTaskNum++;

                state.tasks.push({
                    id: Date.now() + Math.random(),
                    groupId: groupId,
                    date: dateStr,
                    hour: hour,
                    category: row[maqCol] || 'Importado',
                    subcategory: row[secCol] || '',
                    process: row[depCol] || '',
                    detail: row[descCol] || 'Mantenimiento registrado',
                    maintenanceType: 'correctivo',
                    priority: 'medium',
                    title: `${row[maqCol] || 'Importado'} ${row[secCol] || ''}`,
                    taskCode: taskCode,
                    assignees: row[autCol] ? [row[autCol]] : [],
                    cost: 0,
                    originalTotal: 0,
                    breakdown: [],
                    selectedDays: [taskDate.getDay()],
                    recurrence: null,
                    baseStartDate: dateStr,
                    baseEndDate: dateStr,
                    status: 'done', // âœ… Marcada como completada
                    seconds: 0
                });

                tasksCreated++;
            });

            resultsHTML += `<p style="color:#4caf50;">âœ… <b>${tasksCreated}</b> tareas histÃ³ricas creadas y marcadas como completadas.</p>`;
            resultsHTML += `<p style="font-size:0.85em; color:#aaa;">Las tareas fueron distribuidas en horarios de 00:00 a 06:00 segÃºn la cantidad por dÃ­a.</p>`;
        }
    }

    // OPCIÃ“N C: CREAR PLANTILLAS FUTURAS CON ANÃLISIS PREDICTIVO
    if (importType === 'C') {
        const fechaCol = csvData.headers.find(h => h.toLowerCase().includes('fecha') && h.toLowerCase().includes('contabiliz'));
        const descCol = csvData.headers.find(h => h.toLowerCase().includes('descripcion'));

        if (!fechaCol) {
            resultsHTML += `<p style="color:#f44336;">âŒ Error: No se encontrÃ³ columna de "Fecha Contabilizacion" en el CSV.</p>`;
        } else {
            // Agrupar por identificador Ãºnico (Maquinaria + Seccion + Departamento + Descripcion)
            const groupedRecords = new Map();

            data.forEach(row => {
                const key = `${row[maqCol] || ''}_${row[secCol] || ''}_${row[depCol] || ''}_${row[descCol] || ''}`;
                if (!groupedRecords.has(key)) {
                    groupedRecords.set(key, {
                        category: row[maqCol] || 'Importado',
                        subcategory: row[secCol] || '',
                        process: row[depCol] || '',
                        detail: row[descCol] || 'Mantenimiento',
                        leader: row[autCol] || '',
                        dates: []
                    });
                }

                // Parsear fecha
                const fechaStr = row[fechaCol];
                if (fechaStr) {
                    const dateParts = fechaStr.split('/');
                    if (dateParts.length === 3) {
                        const [month, day, year] = dateParts;
                        const date = new Date(year, month - 1, day);
                        groupedRecords.get(key).dates.push(date);
                    }
                }
            });

            // Analizar frecuencia y proyectar
            let tasksCreated = 0;
            let analysisHTML = '<div style="margin-top:15px; padding:15px; background:#1a1a1a; border-radius:8px; border:1px solid #333;"><h4 style="margin-top:0; color:var(--accent);">ðŸ“ˆ AnÃ¡lisis de Frecuencia</h4>';

            const codes = state.tasks.map(t => parseInt((t.taskCode || 'T-0').replace('T-', '')) || 0);
            let nextTaskNum = (codes.length > 0 ? Math.max(...codes) : 0) + 1;
            const today = new Date();

            groupedRecords.forEach((record, key) => {
                if (record.dates.length === 0) return;

                // Ordenar fechas
                record.dates.sort((a, b) => a - b);
                const lastDate = record.dates[record.dates.length - 1];

                // Calcular frecuencia promedio (intervalos entre mantenimientos)
                let intervals = [];
                for (let i = 1; i < record.dates.length; i++) {
                    const diffDays = Math.round((record.dates[i] - record.dates[i - 1]) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) intervals.push(diffDays);
                }

                let avgFrequency = 30; // Default: 30 dÃ­as
                if (intervals.length > 0) {
                    avgFrequency = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
                }

                // Calcular fecha proyectada
                const projectedDate = new Date(lastDate);
                projectedDate.setDate(projectedDate.getDate() + avgFrequency);

                // Si la fecha proyectada ya pasÃ³, programar para maÃ±ana
                const taskDate = projectedDate > today ? projectedDate : new Date(today.getTime() + 24 * 60 * 60 * 1000);
                const dateStr = formatDate(taskDate);

                // Crear tarea
                const groupId = 'GRP_CSV_C_' + Date.now() + '_' + tasksCreated;
                const taskCode = `T-${nextTaskNum.toString().padStart(3, '0')}`;
                nextTaskNum++;

                state.tasks.push({
                    id: Date.now() + Math.random(),
                    groupId: groupId,
                    date: dateStr,
                    hour: 0, // 00:00 por defecto
                    category: record.category,
                    subcategory: record.subcategory,
                    process: record.process,
                    detail: `${record.detail} (Proyectada cada ${avgFrequency} dÃ­as)`,
                    maintenanceType: 'preventivo',
                    priority: 'medium',
                    title: `${record.category} ${record.subcategory}`,
                    taskCode: taskCode,
                    assignees: record.leader ? [record.leader] : [],
                    cost: 0,
                    originalTotal: 0,
                    breakdown: [],
                    selectedDays: [taskDate.getDay()],
                    recurrence: null,
                    baseStartDate: dateStr,
                    baseEndDate: dateStr,
                    status: 'planned', // ðŸ“… Tarea futura
                    seconds: 0
                });

                // Agregar al anÃ¡lisis
                const displayFreq = avgFrequency === 30 && intervals.length === 0 ? 'Por defecto: 30 dÃ­as' : `Cada ${avgFrequency} dÃ­as`;
                analysisHTML += `
                            <div style="background:#222; padding:12px; border-radius:6px; margin-bottom:10px; border-left:4px solid ${stringToColor(record.category)};">
                                <div style="font-weight:bold; color:${stringToColor(record.category)}; margin-bottom:5px;">${record.category} - ${record.subcategory}</div>
                                <div style="font-size:0.85em; color:#aaa; margin-bottom:8px;">${record.detail}</div>
                                <div style="display:grid; grid-template-columns: auto 1fr; gap:8px; font-size:0.85em;">
                                    <span style="color:#888;">Ãšltima vez:</span>
                                    <span style="color:#fff;">${lastDate.toLocaleDateString('es')}</span>
                                    
                                    <span style="color:#888;">Frecuencia:</span>
                                    <span style="color:#88d8b0;">${displayFreq}</span>
                                    
                                    <span style="color:#888;">ðŸ“… Se PROYECTA para:</span>
                                    <span style="color:#00bcd4; font-weight:bold;">${taskDate.toLocaleDateString('es')}</span>
                                </div>
                            </div>
                        `;

                tasksCreated++;
            });

            analysisHTML += '</div>';

            resultsHTML += `<p style="color:#4caf50;">âœ… <b>${tasksCreated}</b> tareas proyectadas creadas desde HOY en adelante.</p>`;
            resultsHTML += `<p style="font-size:0.85em; color:#aaa;">Basadas en ${data.length} registros histÃ³ricos. El usuario puede ajustar fechas despuÃ©s.</p>`;
            resultsHTML += analysisHTML;
        }
    }

    document.getElementById('csvResultsContent').innerHTML = resultsHTML;
    document.getElementById('csvResults').style.display = 'block';

    saveLocal();
    renderConfigLists();
    updateDatalists();
}

// --- FUNCIONES DE IMPORTACIÃ“N DE TEXTO ---
function openTextImporter() {
    document.getElementById('modalText').style.display = 'flex';
    document.getElementById('textImportArea').value = '';
    document.getElementById('textPreview').innerHTML = '';
}

function closeTextModal() {
    document.getElementById('modalText').style.display = 'none';
}

function previewTextImport() {
    const text = document.getElementById('textImportArea').value;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];

    const preview = document.getElementById('textPreview');
    if (lines.length === 0) {
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = `
                ðŸ“Š <b>${lines.length}</b> lÃ­neas detectadas<br>
                âœ“ <b>${unique.length}</b> elementos Ãºnicos<br>
                ${lines.length !== unique.length ? `<span style="color:#ffb74d;">âš ï¸ ${lines.length - unique.length} duplicados eliminados</span>` : ''}
            `;
}

function executeTextImport() {
    const type = document.getElementById('textImportType').value;
    const text = document.getElementById('textImportArea').value;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];

    if (unique.length === 0) {
        return alert('No hay datos para importar.');
    }

    let targetArray, added = 0;
    if (type === 'categories') targetArray = state.defaultCategories;
    else if (type === 'subcategories') targetArray = state.defaultSubcategories;
    else if (type === 'processes') targetArray = state.defaultProcesses;
    else if (type === 'leaders') targetArray = state.defaultLeaders;

    unique.forEach(item => {
        if (!targetArray.includes(item)) {
            targetArray.push(item);
            added++;
        }
    });

    saveLocal();
    renderConfigLists();
    updateDatalists();
    closeTextModal();

    alert(`âœ… ImportaciÃ³n exitosa!\n\n${added} elementos nuevos agregados a ${type === 'categories' ? 'CategorÃ­as' : type === 'subcategories' ? 'SubcategorÃ­as' : type === 'processes' ? 'Procesos' : 'LÃ­deres'}.`);
}

// Actualizar datalist de procesos
function updateDatalists() {
    const dynCats = state.tasks.map(t => t.category || t.title.split(' ')[0]);
    const cats = [...new Set([...dynCats, ...state.defaultCategories])].filter(Boolean);
    const optsCats = cats.map(c => `<option value="${c}">`).join('');
    document.getElementById('catList').innerHTML = optsCats;
    document.getElementById('catListRef').innerHTML = optsCats;

    const dynSubs = state.tasks.map(t => t.subcategory);
    const subs = [...new Set([...dynSubs, ...state.defaultSubcategories])].filter(Boolean);
    const optsSubs = subs.map(c => `<option value="${c}">`).join('');
    if (document.getElementById('subListRef')) document.getElementById('subListRef').innerHTML = optsSubs;

    const dynProcs = state.tasks.map(t => t.process);
    const procs = [...new Set([...dynProcs, ...state.defaultProcesses])].filter(Boolean);
    const optsProcs = procs.map(p => `<option value="${p}">`).join('');
    if (document.getElementById('processListRef')) document.getElementById('processListRef').innerHTML = optsProcs;

    // Extraer lÃ­deres de los arrays assignees
    const dynLeaders = [];
    state.tasks.forEach(t => { if (t.assignees) dynLeaders.push(...t.assignees); });
    const leaders = [...new Set([...dynLeaders, ...state.defaultLeaders])].filter(Boolean);
    const optsLeaders = leaders.map(l => `<option value="${l}">`).join('');
    if (document.getElementById('leadersList')) document.getElementById('leadersList').innerHTML = optsLeaders;
}

function exportCSV() { /* Export logic */ }
function handleAuth() { alert("Configurar API Google"); }
function gapiLoaded() { } function gisLoaded() { }

