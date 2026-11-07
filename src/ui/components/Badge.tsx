import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'accent' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#F3E3E8] text-[#7B1E3A]',
    success: 'bg-[#2E7D5B]/10 text-[#2E7D5B]',
    warning: 'bg-[#B7791F]/15 text-[#915f16]',
    accent: 'bg-[#C9A24B]/20 text-[#7a5f22]',
    neutral: 'bg-[#FAF7F2] text-[#6B5B61] border border-[#E7DEDF]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
