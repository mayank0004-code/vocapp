/**
 * Settings.jsx — Preferences and account management (Apple Design)
 */
import React, { useState, useEffect } from 'react';
import { enablePushNotifications, saveUserSettings, getUserSettings, resetCraftStats, resetMistakeInsights, getQuestionBank, exportQuestionBankToExcel } from '../services/db';
import AppLogo from '../components/AppLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Download, FileSpreadsheet, CheckCircle } from '../components/Icons';

const SETTINGS_STYLES = `
  .settings-container {
    display: flex;
    height: 100dvh;
    overflow: hidden;
    background-color: var(--bg-color);
    position: fixed;
    inset: 0;
    z-index: 1000;
  }
  .settings-sidebar {
    width: 320px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    background: rgba(120, 120, 128, 0.04);
  }
  .settings-detail {
    flex: 1;
    overflow-y: auto;
    position: relative;
    background: var(--bg-color);
    padding: var(--sp-8) max(var(--sp-5), calc(50% - 350px));
  }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    margin-bottom: 4px;
    border-radius: 10px;
    cursor: pointer;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
    transition: background 150ms ease, transform 100ms ease;
  }
  .tab-btn:active {
    transform: scale(0.98);
  }
  .tab-btn.active {
    background: var(--color-primary);
    color: white;
  }
  .tab-btn:not(.active):hover {
    background: rgba(120, 120, 128, 0.1);
  }
  
  .settings-header-title {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .settings-section-title {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin-bottom: var(--sp-5);
  }

  @media (max-width: 768px) {
    .settings-container {
      flex-direction: column;
    }
    .settings-sidebar {
      width: 100%;
      height: auto;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
      max-height: 35vh;
      overflow-y: auto;
    }
    .settings-detail {
      padding: var(--sp-6) var(--sp-5);
    }
    .settings-header-title {
      font-size: 28px;
    }
  }
`;

