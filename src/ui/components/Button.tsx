import React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'md' | 'lg' | 'sm';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizeStyles = {
    sm: 'min-h-[36px] px-3.5 py-1.5 text-xs',
    md: 'min-h-[44px] px-5 py-2.5 text-sm',
    lg: 'min-h-[52px] px-7 py-3.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-[#7B1E3A] text-white hover:bg-[#5E1730] active:bg-[#471124] focus-visible:ring-[#7B1E3A] shadow-xs hover:shadow',
    secondary:
      'bg-[#F3E3E8] text-[#7B1E3A] hover:bg-[#ebd0d9] active:bg-[#e2bdca] focus-visible:ring-[#7B1E3A]',
    outline:
      'border border-[#E7DEDF] bg-white text-[#231A1D] hover:border-[#7B1E3A] hover:bg-[#FAF7F2] active:bg-[#F3E3E8] focus-visible:ring-[#7B1E3A]',
    ghost:
      'bg-transparent text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#F3E3E8]/50 active:bg-[#F3E3E8] focus-visible:ring-[#7B1E3A]',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
