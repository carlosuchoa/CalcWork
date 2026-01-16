
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const WEEK_DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS_PER_DAY = 8;

// State
const state = {
  currentDate: new Date(),
  timeEntries: {},
  compensationHours: '00:00',
  leaveDays: 0,
};

// DOM Elements
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const compensationHoursInput = document.getElementById('compensation-hours');
const leaveDaysInput = document.getElementById('leave-days');
const calendarHeader = document.getElementById('calendar-header');
const calendarBody = document.getElementById('calendar-body');
const summaryContainer = document.getElementById('summary-container');

// Helper Functions
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

// Calculation Functions
const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Render Functions
const renderSelectors = () => {
  const startYear = new Date().getFullYear() - 5;
  const endYear = 2035;
  const currentSelectedYear = state.currentDate.getFullYear();

  let yearOptionsHTML = '';
  for (let year = startYear; year <= endYear; year++) {
    yearOptionsHTML += `<option value="${year}" ${year === currentSelectedYear ? 'selected' : ''}>${year}</option>`;
  }
  yearSelect.innerHTML = yearOptionsHTML;

  monthSelect.innerHTML = MONTH_NAMES
    .map((name, index) => `<option value="${index}" ${index === state.currentDate.getMonth() ? 'selected' : ''}>${name}</option>`)
    .join('');
};

const renderCalendar = () => {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  
  calendarHeader.textContent = `${MONTH_NAMES[month]} ${year}`;
  calendarBody.innerHTML = '';

  const days = getDaysInMonth(year, month);

  days.forEach(day => {
    const dayOfMonth = day.getDate();
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const entry = state.timeEntries[dayOfMonth] || { start: '', end: '' };
    const totalMinutes = calculateDailyTotal(entry);

    const row = document.createElement('div');
    row.className = `grid grid-cols-1 md:grid-cols-4 gap-4 p-4 items-center ${isWeekend ? 'bg-slate-50' : ''}`;
    row.innerHTML = `
      <div class="font-bold text-slate-800 flex items-center">
        <span class="mr-3 text-lg ${isWeekend ? 'text-slate-400' : 'text-sky-600'}">${String(dayOfMonth).padStart(2, '0')}</span>
        <span class="${isWeekend ? 'text-slate-400' : 'text-slate-600'}">${WEEK_DAY_NAMES[dayOfWeek]}</span>
      </div>
      <div class="md:col-span-2 grid grid-cols-2 gap-4">
        <input type="time" data-day="${dayOfMonth}" data-type="start" value="${entry.start}" ${isWeekend ? 'disabled' : ''} class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-200 disabled:cursor-not-allowed">
        <input type="time" data-day="${dayOfMonth}" data-type="end" value="${entry.end}" ${isWeekend ? 'disabled' : ''} class="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-200 disabled:cursor-not-allowed">
      </div>
      <div class="text-right font-semibold text-slate-700 md:text-center">
        ${formatMinutesToTime(totalMinutes)}
      </div>
    `;
    calendarBody.appendChild(row);
  });
};

const createSummaryCard = ({ icon, title, value, description, color, isLarge = false }) => {
    const colorClasses = {
        sky: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'text-sky-500' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
        slate: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'text-slate-500' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
    };
    const classes = colorClasses[color];
    const descriptionHtml = description ? `<p class="text-xs text-slate-400 mt-1">${description}</p>` : '';

    return `
        <div class="flex items-center p-4 rounded-xl ${classes.bg} ${isLarge ? 'flex-col text-center py-6' : ''}">
            <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isLarge ? 'mb-3' : 'mr-4'} ${classes.text} bg-white shadow-sm">
                <i class="${icon} ${isLarge ? 'text-2xl' : 'text-xl'} ${classes.icon}"></i>
            </div>
            <div class="flex-grow">
                <p class="${isLarge ? 'text-lg' : 'text-sm'} font-semibold text-slate-500">${title}</p>
                <p class="${isLarge ? 'text-4xl' : 'text-2xl'} font-bold ${classes.text}">${value}</p>
                ${descriptionHtml}
            </div>
        </div>
    `;
};


const renderSummary = () => {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const days = getDaysInMonth(year, month);

    const totalWorkedMinutes = Object.values(state.timeEntries).reduce((sum, entry) => sum + calculateDailyTotal(entry), 0);
    const compensationMinutes = parseTimeToMinutes(state.compensationHours);
    const totalMinutes = totalWorkedMinutes + compensationMinutes;

    const workingDaysInMonth = days.filter(day => day.getDay() > 0 && day.getDay() < 6).length;
    const netWorkingDays = workingDaysInMonth - state.leaveDays;
    const requiredWorkMinutes = netWorkingDays > 0 ? netWorkingDays * HOURS_PER_DAY * 60 : 0;
    const balanceMinutes = totalMinutes - requiredWorkMinutes;
    
    summaryContainer.innerHTML = `
        ${createSummaryCard({ icon: "fas fa-briefcase", title: "Horas Trabalhadas", value: formatMinutesToTime(totalWorkedMinutes), color: "sky" })}
        ${createSummaryCard({ icon: "fas fa-plus-circle", title: "Horas de Compensação", value: formatMinutesToTime(compensationMinutes), color: "amber" })}
        ${createSummaryCard({ icon: "fas fa-calendar-check", title: "Total de Horas", value: formatMinutesToTime(totalMinutes), color: "teal" })}
        ${createSummaryCard({ icon: "fas fa-bullseye", title: "Horas Necessárias", value: formatMinutesToTime(requiredWorkMinutes), description: `(${netWorkingDays} dias úteis)`, color: "slate" })}
        <div class="pt-4 mt-4 border-t">
            ${createSummaryCard({ icon: "fas fa-balance-scale", title: "Saldo do Mês", value: formatMinutesToTime(balanceMinutes, true), color: balanceMinutes >= 0 ? 'emerald' : 'rose', isLarge: true })}
        </div>
    `;
};


const calculateDailyTotal = (entry) => {
    if (entry && entry.start && entry.end) {
        const startMinutes = parseTimeToMinutes(entry.start);
        const endMinutes = parseTimeToMinutes(entry.end);
        return endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    }
    return 0;
};


// Main update function
const updateUI = () => {
  renderCalendar();
  renderSummary();
};

// Event Handlers
const handleDateChange = () => {
  const newYear = parseInt(yearSelect.value, 10);
  const newMonth = parseInt(monthSelect.value, 10);
  state.currentDate = new Date(newYear, newMonth, 1);
  updateUI();
};

const handleTimeEntryChange = (e) => {
  const { day, type } = e.target.dataset;
  if (!day || !type) return;

  const dayNum = parseInt(day, 10);
  if (!state.timeEntries[dayNum]) {
    state.timeEntries[dayNum] = { start: '', end: '' };
  }
  state.timeEntries[dayNum][type] = e.target.value;
  updateUI();
};

// Initialization
const init = () => {
  renderSelectors();

  yearSelect.addEventListener('change', handleDateChange);
  monthSelect.addEventListener('change', handleDateChange);
  compensationHoursInput.addEventListener('change', (e) => {
    state.compensationHours = e.target.value;
    updateUI();
  });
  leaveDaysInput.addEventListener('change', (e) => {
    state.leaveDays = Math.max(0, parseInt(e.target.value, 10) || 0);
    updateUI();
  });
  calendarBody.addEventListener('change', handleTimeEntryChange);
  
  updateUI();
};

init();