function TabButton({ id, active, setActive, icon, label }) {
  return (
    <button 
      className={`tab-btn ${active === id ? 'active' : ''}`}
      onClick={() => setActive(id)}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function QuestionBankTab({ currentUser, setToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!currentUser) return;
      try {
        const qList = await getQuestionBank(currentUser.uid, 50);
        setQuestions(qList);
      } catch (e) {
        console.error("Error loading question bank:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const handleExport = async (format) => {
    if (!currentUser) return;
    setExporting(true);
    try {
      const res = await exportQuestionBankToExcel(currentUser.uid, format);
      setToast(`Downloaded ${res.count} questions as ${res.filename}`);
    } catch (err) {
      setToast(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 className="settings-section-title">Question Bank & Excel Archive</h2>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.5 }}>
        Every Spaced Repetition question generated for your dictionary is preserved here with its full context sentence, domain register, options, answers, and your review history.
      </p>

      {/* Summary Card */}
      <div className="surface-raised" style={{ padding: 'var(--sp-5)', borderRadius: '16px', marginBottom: 'var(--sp-5)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 600 }}>Archived Question Pool</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {loading ? 'Calculating bank size…' : `${questions.length >= 50 ? '50+' : questions.length} questions recorded in database`}
            </div>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
            background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent-color)',
            fontSize: '13px', fontWeight: 700, flexShrink: 0
          }}>
            {questions.length} Stored
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--sp-3)',
          marginTop: 'var(--sp-5)',
          paddingTop: 'var(--sp-4)',
          borderTop: '0.5px solid var(--border-color)',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          <button
            onClick={() => handleExport('xls')}
            disabled={exporting || questions.length === 0}
            className="btn btn-primary"
            style={{
              flex: '1 1 140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--sp-2)',
              padding: '10px 14px',
              fontSize: '14px',
              boxSizing: 'border-box',
              minWidth: 0
            }}
          >
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Export Excel (.xls)
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting || questions.length === 0}
            className="btn btn-outline"
            style={{
              flex: '1 1 140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--sp-2)',
              padding: '10px 14px',
              fontSize: '14px',
              boxSizing: 'border-box',
              minWidth: 0
            }}
          >
            <Download size={16} />
            Export CSV (.csv)
          </button>
        </div>
      </div>

      {/* Recent Questions Preview */}
      {questions.length > 0 && (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Recent Questions in Bank</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {questions.slice(0, 8).map((q, idx) => (
              <div
                key={q.id || idx}
                className="surface-raised"
                style={{ padding: 'var(--sp-3) var(--sp-4)', borderRadius: '12px', fontSize: '14px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{q.word}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(120, 120, 128, 0.1)', color: 'var(--text-secondary)'
                    }}>
                      {q.domainName || q.domain || q.type}
                    </span>
                    {q.result && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700,
                        color: q.result === 'correct' ? 'var(--color-success)' : 'var(--color-error)'
                      }}>
                        {q.result === 'correct' ? '✓ Correct' : '✕ Missed'}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
                  {q.question}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PROFICIENCY_LEVELS = [
  {
    level: 1,
    name: 'Apprentice',
    title: 'L1 · Apprentice',
    badge: 'Foundation',
    wordCount: '7–12 words',
    syntax: 'Direct Subject-Verb-Object sentences without nested clauses.',
    contexts: 'Everyday home, family, basic work, and daily activities.',
    example: '"The company built a tall edifice in the center of town."'
  },
  {
    level: 2,
    name: 'Craftsman',
    title: 'L2 · Craftsman',
    badge: 'Compound',
    wordCount: '10–16 words',
    syntax: 'Compound clauses using common connectors (and, but, so, because).',
    contexts: 'Workplace interactions, community affairs, and social life.',
    example: '"Engineers inspected the steel edifice, and they found no structural cracks."'
  },
  {
    level: 3,
    name: 'Wordsmith',
    title: 'L3 · Wordsmith',
    badge: 'Complex',
    wordCount: '14–22 words',
    syntax: 'Subordinate clauses with relative pronouns (although, while, which).',
    contexts: 'Professional projects, academic discussions, and modern media.',
    example: '"Although the ancient stone edifice survived the earthquake, historians urged immediate reinforcement."'
  },
  {
    level: 4,
    name: 'Stylist',
    title: 'L4 · Stylist',
    badge: 'Advanced',
    wordCount: '18–28 words',
    syntax: 'Inverted phrasing, participial modifiers, and varied rhythmic cadence.',
    contexts: 'Editorial journalism, literary essays, and cultural critiques.',
    example: '"Looming over the harbor with gothic grandeur, the weathered stone edifice stood as a testament to maritime resilience."'
  },
  {
    level: 5,
    name: 'Master',
    title: 'L5 · Master',
    badge: 'Rhetorical',
    wordCount: '22–35 words',
    syntax: 'Multi-tiered balanced clauses, periodic structures, and metaphorical depth.',
    contexts: 'Formal philosophy, classical literature, and high-register rhetoric.',
    example: '"Erected during an era of unfettered ambition, the towering civic edifice symbolized the delicate equilibrium between architectural audacity and communal purpose."'
  }
];

function ProficiencyTab({ currentUser, settings, setSettings, setToast }) {
  const currentLvl = Math.min(5, Math.max(1, parseInt(settings.englishLevel, 10) || 1));
  const autoAdjust = settings.autoAdjustLevel !== false;

  const handleSelectLevel = async (lvl) => {
    const updated = { ...settings, englishLevel: lvl };
    setSettings(updated);
    if (navigator.vibrate) navigator.vibrate(12);
    try {
      await saveUserSettings(currentUser.uid, { englishLevel: lvl });
      window.dispatchEvent(new CustomEvent('vocapp:settings-updated'));
      setToast(`English level set to L${lvl} · ${PROFICIENCY_LEVELS.find(l => l.level === lvl)?.name}`);
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error("Failed to update English level:", e);
    }
  };

  const handleToggleAutoAdjust = async () => {
    const nextVal = !autoAdjust;
    const updated = { ...settings, autoAdjustLevel: nextVal };
    setSettings(updated);
    if (navigator.vibrate) navigator.vibrate(10);
    try {
      await saveUserSettings(currentUser.uid, { autoAdjustLevel: nextVal });
      window.dispatchEvent(new CustomEvent('vocapp:settings-updated'));
      setToast(nextVal ? "Auto-adjust enabled (adapts as you practice)" : "Auto-adjust locked to current level");
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error("Failed to update auto adjust:", e);
    }
  };

  return (
    <div>
      <h2 className="settings-section-title">English Proficiency</h2>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.5 }}>
        Calibrates sentence structure, vocabulary density, and question complexity in both Review and Studio according to your level.
      </p>

      {/* Auto-Adjust Difficulty Switch */}
      <div className="surface-raised" style={{ padding: 'var(--sp-5)', borderRadius: '16px', marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 600 }}>Auto-Adjust Difficulty</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
              Gradually promotes you when you maintain ≥85% accuracy over 15+ reviews, and gently eases difficulty if accuracy drops below 55%.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={autoAdjust}
            onClick={handleToggleAutoAdjust}
            style={{
              width: 51, height: 31, borderRadius: 16, border: 'none',
              backgroundColor: autoAdjust ? 'var(--color-success)' : 'rgba(120,120,128,0.2)',
              position: 'relative', cursor: 'pointer', transition: 'background-color 200ms ease',
              flexShrink: 0
            }}
          >
            <div style={{
              width: 27, height: 27, borderRadius: 14, backgroundColor: 'white',
              position: 'absolute', top: 2,
              left: autoAdjust ? 22 : 2,
              transition: 'left 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.15)'
            }} />
          </button>
        </div>
      </div>

      {/* Day 1 Protective Shield Banner */}
      <div style={{
        padding: 'var(--sp-4)',
        borderRadius: '14px',
        background: 'rgba(0, 113, 227, 0.08)',
        border: '1px solid rgba(0, 113, 227, 0.15)',
        marginBottom: 'var(--sp-5)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--sp-3)'
      }}>
        <span style={{ fontSize: '20px' }}>🛡️</span>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
          <strong>Interval 1 Shield Active:</strong> Brand new words (Day 1) are always presented using short, clean sentences (Level 1) so you can master the word's fundamental definition without grammar confusion.
        </div>
      </div>

      {/* Level Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
        {PROFICIENCY_LEVELS.map(item => {
          const isSelected = item.level === currentLvl;
          return (
            <motion.div
              key={item.level}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectLevel(item.level)}
              className="surface-raised"
              style={{
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: '16px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                background: isSelected ? 'rgba(0, 113, 227, 0.04)' : 'var(--surface-color)',
                transition: 'border 150ms ease, background 150ms ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)'
                  }}>
                    {item.title}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: isSelected ? 'rgba(0, 113, 227, 0.15)' : 'rgba(120, 120, 128, 0.1)',
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                  }}>
                    {item.badge} · {item.wordCount}
                  </span>
                </div>
                {isSelected && (
                  <CheckCircle size={20} color="var(--accent-color)" />
                )}
              </div>

              <p style={{ margin: '0 0 var(--sp-2) 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.syntax}
              </p>

              <div style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: 'var(--text-tertiary)',
                background: 'rgba(120, 120, 128, 0.05)',
                padding: '6px 10px',
                borderRadius: '8px',
                borderLeft: isSelected ? '3px solid var(--accent-color)' : '3px solid rgba(120, 120, 128, 0.3)'
              }}>
                Example: {item.example}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Settings({ currentUser, closeSettings, logout, initialTab }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: false,
    timingMode: 'smart',
    customTime: '18:00',
    englishLevel: 1,
    autoAdjustLevel: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  
  const [activeTab, setActiveTab] = useState(initialTab || 'notifications');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [actionSheet, setActionSheet] = useState(null); // { target, label, action }
  const [toast, setToast] = useState('');

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

  const confirmResetProgress = async (target, label) => {
    setSaving(true);
    try {
      if (target === 'insights') {
        await resetMistakeInsights(currentUser.uid);
        setActionSheet(null);
        setToast("Insights reset to clean Studio baseline.");
      } else {
        await resetCraftStats(currentUser.uid, target);
        setActionSheet(null);
        setToast(`${label} XP has been reset successfully.`);
      }
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast("Failed to reset progress. Please try again.");
      setTimeout(() => setToast(''), 3000);
    }
    setSaving(false);
  };

  const openResetSheet = (target, label) => {
    setActionSheet({
      title: `Are you sure you want to permanently reset your ${label} progress? This cannot be undone.`,
      actionLabel: `Reset ${label}`,
      onConfirm: () => confirmResetProgress(target, label)
    });
  };

  const openSignOutSheet = () => {
    setActionSheet({
      title: "Are you sure you want to sign out?",
      actionLabel: "Sign Out",
      onConfirm: logout
    });
  };

  if (loading) {
    return <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading settings…</div>;
  }

  return (
    <>
      <style>{SETTINGS_STYLES}</style>
      <div className="settings-container">
        
        {/* Sidebar / Master */}
        <div className="settings-sidebar">
          <div style={{ padding: 'var(--sp-6) var(--sp-5)', paddingBottom: 'var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="settings-header-title">Settings</h1>
            <button 
              onClick={closeSettings} 
              style={{ background: 'var(--surface-color)', width: 36, height: 36, borderRadius: 18, border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <nav style={{ padding: '0 var(--sp-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TabButton id="notifications" active={activeTab} setActive={setActiveTab} icon="🔔" label="Notifications" />
            <TabButton id="proficiency" active={activeTab} setActive={setActiveTab} icon="🎯" label="English Proficiency" />
            <TabButton id="question-bank" active={activeTab} setActive={setActiveTab} icon="📊" label="Question Bank & Excel" />
            <TabButton id="studio" active={activeTab} setActive={setActiveTab} icon="🎓" label="Studio Progress" />
            <TabButton id="account" active={activeTab} setActive={setActiveTab} icon="👤" label="Account" />
          </nav>

          <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <button
              onClick={() => {
                localStorage.setItem('vocapp.ui', 'v2');
                window.location.href = window.location.origin + window.location.pathname + '?ui=v2';
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(124, 136, 255, 0.16)',
                border: '1px solid rgba(124, 136, 255, 0.4)',
                color: 'var(--color-primary, #7C88FF)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              ✨ Switch to Vocapp v2
            </button>
            <AppLogo size={28} variant="badge" style={{ marginBottom: 'var(--sp-1)' }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vocapp Classic</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Version 1.0.0</div>
          </div>
        </div>

        {/* Content / Detail */}
        <div className="settings-detail">
          
          <AnimatePresence mode="wait">
            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              >
                <h2 className="settings-section-title">Push Notifications</h2>
                
                <div className="surface-raised" style={{ padding: 'var(--sp-5)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 500 }}>Enable Notifications</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>Daily practice reminders</div>
                    </div>
                    
                    <button 
                      role="switch"
                      aria-checked={settings.notificationsEnabled}
                      onClick={handleToggleNotifications}
                      style={{ 
                        width: 51, height: 31, borderRadius: 16, border: 'none', 
                        backgroundColor: settings.notificationsEnabled ? 'var(--color-success)' : 'rgba(120,120,128,0.2)',
                        position: 'relative', cursor: 'pointer', transition: 'background-color 200ms ease'
                      }}
                    >
                      <div style={{ 
                        width: 27, height: 27, borderRadius: 14, backgroundColor: 'white', 
                        position: 'absolute', top: 2, 
                        left: settings.notificationsEnabled ? 22 : 2, 
                        transition: 'left 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.15)'
                      }} />
                    </button>
                  </div>

                  {permissionError && (
                    <div style={{ color: 'var(--color-error)', fontSize: '14px', marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', backgroundColor: 'rgba(255, 59, 48, 0.08)', borderRadius: '8px' }}>
                      {permissionError}
                    </div>
                  )}

                  <AnimatePresence>
                    {settings.notificationsEnabled && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '0.5px solid var(--border-color)' }}>
                          <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: '15px', fontWeight: 500 }}>Timing Strategy</label>
                          <select 
                            className="input" 
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                            value={settings.timingMode} 
                            onChange={e => setSettings({...settings, timingMode: e.target.value})}
                          >
                            <option value="smart">🤖 Smart Timing (AI picks peak hour)</option>
                            <option value="custom">🕒 Custom Time</option>
                          </select>

                          {settings.timingMode === 'custom' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 'var(--sp-4)' }}>
                              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: '15px', fontWeight: 500 }}>Preferred Time</label>
                              <input 
                                type="time" 
                                className="input" 
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                                value={settings.customTime} 
                                onChange={e => setSettings({...settings, customTime: e.target.value})} 
                              />
                              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: 'var(--sp-2)' }}>
                                Based on local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div style={{ marginTop: 'var(--sp-6)', textAlign: 'right' }}>
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    style={{ 
                      padding: '12px 24px', borderRadius: '20px', background: 'var(--color-primary)', 
                      color: 'white', border: 'none', fontSize: '16px', fontWeight: 600, cursor: 'pointer' 
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'proficiency' && (
              <motion.div 
                key="proficiency"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              >
                <ProficiencyTab 
                  currentUser={currentUser} 
                  settings={settings} 
                  setSettings={setSettings} 
                  setToast={setToast} 
                />
              </motion.div>
            )}

            {activeTab === 'studio' && (
              <motion.div 
                key="studio"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              >
                <h2 className="settings-section-title">Studio Progress</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-5)', lineHeight: 1.5 }}>
                  Reset your craft experience if you'd like to start fresh. This action is permanent and cannot be undone.
                </p>

                <div className="surface-raised" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <ResetItem label="Grammar" color="rgba(255, 149, 0, 1)" onClick={() => openResetSheet('grammar', 'Grammar')} />
                    <div style={{ height: '1px', background: 'var(--border-color)', marginLeft: '16px' }} />
                    <ResetItem label="Flow" color="rgba(0, 199, 190, 1)" onClick={() => openResetSheet('flow', 'Flow')} />
                    <div style={{ height: '1px', background: 'var(--border-color)', marginLeft: '16px' }} />
                    <ResetItem label="Context" color="rgba(175, 82, 222, 1)" onClick={() => openResetSheet('context', 'Context')} />
                    <div style={{ height: '1px', background: 'var(--border-color)', marginLeft: '16px' }} />
                    <ResetItem label="Punctuation" color="rgba(52, 199, 89, 1)" onClick={() => openResetSheet('punctuation', 'Punctuation')} />
                  </div>
                </div>

                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <button 
                    onClick={() => openResetSheet('all', 'All Studio')}
                    disabled={saving}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(255, 59, 48, 0.1)', 
                      color: 'var(--color-error)', border: 'none', fontSize: '16px', fontWeight: 600, cursor: 'pointer' 
                    }}
                  >
                    Reset All Studio Progress
                  </button>
                </div>

                <div style={{ marginTop: 'var(--sp-8)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--sp-6)' }}>
                  <h2 className="settings-section-title">Insights Baseline</h2>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
                    Cleanse your Insights tab so mistake breakdowns, active coaching habits, and the Mistake Vault strictly reflect authentic, unassisted Studio writing drills.
                  </p>
                  <button 
                    onClick={() => openResetSheet('insights', 'Insights Baseline')}
                    disabled={saving}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(0, 113, 227, 0.08)', 
                      color: 'var(--accent-color)', border: '1px solid rgba(0, 113, 227, 0.25)', fontSize: '16px', fontWeight: 600, cursor: 'pointer' 
                    }}
                  >
                    Reset Insights to Studio Baseline
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'question-bank' && (
              <motion.div 
                key="question-bank"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              >
                <QuestionBankTab currentUser={currentUser} setToast={setToast} />
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div 
                key="account"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              >
                <h2 className="settings-section-title">Account</h2>
                <div className="surface-raised" style={{ padding: 'var(--sp-5)', borderRadius: '16px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 500, marginBottom: '4px' }}>Signed in as</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{currentUser?.email}</div>
                  
                  <div style={{ marginTop: 'var(--sp-6)' }}>
                    <button 
                      onClick={openSignOutSheet}
                      style={{ 
                        padding: '12px 24px', borderRadius: '20px', background: 'var(--surface-color)', border: '1px solid var(--border-color)',
                        color: 'var(--color-error)', fontSize: '16px', fontWeight: 600, cursor: 'pointer' 
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{ 
              position: 'fixed', top: 'var(--sp-6)', left: '50%', zIndex: 1200,
              background: 'rgba(50,50,55,0.95)', backdropFilter: 'blur(10px)',
              color: 'white', padding: '12px 24px', borderRadius: '30px',
              fontSize: '15px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Sheet (Apple-style destructive modal) */}
      <AnimatePresence>
        {actionSheet && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 'var(--sp-6)', padding: 'var(--sp-4)' }}>
            {/* Scrim */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
              onClick={() => setActionSheet(null)}
            />
            
            {/* Sheet Container */}
            <motion.div 
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }} // critically damped spring
              style={{
                position: 'relative', width: '100%', maxWidth: '380px',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}
            >
              <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.1)', color: '#8e8e93', fontSize: '13px', lineHeight: 1.4 }}>
                  {actionSheet.title}
                </div>
                <button 
                  onClick={actionSheet.onConfirm}
                  disabled={saving}
                  style={{ width: '100%', padding: '18px', background: 'transparent', border: 'none', color: '#ff3b30', fontSize: '20px', fontWeight: 500, cursor: 'pointer' }}
                >
                  {saving ? 'Processing…' : actionSheet.actionLabel}
                </button>
              </div>
              <button 
                onClick={() => setActionSheet(null)}
                style={{ width: '100%', padding: '18px', background: 'white', borderRadius: '14px', border: 'none', color: '#007aff', fontSize: '20px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ResetItem({ label, color, onClick }) {
  const [pressed, setPressed] = useState(false);
  
  return (
    <div 
      style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '16px', cursor: 'pointer',
        background: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
        transition: 'background 100ms ease'
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
    >
      <span style={{ fontSize: '17px', fontWeight: 500 }}>{label}</span>
      <span style={{ color: color, fontSize: '15px' }}>Reset</span>
    </div>
  );
}
