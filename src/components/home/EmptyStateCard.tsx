import React from 'react';

interface EmptyStateCardProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-5 text-center px-4 select-none">
      <div className="w-10 h-10 rounded-[12px] bg-[#161618] border border-white/[0.04] flex items-center justify-center shadow-inner mb-1">
        <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--accent)' }}>
          {icon}
        </span>
      </div>
      <p className="text-[12px] font-bold text-white/80">{title}</p>
      <p className="text-[10px] text-white/40 max-w-[280px] leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-3 py-1.5 bg-white/5 border border-white/[0.08] hover:border-white/20 hover:bg-white/10 rounded-[8px] text-[10px] font-bold text-white/90 hover:text-white transition-all shadow-sm focus:outline-none"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyStateCard;
