import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  listenToAllWords,
  listenToPendingWords,
  listenToUserStats,
  listenToMistakeCounts,
  listenToMistakeVault,
  listenToAnthology,
  listenToCraftStats,
  listenToStyleProfile,
  getUserSettings,
  saveUserSettings,
  calcCraftLevel
} from '../services/db';

const DataContext = createContext(null);

export function DataProvider({ currentUser, children }) {
  const [words, setWords] = useState([]);
  const [pendingWords, setPendingWords] = useState([]);
  const [stats, setStats] = useState({ currentStreak: 0, highestStreak: 0, activeDates: [] });
  const [craft, setCraft] = useState({});
  const [styleProfile, setStyleProfile] = useState({ habits: [] });
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
  const [loaded, setLoaded] = useState(false);

  // Open listeners ONCE when currentUser is available
  useEffect(() => {
    if (!currentUser?.uid) {
      setWords([]);
      setPendingWords([]);
      setVault([]);
      setAnthology([]);
      setCraft({});
      setStyleProfile({ habits: [] });
      setLoading(false);
      setLoaded(true);
      return;
    }

    const uid = currentUser.uid;
    let requiredLoads = { words: false, pending: false, stats: false, craft: false };
    const markLoaded = (key) => {
      requiredLoads[key] = true;
      if (Object.values(requiredLoads).every(Boolean)) {
        setLoaded(true);
        setLoading(false);
      }
    };

    const unsubWords = listenToAllWords(uid, (data) => {
      setWords(data || []);
      markLoaded('words');
    });

    const unsubPending = listenToPendingWords(uid, (data) => {
      setPendingWords(data || []);
      markLoaded('pending');
    });

    const unsubStats = listenToUserStats(uid, (data) => {
      setStats(data || { currentStreak: 0, highestStreak: 0, activeDates: [] });
      markLoaded('stats');
    });

    const unsubCraft = listenToCraftStats(uid, (data) => {
      setCraft(data || {});
      markLoaded('craft');
    });

    const unsubStyle = listenToStyleProfile(uid, (data) => {
      setStyleProfile(data || { habits: [] });
    });

    const unsubMistakes = listenToMistakeCounts(uid, (data) => {
      setMistakeCounts(data || {});
    });

    const unsubVault = listenToMistakeVault(uid, (data) => {
      setVault(data || []);
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
      unsubCraft && unsubCraft();
      unsubStyle && unsubStyle();
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

    // Craft stats, totals & rank from profile/craft
    const combinedTiers = {
      1: (craft.grammar?.tierCompletions?.[1] || 0) + (craft.flow?.tierCompletions?.[1] || 0) + (craft.context?.tierCompletions?.[1] || 0) + (craft.punctuation?.tierCompletions?.[1] || 0),
      2: (craft.grammar?.tierCompletions?.[2] || 0) + (craft.flow?.tierCompletions?.[2] || 0) + (craft.context?.tierCompletions?.[2] || 0) + (craft.punctuation?.tierCompletions?.[2] || 0),
      3: (craft.grammar?.tierCompletions?.[3] || 0) + (craft.flow?.tierCompletions?.[3] || 0) + (craft.context?.tierCompletions?.[3] || 0) + (craft.punctuation?.tierCompletions?.[3] || 0),
      4: (craft.grammar?.tierCompletions?.[4] || 0) + (craft.flow?.tierCompletions?.[4] || 0) + (craft.context?.tierCompletions?.[4] || 0) + (craft.punctuation?.tierCompletions?.[4] || 0),
    };
    const totalCraftXp = (craft.grammar?.xp || 0) + (craft.flow?.xp || 0) + (craft.context?.xp || 0) + (craft.punctuation?.xp || 0);
    const totalCraftSolved = (craft.grammar?.solved || 0) + (craft.flow?.solved || 0) + (craft.context?.solved || 0) + (craft.punctuation?.solved || 0);
    const craftLevelInfo = calcCraftLevel(totalCraftXp, combinedTiers);

    // Daily 0/12 session plan strictly for today's date
    const nowDate = new Date();
    const todayStr = nowDate.getFullYear() + '-' + String(nowDate.getMonth() + 1).padStart(2, '0') + '-' + String(nowDate.getDate()).padStart(2, '0');
    const isToday = stats.today?.date === todayStr;
    const reviewsDone = isToday ? (stats.today.reviewsDone || 0) : 0;
    const drillsDone = isToday ? (stats.today.drillsDone || 0) : 0;
    const wordWritten = isToday ? !!stats.today.wordWritten : false;
    const itemsDone = Math.min(12, reviewsDone + drillsDone + (wordWritten ? 3 : 0));

    const todayPlan = {
      date: todayStr,
      reviewsDueCount: dueWords.length,
      reviewsDone,
      drillsDone,
      wordWritten,
      itemsDone
    };

    return {
      dueWords,
      savedWords,
      masteredWords,
      learningWords,
      openMistakes,
      fixedMistakes,
      craft,
      totalCraftXp,
      totalCraftSolved,
      craftLevelInfo,
      todayPlan
    };
  }, [words, pendingWords, stats, craft, vault]);

  const updateSettingsHandler = async (newSettings) => {
    if (!currentUser?.uid) return;
    setSettings(prev => ({ ...prev, ...newSettings }));
    await saveUserSettings(currentUser.uid, newSettings);
  };

  const contextValue = {
    currentUser,
    loading,
    loaded,
    words,
    pendingWords,
    stats,
    craft,
    styleProfile,
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
  const { words, dueWords, savedWords, masteredWords, learningWords, loading, loaded } = useData();
  return { allWords: words, dueWords, savedWords, masteredWords, learningWords, loading, loaded };
}

export function useStats() {
  const { stats, todayPlan, craft, totalCraftXp, totalCraftSolved, craftLevelInfo, loaded } = useData();
  return {
    stats,
    todayPlan,
    craft,
    totalCraftXp,
    totalCraftSolved,
    craftLevelInfo,
    currentStreak: stats.currentStreak,
    highestStreak: stats.highestStreak,
    loaded
  };
}

export function useVault() {
  const { vault, openMistakes, fixedMistakes, mistakeCounts } = useData();
  return { allMistakes: vault, openMistakes, fixedMistakes, mistakeCounts };
}

export function useAnthology() {
  const { anthology } = useData();
  return { anthology };
}

export function useSettings() {
  const { settings, updateSettings } = useData();
  return { settings, updateSettings };
}
