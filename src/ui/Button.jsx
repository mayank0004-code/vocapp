import React from 'react';
import { m } from 'framer-motion';

export function Button({
  variant = 'pri', // 'pri' | 'light' | 'grey' | 'off' | 'ghost' | 'danger' | 'okb'
  size = 'default', // 'default' | 'sm' | 'xs'
  children,
  onClick,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'pri':
        return { background: 'var(--pri)', color: '#FFFFFF' };
      case 'light':
        return { background: 'var(--fg)', color: '#0B0B0D' };
      case 'grey':
        return { background: 'var(--card3)', color: 'var(--fg)' };
      case 'off':
        return { background: 'var(--card3)', color: 'var(--mute)' };
      case 'ghost':
        return { background: 'transparent', border: '1px solid var(--line)', color: 'var(--fg2)' };
      case 'danger':
        return { background: 'var(--badbg)', color: 'var(--bad)' };
      case 'okb':
        return { background: 'var(--okbg)', color: 'var(--ok)' };
      default:
        return { background: 'var(--pri)', color: '#FFFFFF' };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return { height: '36px', fontSize: '14px', borderRadius: '11px', padding: '0 14px', width: 'auto' };
      case 'sm':
        return { height: '42px', fontSize: '15px', borderRadius: '12px', padding: '0 16px', width: '100%' };
      default:
        return { height: '52px', fontSize: '17px', borderRadius: '14px', padding: '0 20px', width: '100%' };
    }
  };

  return (
    <m.button
      whileTap={!disabled ? { scale: 0.965 } : undefined}
      transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && variant === 'off' ? 0.6 : 1,
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      className={`btn ${className}`}
      {...props}
    >
      {children}
    </m.button>
  );
}

export default Button;
