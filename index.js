
// @ts-nocheck
document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;

    // --- STATE MANAGEMENT ---
    let state = {
        currentDate: new Date(),
        timeEntries: {},
        compensationHours: '00:00',
        leaveDays: 0,
    };
    
    let undoStack = [];
    let redoStack = [];

    // --- CONSTANTS & HELPERS ---
    const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const WEEK_DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const HOURS_PER_DAY = 8;

    const parseTimeToMinutes = (time) => {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const formatMinutesToTime = (totalMinutes, showSign = false) => {
        const sign = totalMinutes < 0 ? "-" : (showSign ? "+" : "");
        const absMinutes = Math.abs(totalMinutes);
        const hours = Math.floor(absMinutes / 60);
        const minutes = absMinutes % 60;
        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // --- DOM SELECTORS ---
    const monthlyConfigContainer = document.getElementById('monthly-config-container');
    const dailyEntriesContainer = document.getElementById('daily-entries-container');
    const summaryContainer = document.getElementById('summary-container');

    // --- DATA CALCULATION LOGIC ---
    const calculateDerivedData = () => {
        const { currentDate, timeEntries, compensationHours, leaveDays } = state;
        const selectedYear = currentDate.getFullYear();
        const selectedMonth = currentDate.getMonth();

        const daysInMonth = [];
        const date = new Date(selectedYear, selectedMonth, 1);
        while (date.getMonth() === selectedMonth) {
            daysInMonth.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }

        const dailyTotals = daysInMonth.reduce((acc, day) => {
            const dayOfMonth = day.getDate();
            const entry = timeEntries[dayOfMonth];
            if (entry && entry.start && entry.end) {
                const startMinutes = parseTimeToMinutes(entry.start);
                const endMinutes = parseTimeToMinutes(entry.end);
                acc[dayOfMonth] = endMinutes > startMinutes ? endMinutes - startMinutes : 0;
            } else {
                acc[dayOfMonth] = 0;
            }
            return acc;
        }, {});

        const totalWorkedMinutes = Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);
        const workingDaysInMonth = daysInMonth.filter(day => day.getDay() > 0 && day.getDay() < 6).length;
        const requiredWorkMinutes = Math.max(0, workingDaysInMonth - leaveDays) * HOURS_PER_DAY * 60;
        const compensationMinutes = parseTimeToMinutes(compensationHours);
        const totalMinutes = totalWorkedMinutes + compensationMinutes;
        const balanceMinutes = totalMinutes - requiredWorkMinutes;

        return {
            daysInMonth,
            dailyTotals,
            totalWorkedMinutes,
            workingDaysInMonth,
            requiredWorkMinutes,
            compensationMinutes,
            totalMinutes,
            balanceMinutes,
        };
    };

    // --- RENDER FUNCTIONS ---
    const render = () => {
        const derivedData = calculateDerivedData();
        renderMonthlyConfig();
        renderDailyEntries(derivedData);
        renderSummary(derivedData);
        attachEventListeners();
    };

    const renderMonthlyConfig = () => {
        const { currentDate, compensationHours, leaveDays } = state;
        const selectedYear = currentDate.getFullYear();
        const selectedMonth = currentDate.getMonth();
        const currentYear = new Date().getFullYear();
        const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
            .map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`).join('');
        const monthOptions = MONTH_NAMES
            .map((name, index) => `<option value="${index}" ${index === selectedMonth ? 'selected' : ''}>${name}</option>`).join('');

        monthlyConfigContainer.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 class="text-xl font-bold text-slate-700 mb-4">Configuração Mensal</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label for="year-select" class="block text-sm font-medium text-slate-600 mb-1">Ano</label>
                        <select id="year-select" class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">${yearOptions}</select>
                    </div>
                    <div>
                        <label for="month-select" class="block text-sm font-medium text-slate-600 mb-1">Mês</label>
                        <select id="month-select" class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">${monthOptions}</select>
                    </div>
                    <div>
                        <label for="compensation-hours" class="block text-sm font-medium text-slate-600 mb-1">Horas a Compensar</label>
                        <input type="time" id="compensation-hours" value="${compensationHours}" class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                    </div>
                    <div>
                        <label for="leave-days" class="block text-sm font-medium text-slate-600 mb-1">Dias de Licença/Folga</label>
                        <input type="number" id="leave-days" value="${leaveDays}" class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                    </div>
                </div>
            </div>
        `;
    };

    const renderDailyEntries = ({ daysInMonth, dailyTotals }) => {
        const { currentDate } = state;
        const selectedYear = currentDate.getFullYear();
        const selectedMonth = currentDate.getMonth();

        const dailyRows = daysInMonth.map(day => {
            const dayOfMonth = day.getDate();
            const dayOfWeek = day.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const entry = state.timeEntries[dayOfMonth] || { start: '', end: '' };
            return `
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 items-center ${isWeekend ? 'bg-slate-50' : ''}">
                    <div class="font-bold text-slate-800 flex items-center">
                        <span class="mr-3 text-lg ${isWeekend ? 'text-slate-400' : 'text-sky-600'}">${String(dayOfMonth).padStart(2, '0')}</span>
                        <span class="${isWeekend ? 'text-slate-400' : 'text-slate-600'}">${WEEK_DAY_NAMES[dayOfWeek]}</span>
                    </div>
                    <div class="md:col-span-2 grid grid-cols-2 gap-4">
                        <input type="time" data-day="${dayOfMonth}" data-type="start" value="${entry.start}" ${isWeekend ? 'disabled' : ''} class="time-input w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-200 disabled:cursor-not-allowed">
                        <input type="time" data-day="${dayOfMonth}" data-type="end" value="${entry.end}" ${isWeekend ? 'disabled' : ''} class="time-input w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-200 disabled:cursor-not-allowed">
                    </div>
                    <div class="text-right font-semibold text-slate-700 md:text-center">${formatMinutesToTime(dailyTotals[dayOfMonth] || 0)}</div>
                </div>
            `;
        }).join('');

        dailyEntriesContainer.innerHTML = `
            <div class="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                <h3 class="text-lg font-bold text-slate-700">${MONTH_NAMES[selectedMonth]} ${selectedYear}</h3>
                <div>
                    <button id="undo-btn" class="px-3 py-1 text-sm rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" ${undoStack.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-undo mr-1"></i> Desfazer
                    </button>
                    <button id="redo-btn" class="px-3 py-1 text-sm rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" ${redoStack.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-redo mr-1"></i> Refazer
                    </button>
                </div>
            </div>
            <div class="max-h-[60vh] overflow-y-auto">
                <div class="divide-y divide-slate-200">${dailyRows}</div>
            </div>
        `;
    };

    const createSummaryCardHTML = ({ icon, title, value, description = '', color = 'sky', isLarge = false }) => {
        const colors = {
            sky: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'text-sky-500' },
            amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
            teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
            slate: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'text-slate-500' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
            rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
        };
        const c = colors[color];
        return `
            <div class="flex items-center p-4 rounded-xl ${c.bg} ${isLarge ? 'flex-col text-center py-6' : ''}">
                <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isLarge ? 'mb-3' : 'mr-4'} ${c.text} bg-white shadow-sm">
                    <i class="${icon} ${isLarge ? 'text-2xl' : 'text-xl'} ${c.icon}"></i>
                </div>
                <div class="flex-grow">
                    <p class="${isLarge ? 'text-lg' : 'text-sm'} font-semibold text-slate-500">${title}</p>
                    <p class="${isLarge ? 'text-4xl' : 'text-2xl'} font-bold ${c.text}">${value}</p>
                    ${description ? `<p class="text-xs text-slate-400 mt-1">${description}</p>` : ''}
                </div>
            </div>
        `;
    };

    const renderSummary = (data) => {
        const { leaveDays } = state;
        const summaryCardsHTML = `
            <div class="space-y-4">
                ${createSummaryCardHTML({ icon: "fas fa-briefcase", title: "Horas Trabalhadas", value: formatMinutesToTime(data.totalWorkedMinutes), color: "sky" })}
                ${createSummaryCardHTML({ icon: "fas fa-plus-circle", title: "Horas de Compensação", value: formatMinutesToTime(data.compensationMinutes), color: "amber" })}
                ${createSummaryCardHTML({ icon: "fas fa-calendar-check", title: "Total de Horas", value: formatMinutesToTime(data.totalMinutes), color: "teal" })}
                ${createSummaryCardHTML({ icon: "fas fa-bullseye", title: "Horas Necessárias", value: formatMinutesToTime(data.requiredWorkMinutes), description: `(${data.workingDaysInMonth - leaveDays} dias úteis)`, color: "slate" })}
                <div class="pt-4 mt-4 border-t">
                    ${createSummaryCardHTML({ icon: "fas fa-balance-scale", title: "Saldo do Mês", value: formatMinutesToTime(data.balanceMinutes, true), color: data.balanceMinutes >= 0 ? 'emerald' : 'rose', isLarge: true })}
                </div>
            </div>
        `;
        const exportButtonsHTML = `
            <div class="mt-6 pt-6 border-t">
                <h3 class="text-lg font-semibold text-slate-600 mb-4 text-center">Exportar Relatório</h3>
                <div class="flex space-x-4">
                    <button id="export-pdf" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <i class="fas fa-file-pdf mr-2"></i>Exportar PDF
                    </button>
                    <button id="export-csv" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <i class="fas fa-file-csv mr-2"></i>Exportar CSV
                    </button>
                </div>
            </div>
        `;
        summaryContainer.innerHTML = `
            <h2 class="text-2xl font-bold text-slate-700 mb-6 border-b pb-4">Resumo Mensal</h2>
            ${summaryCardsHTML}
            ${exportButtonsHTML}
        `;
    };

    // --- EVENT HANDLERS & ACTIONS ---
    const clearHistory = () => {
        undoStack = [];
        redoStack = [];
    };

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value, 10);
        state.currentDate.setFullYear(newYear);
        clearHistory();
        render();
    };

    const handleMonthChange = (e) => {
        const newMonth = parseInt(e.target.value, 10);
        state.currentDate.setMonth(newMonth);
        clearHistory();
        render();
    };

    const handleTimeInputChange = (e) => {
        // Deep copy for history
        undoStack.push(JSON.parse(JSON.stringify(state.timeEntries)));
        redoStack = []; // Clear redo stack on new action

        const { day, type } = e.target.dataset;
        const dayNum = parseInt(day, 10);
        if (!state.timeEntries[dayNum]) {
            state.timeEntries[dayNum] = { start: '', end: '' };
        }
        state.timeEntries[dayNum][type] = e.target.value;
        render();
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        // Deep copy for history
        redoStack.push(JSON.parse(JSON.stringify(state.timeEntries)));
        state.timeEntries = undoStack.pop();
        render();
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        // Deep copy for history
        undoStack.push(JSON.parse(JSON.stringify(state.timeEntries)));
        state.timeEntries = redoStack.pop();
        render();
    };
    
    const getReportData = () => {
        const { daysInMonth, dailyTotals } = calculateDerivedData();
        return daysInMonth.map(day => {
            const dayOfMonth = day.getDate();
            const entry = state.timeEntries[dayOfMonth] || { start: '', end: '' };
            return {
                date: day.toLocaleDateString('pt-BR'),
                weekDay: WEEK_DAY_NAMES[day.getDay()],
                start: entry.start || 'N/A',
                end: entry.end || 'N/A',
                total: formatMinutesToTime(dailyTotals[dayOfMonth] || 0),
            };
        });
    };

    const handleExportCSV = () => {
        const reportData = getReportData();
        const data = calculateDerivedData();
        const { currentDate, leaveDays } = state;
        const headers = ['Data', 'Dia da Semana', 'Entrada', 'Saída', 'Total Horas'];
        let csvContent = headers.join(',') + '\n';
        reportData.forEach(row => { csvContent += `${row.date},${row.weekDay},${row.start},${row.end},${row.total}\n`; });
        
        csvContent += '\nResumo Mensal\n';
        csvContent += `Horas Trabalhadas,${formatMinutesToTime(data.totalWorkedMinutes)}\n`;
        csvContent += `Horas de Compensação,${formatMinutesToTime(data.compensationMinutes)}\n`;
        csvContent += `Dias de Licença/Folga,${leaveDays}\n`;
        csvContent += `Horas Necessárias,${formatMinutesToTime(data.requiredWorkMinutes)}\n`;
        csvContent += `Saldo do Mês,${formatMinutesToTime(data.balanceMinutes, true)}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `relatorio_horas_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const reportData = getReportData();
        const data = calculateDerivedData();
        const { currentDate, leaveDays } = state;
        
        doc.text(`Relatório de Horas - ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`, 14, 20);
        doc.autoTable({
            startY: 30,
            head: [['Data', 'Dia da Semana', 'Entrada', 'Saída', 'Total Horas']],
            body: reportData.map(row => [row.date, row.weekDay, row.start, row.end, row.total]),
        });
        
        const finalY = doc.autoTable.previous.finalY;
        doc.text('Resumo Mensal', 14, finalY + 15);
        doc.autoTable({
            startY: finalY + 20,
            body: [
                ['Horas Trabalhadas', formatMinutesToTime(data.totalWorkedMinutes)],
                ['Horas de Compensação', formatMinutesToTime(data.compensationMinutes)],
                ['Dias de Licença/Folga', `${leaveDays} dias`],
                ['Horas Necessárias', formatMinutesToTime(data.requiredWorkMinutes)],
                ['Saldo do Mês', formatMinutesToTime(data.balanceMinutes, true)],
            ],
        });
        doc.save(`relatorio_horas_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}.pdf`);
    };

    const attachEventListeners = () => {
        document.getElementById('year-select').addEventListener('change', handleYearChange);
        document.getElementById('month-select').addEventListener('change', handleMonthChange);
        document.getElementById('compensation-hours').addEventListener('input', (e) => {
            state.compensationHours = e.target.value;
            render();
        });
        document.getElementById('leave-days').addEventListener('input', (e) => {
            state.leaveDays = Math.max(0, parseInt(e.target.value) || 0);
            render();
        });
        document.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', handleTimeInputChange);
        });
        document.getElementById('export-pdf').addEventListener('click', handleExportPDF);
        document.getElementById('export-csv').addEventListener('click', handleExportCSV);
        document.getElementById('undo-btn').addEventListener('click', handleUndo);
        document.getElementById('redo-btn').addEventListener('click', handleRedo);
    };

    // --- INITIAL RENDER ---
    render();
});
