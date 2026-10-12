import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

// Global toast trigger event
export function showToast(text, action, onAction) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vocapp:toast', {
      detail: { text, action, onAction, id: Date.now() }
    }));
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { text, action, onAction, id } = e.detail;
      setToasts(prev => [...prev.slice(-1), { id, text, action, onAction }]); // keep max 2 toasts
    };

    window.addEventListener('vocapp:toast', handleToast);
    return () => window.removeEventListener('vocapp:toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '96px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
        width: 'calc(100% - 32px)',
        maxWidth: '380px'
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => removeToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onDismiss();
    }, toast.action ? 4500 : 2600);
    return () => clearTimeout(timeout);
  }, [toast, onDismiss]);

  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        background: 'rgba(30, 30, 34, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        width: '100%',
        pointerEvents: 'auto',
        fontSize: '14.5px',
        color: 'var(--fg)',
        fontWeight: 500
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: toast.text }} />
      {toast.action && (
        <button
          onClick={() => {
            if (toast.onAction) toast.onAction();
            onDismiss();
          }}
          style={{
            background: 'var(--card3)',
            color: 'var(--acc2)',
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {toast.action}
        </button>
      )}
    </m.div>
  );
}

export default ToastContainer;
