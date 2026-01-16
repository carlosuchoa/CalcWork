

import React, { useState, useMemo } from 'react';
import TimeInput from './components/TimeInput';
import SummaryCard from './components/SummaryCard';

type TimeEntries = {
  [day: number]: {
    start: string;
    end: string;
  };
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEK_DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS_PER_DAY = 8;

// Helper Functions
const parseTimeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (totalMinutes: number, showSign = false): string => {
  const sign = totalMinutes < 0 ? "-" : (showSign ? "+" : "");
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntries>({});
  const [compensationHours, setCompensationHours] = useState('00:00');
  const [leaveDays, setLeaveDays] = useState(0);

  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth();

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentDate(new Date(newYear, selectedMonth, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentDate(new Date(selectedYear, newMonth, 1));
  };
  
  const handleTimeChange = (day: number, type: 'start' | 'end', value: string) => {
    setTimeEntries(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };

  const daysInMonth = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days = [];
    while (date.getMonth() === selectedMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedYear, selectedMonth]);

  // FIX: Added explicit generic type to useMemo to ensure correct type inference.
  const dailyTotals = useMemo<{ [day: number]: number }>(() => {
    return daysInMonth.reduce((acc, day) => {
      const dayOfMonth = day.getDate();
      const entry = timeEntries[dayOfMonth];
      if (entry && entry.start && entry.end) {
        const startMinutes = parseTimeToMinutes(entry.start);
        const endMinutes = parseTimeToMinutes(entry.end);
        if (endMinutes > startMinutes) {
          acc[dayOfMonth] = endMinutes - startMinutes;
        } else {
          acc[dayOfMonth] = 0;
        }
      } else {
        acc[dayOfMonth] = 0;
      }
      return acc;
    }, {} as { [day: number]: number });
  }, [timeEntries, daysInMonth]);
  
  const totalWorkedMinutes = useMemo(() => {
    return Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);
  }, [dailyTotals]);

  const workingDaysInMonth = useMemo(() => {
    return daysInMonth.filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek > 0 && dayOfWeek < 6; // Monday to Friday
    }).length;
  }, [daysInMonth]);

  // FIX: Added explicit generic type to useMemo to ensure correct type inference.
  const requiredWorkMinutes = useMemo<number>(() => {
      const netWorkingDays = workingDaysInMonth - leaveDays;
      return netWorkingDays > 0 ? netWorkingDays * HOURS_PER_DAY * 60 : 0;
  }, [workingDaysInMonth, leaveDays]);

  // FIX: Added explicit generic type to useMemo to ensure correct type inference.
  const compensationMinutes = useMemo<number>(() => parseTimeToMinutes(compensationHours), [compensationHours]);

  const totalMinutes = totalWorkedMinutes + compensationMinutes;
  const balanceMinutes = totalMinutes - requiredWorkMinutes;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800">
            <i className="fas fa-calculator mr-3 text-sky-500"></i>Calculadora de Horas de Trabalho
          </h1>
          <p className="text-slate-500 mt-2">Gerencie seu banco de horas com facilidade e precisão.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
             <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Configuração Mensal</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="year-select" className="block text-sm font-medium text-slate-600 mb-1">Ano</label>
                    <select id="year-select" value={selectedYear} onChange={handleYearChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                      {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="month-select" className="block text-sm font-medium text-slate-600 mb-1">Mês</label>
                    <select id="month-select" value={selectedMonth} onChange={handleMonthChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                      {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="compensation-hours" className="block text-sm font-medium text-slate-600 mb-1">Horas a Compensar</label>
                    <TimeInput id="compensation-hours" value={compensationHours} onChange={(e) => setCompensationHours(e.target.value)} />
                  </div>
                   <div>
                    <label htmlFor="leave-days" className="block text-sm font-medium text-slate-600 mb-1">Dias de Licença/Folga</label>
                    <input type="number" id="leave-days" value={leaveDays} onChange={(e) => setLeaveDays(Math.max(0, parseInt(e.target.value) || 0))} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                     <h3 className="text-lg font-bold text-slate-700">{MONTH_NAMES[selectedMonth]} {selectedYear}</h3>
                </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="divide-y divide-slate-200">
                  {daysInMonth.map(day => {
                    const dayOfMonth = day.getDate();
                    const dayOfWeek = day.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    
                    return (
                      <div key={dayOfMonth} className={`grid grid-cols-1 md:grid-cols-4 gap-4 p-4 items-center ${isWeekend ? 'bg-slate-50' : ''}`}>
                        <div className="font-bold text-slate-800 flex items-center">
                           <span className={`mr-3 text-lg ${isWeekend ? 'text-slate-400' : 'text-sky-600'}`}>
                             {String(dayOfMonth).padStart(2, '0')}
                           </span>
                           <span className={`${isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                             {WEEK_DAY_NAMES[dayOfWeek]}
                           </span>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                          <TimeInput 
                            id={`start-${dayOfMonth}`}
                            aria-label={`Hora de entrada para o dia ${dayOfMonth}`}
                            value={timeEntries[dayOfMonth]?.start || ''} 
                            onChange={(e) => handleTimeChange(dayOfMonth, 'start', e.target.value)}
                            disabled={isWeekend}
                          />
                           <TimeInput 
                            id={`end-${dayOfMonth}`}
                            aria-label={`Hora de saída para o dia ${dayOfMonth}`}
                            value={timeEntries[dayOfMonth]?.end || ''} 
                            onChange={(e) => handleTimeChange(dayOfMonth, 'end', e.target.value)}
                            disabled={isWeekend}
                          />
                        </div>
                        <div className="text-right font-semibold text-slate-700 md:text-center">
                          {formatMinutesToTime(dailyTotals[dayOfMonth] || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg sticky top-8">
              <h2 className="text-2xl font-bold text-slate-700 mb-6 border-b pb-4">Resumo Mensal</h2>
              <div className="space-y-4">
                <SummaryCard 
                  icon="fas fa-briefcase" 
                  title="Horas Trabalhadas" 
                  value={formatMinutesToTime(totalWorkedMinutes)}
                  color="sky"
                />
                <SummaryCard 
                  icon="fas fa-plus-circle" 
                  title="Horas de Compensação" 
                  value={formatMinutesToTime(compensationMinutes)}
                  color="amber"
                />
                <SummaryCard 
                  icon="fas fa-calendar-check" 
                  title="Total de Horas" 
                  value={formatMinutesToTime(totalMinutes)}
                  color="teal"
                />
                 <SummaryCard 
                  icon="fas fa-bullseye" 
                  title="Horas Necessárias" 
                  value={formatMinutesToTime(requiredWorkMinutes)}
                  description={`(${workingDaysInMonth - leaveDays} dias úteis)`}
                  color="slate"
                />
                 <div className="pt-4 mt-4 border-t">
                     <SummaryCard 
                        icon="fas fa-balance-scale" 
                        title="Saldo do Mês" 
                        value={formatMinutesToTime(balanceMinutes, true)}
                        color={balanceMinutes >= 0 ? 'emerald' : 'rose'}
                        isLarge={true}
                    />
                 </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;