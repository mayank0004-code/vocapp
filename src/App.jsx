import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppShell from './app/AppShell';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dual-mode UI switch: 'v2' (redesign) is default. Set localStorage['vocapp.ui'] = 'v1' or ?ui=v1 for classic UI fallback.
  const [uiVersion] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryUI = params.get('ui');
      if (queryUI === 'v2' || queryUI === 'v1') {
        localStorage.setItem('vocapp.ui', queryUI);
        return queryUI;
      }
      return localStorage.getItem('vocapp.ui') || 'v2';
    } catch {
      return 'v2';
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
