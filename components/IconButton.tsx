
import React from 'react';

interface IconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, children, tooltip, disabled = false }) => (
  <div className="relative group">
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="p-2 rounded-lg h-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {children}
    </button>
    <div className="tooltip-text absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
      {tooltip}
    </div>
  </div>
);

export default IconButton;
