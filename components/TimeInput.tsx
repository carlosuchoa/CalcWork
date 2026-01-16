
import React from 'react';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TimeInput: React.FC<TimeInputProps> = (props) => {
  return (
    <input
      type="time"
      {...props}
      className={`
        w-full p-2 border border-slate-300 rounded-lg shadow-sm 
        focus:ring-2 focus:ring-sky-500 focus:border-sky-500
        disabled:bg-slate-200 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    />
  );
};

export default TimeInput;
