import React from 'react';

export interface DemoBadgeProps {
  className?: string;
  variant?: 'pill' | 'subtle';
}

/**
 * Reusable DemoBadge pill component
 * Styled using existing Pawfect design tokens (#F3E3E8 background, #7B1E3A text, #E7DEDF border)
 */
export const DemoBadge: React.FC<DemoBadgeProps> = ({
  className = '',
  variant = 'pill',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#E7DEDF] bg-[#F3E3E8] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7B1E3A] shadow-2xs select-none ${className}`}
      title="This is demonstration seed data"
    >
      Demo
    </span>
  );
};
