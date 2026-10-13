import React from 'react';

export function Card({
  children,
  className = '',
  style = {},
  variant = 'default', // 'default' | 'elevated' | 'well'
  ...props
}) {
  const getBackground = () => {
    switch (variant) {
      case 'elevated':
        return 'var(--card2)';
      case 'well':
        return 'var(--well)';
      default:
        return 'var(--card)';
    }
  };

  return (
    <section
      style={{
        background: getBackground(),
        borderRadius: '22px',
        padding: '20px',
        border: '1px solid var(--line)',
        ...style
      }}
      className={`card ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export default Card;
