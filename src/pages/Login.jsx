/**
 * Login.jsx — Authentication screen.
 */
import React, { useState } from 'react';
import AppLogo from '../components/AppLogo';
import '../index.css';

export default function Login({ login }) {
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Failed to log in', err);
      // Strip the generic Firebase wrapper for a cleaner error if present
      const msg = err.message.replace('Firebase: ', '');
      setError(msg);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-5)' }}>
      <div className="surface-raised" style={{ padding: 'var(--sp-8) var(--sp-6)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-5)' }}>
          <AppLogo size={76} variant="badge" />
        </div>
        
        <h1 className="t-title" style={{ marginBottom: 'var(--sp-2)' }}>
          Vocapp
        </h1>
        
        <p style={{ fontSize: 'var(--type-lead)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-8)', lineHeight: 1.4 }}>
          Master new words with active recall and spaced repetition.
        </p>
        
        {error && (
          <div aria-live="polite" style={{ color: 'var(--color-error)', padding: 'var(--sp-3)', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-5)', fontSize: 'var(--type-sm)', textAlign: 'left' }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
          Sign in with Google
        </button>

      </div>
    </div>
  );
}
