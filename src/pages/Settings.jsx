/**
 * Settings.jsx — Preferences and account management.
 */
import React, { useState, useEffect } from 'react';
import { enablePushNotifications, saveUserSettings, getUserSettings } from '../services/db';

export default function Settings({ currentUser, closeSettings, logout }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: false,
    timingMode: 'smart',
    customTime: '18:00'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!currentUser) return;
      const data = await getUserSettings(currentUser.uid);
      setSettings(data);
      setLoading(false);
    }
    loadSettings();
  }, [currentUser]);

  const handleToggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      setSettings({ ...settings, notificationsEnabled: false });
    } else {
      setPermissionError('');
      // Request permission
      const token = await enablePushNotifications(currentUser.uid);
      if (token) {
        setSettings({ ...settings, notificationsEnabled: true });
      } else {
        setPermissionError('Permission denied or FCM not supported in this browser. If on iOS, please Add to Home Screen first.');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await saveUserSettings(currentUser.uid, settings);
    setSaving(false);
    closeSettings();
  };

  if (loading) {
    return <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading settings…</div>;
  }

  return (
    <div style={{ padding: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <h1 className="t-title" style={{ margin: 0 }}>Settings</h1>
        {/* We keep the close button since Dashboard opens this in a pseudo-modal state */}
        <button 
          onClick={closeSettings} 
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          aria-label="Close settings"
        >
          ×
        </button>
      </div>

      <div className="surface-raised" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h2 className="t-title" style={{ fontSize: 'var(--type-lead)', marginBottom: 'var(--sp-4)' }}>Push Notifications</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--type-body)', fontWeight: 500, color: 'var(--text-primary)' }}>Enable Notifications</span>
          <button 
            role="switch"
            aria-checked={settings.notificationsEnabled}
            onClick={handleToggleNotifications}
            style={{ 
              width: 50, height: 30, borderRadius: 15, border: 'none', 
              backgroundColor: settings.notificationsEnabled ? 'var(--color-success)' : 'rgba(120,120,128,0.2)',
              position: 'relative', cursor: 'pointer', transition: 'background-color 200ms ease'
            }}
          >
            <div style={{ 
              width: 26, height: 26, borderRadius: 13, backgroundColor: 'white', 
              position: 'absolute', top: 2, 
              left: settings.notificationsEnabled ? 22 : 2, 
              transition: 'left 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {permissionError && (
          <div aria-live="polite" style={{ color: 'var(--color-error)', fontSize: 'var(--type-sm)', marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', backgroundColor: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)' }}>
            {permissionError}
          </div>
        )}

        {settings.notificationsEnabled && (
          <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '0.5px solid var(--border-color)' }}>
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 'var(--type-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>Timing Strategy</label>
              <select 
                className="input" 
                value={settings.timingMode} 
                onChange={e => setSettings({...settings, timingMode: e.target.value})}
              >
                <option value="smart">🤖 Smart Timing (AI picks your peak hour)</option>
                <option value="custom">🕒 Custom Time</option>
              </select>
            </div>

            {settings.timingMode === 'custom' && (
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 'var(--type-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>Preferred Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={settings.customTime} 
                  onChange={e => setSettings({...settings, customTime: e.target.value})} 
                />
                <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--sp-2)' }}>
                  Based on your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginBottom: 'var(--sp-3)' }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      <button
        className="btn btn-secondary"
        style={{ width: '100%', color: 'var(--color-error)', background: 'rgba(255,59,48,0.1)', borderColor: 'transparent' }}
        onClick={logout}
      >
        Sign Out
      </button>
    </div>
  );
}
