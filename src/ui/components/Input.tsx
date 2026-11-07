import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isPassword = false,
      id,
      className = '',
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.getModifierState && isPassword) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
      onKeyDown?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.getModifierState && isPassword) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };

    return (
      <div className="w-full text-left">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-[#231A1D]"
        >
          {label}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : props.type || 'text'}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            className={`min-h-[44px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#231A1D] placeholder:text-[#6B5B61]/60 transition-colors duration-150 focus:outline-none focus:ring-2 ${
              isPassword ? 'pr-11' : ''
            } ${
              error
                ? 'border-[#B4423A] focus:border-[#B4423A] focus:ring-[#B4423A]/20'
                : 'border-[#E7DEDF] hover:border-[#7B1E3A]/40 focus:border-[#7B1E3A] focus:ring-[#7B1E3A]/15'
            } ${className}`}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#6B5B61] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Caps Lock warning indicator */}
        {isPassword && capsLockOn && (
          <p
            className="mt-1 text-xs text-[#B7791F]"
            role="status"
          >
            Caps Lock is on
          </p>
        )}

        {/* Inline error description */}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1 text-xs font-medium text-[#B4423A]"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1 text-xs text-[#6B5B61]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
