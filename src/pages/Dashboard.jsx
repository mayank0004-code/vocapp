import React, { useState } from 'react';
import Learn from './Learn';
import Quiz from './Quiz';
import Dictionary from './Dictionary';

const Icon = ({ path, size, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

const BookA = { path: ["M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20", "M12 13V7c0-1.1.9-2 2-2h1", "M16 13V7c0-1.1-.9-2-2-2h-1", "M12 13h4"] };
const GraduationCap = { path: ["M22 10v6", "M2 10l10-5 10 5-10 5z", "M6 12v5c3 3 9 3 12 0v-5"] };
const Library = { path: ["M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20", "M8 7h8", "M8 11h8"] };
const LogOut = { path: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"] };

export default function Dashboard({ currentUser, logout }) {
  const [activeTab, setActiveTab] = useState('learn');

  const navItems = [
    { id: 'learn', label: 'Learn', icon: BookA },
    { id: 'quiz', label: 'Quiz', icon: GraduationCap },
    { id: 'dictionary', label: 'Dictionary', icon: Library },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="glass-panel" style={{ 
        position: 'sticky', top: 0, zIndex: 10, padding: '16px 24px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '16px', backgroundColor: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
          </div>
          <span className="text-body" style={{ fontWeight: 600 }}>Vocapp</span>
        </div>
        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={logout}>
          <Icon path={LogOut.path} size={16} style={{ marginRight: '6px' }} />
          Logout
        </button>
      </header>

      <main className="container" style={{ flex: 1, paddingBottom: '100px' }}>
        <div style={{ display: activeTab === 'learn' ? 'block' : 'none' }}>
          <Learn currentUser={currentUser} />
        </div>
        <div style={{ display: activeTab === 'quiz' ? 'block' : 'none' }}>
          <Quiz currentUser={currentUser} />
        </div>
        <div style={{ display: activeTab === 'dictionary' ? 'block' : 'none' }}>
          <Dictionary currentUser={currentUser} />
        </div>
      </main>

      <nav className="glass-panel" style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', padding: '8px', gap: '8px', borderRadius: 'var(--radius-pill)',
        zIndex: 10, width: 'calc(100% - 48px)', maxWidth: '400px', justifyContent: 'space-between'
      }}>
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                padding: '8px', background: isActive ? 'var(--surface-color)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                transition: 'all 0.2s ease', boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Icon path={item.icon.path} size={24} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
