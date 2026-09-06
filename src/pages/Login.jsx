import React, { useState } from 'react';

import { BookOpenIcon } from '../components/Icons';

export default function Login({ login }) {
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Failed to log in', err);
      setError('Failed to log in: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <BookOpenIcon size={48} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
        <h1 className="text-title" style={{ marginBottom: '8px' }}>Vocapp</h1>
        <p className="text-subheading" style={{ marginBottom: '32px' }}>
          Master new words with active recall and spaced repetition.
        </p>
        
        {error && (
          <div style={{ color: 'var(--error-color)', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
