import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { springs } from '../motion/springs';

const NavStackContext = createContext(null);

export function NavStackProvider({ children }) {
  const [stack, setStack] = useState([]);

  // Browser back button handling
  useEffect(() => {
    const handlePopState = () => {
      setStack(prev => {
        if (prev.length > 0) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const push = useCallback((page) => {
    // page: { id, title, component, props, hideTab }
    window.history.pushState({ pageId: page.id || Date.now() }, '');
    setStack(prev => [...prev, page]);
  }, []);

  const pop = useCallback(() => {
    setStack(prev => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  const popToRoot = useCallback(() => {
    setStack([]);
  }, []);

  const topPage = stack[stack.length - 1] || null;
  const isTabBarHidden = !!topPage?.hideTab;
  const hasPushed = stack.length > 0;

  return (
    <NavStackContext.Provider value={{ push, pop, popToRoot, stack, topPage, isTabBarHidden, hasPushed }}>
      {children}
    </NavStackContext.Provider>
  );
}

export function NavPagesLayer() {
  const { stack, pop } = useNav();

  return (
    <AnimatePresence>
      {stack.map((page, index) => {
        const isTop = index === stack.length - 1;
        const Component = page.component;

        return (
          <m.div
            key={page.key || page.id || index}
            initial={{ x: '100%' }}
            animate={{
              x: isTop ? '0%' : '-20%',
              opacity: isTop ? 1 : 0.6,
              scale: isTop ? 1 : 0.98
            }}
            exit={{ x: '100%' }}
            transition={springs.content}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--bg)',
              zIndex: 35 + index,
              boxShadow: '-24px 0 48px rgba(0,0,0,0.45)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: page.hideTab ? '40px' : '96px'
            }}
          >
            <Component {...page.props} onBack={pop} />
          </m.div>
        );
      })}
    </AnimatePresence>
  );
}

export function useNav() {
  const ctx = useContext(NavStackContext);
  if (!ctx) {
    throw new Error('useNav must be used within a NavStackProvider');
  }
  return ctx;
}

export default NavStackProvider;
