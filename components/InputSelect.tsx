
import React from 'react';

interface InputSelectProps {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
}

const InputSelect: React.FC<InputSelectProps> = ({name, label, value, onChange, options}) => (
    <div className="mb-3">
        <label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">
            <option value="">-- None --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default InputSelect;
