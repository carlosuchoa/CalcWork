
import React from 'react';

interface SummaryCardProps {
  icon: string;
  title: string;
  value: string;
  description?: string;
  color?: 'sky' | 'amber' | 'teal' | 'slate' | 'emerald' | 'rose';
  isLarge?: boolean;
}

const colorClasses = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'text-sky-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'text-teal-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'text-slate-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  title,
  value,
  description,
  color = 'sky',
  isLarge = false,
}) => {
  const classes = colorClasses[color];

  return (
    <div className={`flex items-center p-4 rounded-xl ${classes.bg} ${isLarge ? 'flex-col text-center py-6' : ''}`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isLarge ? 'mb-3' : 'mr-4'} ${classes.text} bg-white shadow-sm`}>
        <i className={`${icon} ${isLarge ? 'text-2xl' : 'text-xl'} ${classes.icon}`}></i>
      </div>
      <div className="flex-grow">
        <p className={`${isLarge ? 'text-lg' : 'text-sm'} font-semibold text-slate-500`}>{title}</p>
        <p className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-bold ${classes.text}`}>{value}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
    </div>
  );
};

export default SummaryCard;
