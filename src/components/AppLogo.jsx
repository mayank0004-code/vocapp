import React from 'react';

/**
 * AppLogo.jsx — Apple-designed brand mark & icon for Vocapp.
 * 
 * Follows Apple Human Interface Guidelines (WWDC):
 * - Continuous curvature squircle mask
 * - Subtle ambient occlusion & specular rim highlight
 * - Optical alignment & letter-spacing (-0.02em)
 * - Fluid response on press with critical damping (1.0)
 * 
 * Props:
 * @param {number} size - Icon dimension in pixels (default: 32)
 * @param {'icon' | 'badge' | 'full'} variant - Display mode
 * @param {string} className - Optional container class
 * @param {object} style - Optional container style
 * @param {function} onClick - Optional tap/click handler
 */
export default function AppLogo({
  size = 32,
  variant = 'full', // 'icon' | 'badge' | 'full'
  className = '',
  style = {},
  onClick,
}) {
  const isClickable = Boolean(onClick);

  // Apple squircle styling: continuous curvature corner radius ~22.37%
  const radius = Math.round(size * 0.224);

  const iconElement = (
    <div
      className="vocapp-logo-badge"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow:
          size >= 48
            ? '0 10px 24px -4px rgba(0, 81, 213, 0.38), 0 4px 10px -2px rgba(0, 0, 0, 0.12)'
            : '0 2px 8px rgba(0, 81, 213, 0.28)',
        transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
      }}
    >
      <img
        src="/app-icon-squircle.png"
        alt="Vocapp Icon"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {/* Apple specular hairline rim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.22)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );

  if (variant === 'icon' || variant === 'badge') {
    return (
      <div
        className={`vocapp-logo ${className}`}
        style={{
          display: 'inline-flex',
          cursor: isClickable ? 'pointer' : 'default',
          ...style,
        }}
        onClick={onClick}
      >
        {iconElement}
      </div>
    );
  }

  // 'full' variant: Icon + Optical Typography Wordmark
  const textSize = Math.max(16, Math.round(size * 0.68));

  return (
    <div
      className={`vocapp-logo vocapp-logo-full ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(8, Math.round(size * 0.28)),
        cursor: isClickable ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
    >
      {iconElement}
      <span
        style={{
          fontSize: textSize,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
          color: 'var(--text-primary, #1d1d1f)',
          userSelect: 'none',
        }}
      >
        Vocapp
      </span>
    </div>
  );
}
