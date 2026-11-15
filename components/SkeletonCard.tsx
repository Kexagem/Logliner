
import React from 'react';

const SkeletonCard: React.FC = () => (
    <div className="p-4 rounded-lg bg-slate-800/50 border-2 border-slate-700 skeleton-pulse">
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-slate-700 rounded w-full"></div>
    </div>
);

export default SkeletonCard;
