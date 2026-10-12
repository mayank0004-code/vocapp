import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  listenToAllWords,
  listenToPendingWords,
  listenToUserStats,
  listenToMistakeCounts,
  listenToMistakeVault,
  listenToAnthology,
  getUserSettings,
  saveUserSettings,
  calcCraftLevel
} from '../services/db';

const DataContext = createContext(null);

export function DataProvider({ currentUser, children }) {
  const [words, setWords] = useState([]);
  const [pendingWords, setPendingWords] = useState([]);
  const [stats, setStats] = useState({ currentStreak: 0, highestStreak: 0, activeDates: [] });
  const [mistakeCounts, setMistakeCounts] = useState({});
  const [vault, setVault] = useState([]);
  const [anthology, setAnthology] = useState([]);
  const [settings, setSettings] = useState({
    notificationsEnabled: false,
    timingMode: 'smart',
    customTime: '18:00',
    englishLevel: 2,
    autoAdjustLevel: true
  });
  const [loading, setLoading] = useState(true);

  // Open listeners ONCE when currentUser is available
  useEffect(() => {
    if (!currentUser?.uid) {
      setWords([]);
      setPendingWords([]);
      setVault([]);
      setAnthology([]);
      setLoading(false);
      return;
    }

    const uid = currentUser.uid;
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 4) setLoading(false);
    };

    const unsubWords = listenToAllWords(uid, (data) => {
      setWords(data || []);
      checkLoaded();
    });

    const unsubPending = listenToPendingWords(uid, (data) => {
      setPendingWords(data || []);
      checkLoaded();
    });

    const unsubStats = listenToUserStats(uid, (data) => {
      setStats(data || { currentStreak: 0, highestStreak: 0, activeDates: [] });
      checkLoaded();
    });

    const unsubMistakes = listenToMistakeCounts(uid, (data) => {
      setMistakeCounts(data || {});
    });

    const unsubVault = listenToMistakeVault(uid, (data) => {
      setVault(data || []);
      checkLoaded();
    });

    const unsubAnthology = listenToAnthology(uid, (data) => {
      setAnthology(data || []);
    });

    getUserSettings(uid).then((data) => {
      if (data) setSettings(data);
    }).catch(console.error);

    return () => {
      unsubWords && unsubWords();
      unsubPending && unsubPending();
      unsubStats && unsubStats();
      unsubMistakes && unsubMistakes();
      unsubVault && unsubVault();
      unsubAnthology && unsubAnthology();
    };
  }, [currentUser?.uid]);

  // Derived Selectors
  const selectors = useMemo(() => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Due words (interval-based SRS)
    const dueWords = words.filter(w =>
      typeof w.nextReviewDate === 'number' &&
      w.nextReviewDate > 0 &&
      w.nextReviewDate <= now
    );

    // Saved words with calculated expiry
    const savedWords = pendingWords.map(w => {
      const age = now - (w.createdAt || now);
      const remainingMs = Math.max(0, SEVEN_DAYS_MS - age);
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return {
        ...w,
        expiresInDays: remainingDays,
        dueLabel: remainingDays <= 2 ? `Expires in ${remainingDays}d` : `Saved ${Math.floor(age / (24 * 60 * 60 * 1000))}d ago`
      };
    });

    // Mastered words (interval >= 14 or status === 'mastered')
    const masteredWords = words.filter(w => (w.interval && w.interval >= 14) || w.status === 'mastered');

    // Learning words
    const learningWords = words.filter(w => !dueWords.includes(w) && !masteredWords.includes(w));

    // Open vs fixed mistakes
    const openMistakes = vault.filter(m => !m.isRedeemed && !m.fixed);
    const fixedMistakes = vault.filter(m => m.isRedeemed || m.fixed);

    // Craft stats & rank
    const craftLevelInfo = calcCraftLevel(stats.xp || stats.totalPracticed || 0, stats.tierCompletions || {});

    // Daily 0/12 session plan
    const todayPlan = {
      reviewsDueCount: dueWords.length,
      drillsDone: stats.drillsDone || 0,
      wordsWritten: stats.wordsWritten || 0,
      itemsDone: Math.min(12, (stats.reviewsDone || 0) + (stats.drillsDone || 0) + (stats.wordsWritten || 0) * 3)
    };

    return {
      dueWords,
      savedWords,
      masteredWords,
      learningWords,
      openMistakes,
      fixedMistakes,
      craftLevelInfo,
      todayPlan
    };
  }, [words, pendingWords, stats, vault]);

  const updateSettingsHandler = async (newSettings) => {
    if (!currentUser?.uid) return;
    setSettings(prev => ({ ...prev, ...newSettings }));
    await saveUserSettings(currentUser.uid, newSettings);
  };

  const contextValue = {
    currentUser,
    loading,
    words,
    pendingWords,
    stats,
    mistakeCounts,
    vault,
    anthology,
    settings,
    updateSettings: updateSettingsHandler,
    ...selectors
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}

export function useWords() {
  const { words, dueWords, savedWords, masteredWords, learningWords, loading } = useData();
  return { allWords: words, dueWords, savedWords, masteredWords, learningWords, loading };
}

export function useStats() {
  const { stats, todayPlan, craftLevelInfo } = useData();
  return { stats, todayPlan, craftLevelInfo, currentStreak: stats.currentStreak, highestStreak: stats.highestStreak };
}

export function useVault() {
  const { vault, openMistakes, fixedMistakes } = useData();
  return { allMistakes: vault, openMistakes, fixedMistakes };
}

export function useAnthology() {
  const { anthology } = useData();
  return { anthology };
}

export function useSettings() {
  const { settings, updateSettings } = useData();
  return { settings, updateSettings };
}
