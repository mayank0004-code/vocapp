import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppShell from './app/AppShell';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dual-mode UI switch: 'v1' is default until Phase 7. Set localStorage['vocapp.ui'] = 'v2' or ?ui=v2 to test redesign.
  const [uiVersion] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryUI = params.get('ui');
      if (queryUI === 'v2' || queryUI === 'v1') {
        localStorage.setItem('vocapp.ui', queryUI);
        return queryUI;
      }
      return localStorage.getItem('vocapp.ui') || 'v1';
    } catch {
      return 'v1';
    }
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  if (loading) return null;

  if (!currentUser) {
    return <Login login={login} />;
  }

  return uiVersion === 'v2' ? (
    <AppShell currentUser={currentUser} logout={logout} />
  ) : (
    <Dashboard currentUser={currentUser} logout={logout} />
  );
}

export default App;
