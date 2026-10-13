import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc, increment, addDoc, orderBy, limit, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db, messaging } from '../firebase';
import { getToken } from 'firebase/messaging';

export async function checkWordExists(userId, word) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', word.toLowerCase());
    const snapshot = await getDoc(wordRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking word existence:", error);
    throw error;
  }
}

export async function enablePushNotifications(userId) {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging);
      if (token) {
        const settingsRef = doc(db, 'users', userId, 'profile', 'settings');
        await setDoc(settingsRef, {
          notificationsEnabled: true,
          fcmToken: token,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error enabling push notifications:', error);
    return null;
  }
}

export async function saveUserSettings(userId, settingsPayload) {
  try {
    const settingsRef = doc(db, 'users', userId, 'profile', 'settings');
    await setDoc(settingsRef, settingsPayload, { merge: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
  }
}

export async function getUserSettings(userId) {
  try {
    const settingsRef = doc(db, 'users', userId, 'profile', 'settings');
    const snapshot = await getDoc(settingsRef);
    return snapshot.exists() ? snapshot.data() : { notificationsEnabled: false, timingMode: 'smart', customTime: '18:00', englishLevel: 1, autoAdjustLevel: true };
  } catch (error) {
    console.error("Error getting user settings:", error);
    return { notificationsEnabled: false, timingMode: 'smart', customTime: '18:00', englishLevel: 1, autoAdjustLevel: true };
  }
}

export async function getUserEnglishLevel(userId) {
  if (!userId) return { level: 1, autoAdjust: true };
  try {
    const settings = await getUserSettings(userId);
    const level = Math.min(5, Math.max(1, parseInt(settings.englishLevel, 10) || 1));
    const autoAdjust = settings.autoAdjustLevel !== false;
    return { level, autoAdjust };
  } catch (error) {
    console.error("Error getting English level:", error);
    return { level: 1, autoAdjust: true };
  }
}

export async function setUserEnglishLevel(userId, level, autoAdjust = true) {
  if (!userId) return;
  try {
    const sanitizedLevel = Math.min(5, Math.max(1, parseInt(level, 10) || 1));
    await saveUserSettings(userId, {
      englishLevel: sanitizedLevel,
      autoAdjustLevel: !!autoAdjust
    });
  } catch (error) {
    console.error("Error setting English level:", error);
  }
}

export async function logNotificationClick(userId, tone) {
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    await setDoc(statsRef, {
      [`toneSuccess.${tone}`]: increment(1),
      lastNotificationClicked: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error logging notification click:", error);
  }
}

export async function saveLearnedWord(userId, wordData) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordData.word.toLowerCase());
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 1); // First review in 1 day

    await setDoc(wordRef, {
      ...wordData,
      word: wordData.word.toLowerCase(),
      interval: 1,
      nextReviewDate: nextReviewDate.getTime(),
      createdAt: wordData.createdAt || new Date().getTime(),
      status: 'learned'
    }, { merge: true });
  } catch (error) {
    console.error("Error saving word:", error);
    throw error;
  }
}

export async function getDueWords(userId) {
  try {
    const now = Date.now();
    const vocabRef = collection(db, 'users', userId, 'vocabulary');
    const q = query(vocabRef, where('nextReviewDate', '<=', now));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(w => w.status !== 'pending' && typeof w.nextReviewDate === 'number' && w.nextReviewDate > 0 && w.nextReviewDate <= now);
  } catch (error) {
    console.error("Error fetching due words:", error);
    throw error;
  }
}

export async function getScheduledReviewCount(userId) {
  try {
    const words = await getDueWords(userId);
    return words.length;
  } catch {
    return 0;
  }
}


export function listenToDueWords(userId, callback) {
  const vocabRef = collection(db, 'users', userId, 'vocabulary');
  return onSnapshot(vocabRef, (snapshot) => {
    const now = Date.now();
    const words = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(w => w.status !== 'pending' && typeof w.nextReviewDate === 'number' && w.nextReviewDate > 0 && w.nextReviewDate <= now);
    callback(words);
  }, (error) => {
    console.error("Error listening to due words:", error);
  });
}

export function listenToAllWords(userId, callback) {
  const vocabRef = collection(db, 'users', userId, 'vocabulary');
  return onSnapshot(vocabRef, (snapshot) => {
    const words = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(w => w.status !== 'pending');
    callback(words);
  }, (error) => {
    console.error("Error listening to all words:", error);
  });
}

export async function getAllWords(userId) {
  try {
    const vocabRef = collection(db, 'users', userId, 'vocabulary');
    const querySnapshot = await getDocs(vocabRef);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(w => w.status !== 'pending');
  } catch (error) {
    console.error("Error fetching all words:", error);
    throw error;
  }
}

export async function updateWordSRS(userId, wordId, isCorrect, currentInterval) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
    
    let newInterval = 1;
    // A word missing its interval would otherwise compute NaN and never be due again.
    if (!Number.isFinite(currentInterval) || currentInterval < 1) currentInterval = 1;
    if (isCorrect) {
      if (currentInterval === 1) newInterval = 3;
      else if (currentInterval === 3) newInterval = 7;
      else if (currentInterval === 7) newInterval = 14;
      else newInterval = currentInterval * 2;
    }
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    await setDoc(wordRef, {
      interval: newInterval,
      nextReviewDate: nextReviewDate.getTime()
    }, { merge: true });

    await recordDailyActivity(userId);
    
  } catch (error) {
    console.error("Error updating word SRS:", error);
    throw error;
  }
}

export async function deleteLearnedWord(userId, wordId) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
    await deleteDoc(wordRef);
  } catch (error) {
    console.error("Error deleting word:", error);
    throw error;
  }
}

export async function savePendingWord(userId, wordData) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordData.word.toLowerCase());
    await setDoc(wordRef, {
      ...wordData,
      word: wordData.word.toLowerCase(),
      createdAt: new Date().getTime(),
      status: 'pending'
    }, { merge: true });
  } catch (error) {
    console.error("Error saving pending word:", error);
    throw error;
  }
}

export async function deletePendingWord(userId, wordId) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
    await deleteDoc(wordRef);
  } catch (error) {
    console.error("Error deleting pending word:", error);
    throw error;
  }
}

export async function getPendingWords(userId) {
  try {
    const vocabRef = collection(db, 'users', userId, 'vocabulary');
    const q = query(vocabRef, where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching pending words:", error);
    throw error;
  }
}

// Undo for a removed saved word: puts the doc back exactly as it was,
// keeping its original createdAt so the 7-day expiry doesn't restart.
export async function restorePendingWord(userId, wordData) {
  // eslint-disable-next-line no-unused-vars
  const { id, expiresInDays, dueLabel, isExpiringSoon, ...data } = wordData;
  const wordRef = doc(db, 'users', userId, 'vocabulary', id || data.word.toLowerCase());
  await setDoc(wordRef, {
    ...data,
    word: data.word.toLowerCase(),
    createdAt: data.createdAt || new Date().getTime(),
    status: 'pending'
  }, { merge: true });
}

export function listenToPendingWords(userId, callback) {
  const vocabRef = collection(db, 'users', userId, 'vocabulary');
  const q = query(vocabRef, where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    const now = new Date().getTime();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    
    const validWords = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const age = now - (data.createdAt || now);
      
      if (age > SEVEN_DAYS_MS) {
        // Auto-delete if older than 7 days
        deleteDoc(doc.ref).catch(console.error);
      } else {
        validWords.push({
          id: doc.id,
          ...data,
          isExpiringSoon: age > FIVE_DAYS_MS
        });
      }
    });
    
    callback(validWords);
  }, (error) => {
    console.error("Error listening to pending words:", error);
  });
}


export const CANONICAL_HABITS = {
  'clause-stacking': {
    key: 'clause-stacking',
    title: 'Run-On Sentence',
    pillar: 'flow',
    ruleOfThumb: 'One thought at a time: Avoid stringing thoughts together with endless "and so" or "and then".',
  },
  'comma-splice': {
    key: 'comma-splice',
    title: 'Two Sentences Glued by a Comma',
    pillar: 'punctuation',
    ruleOfThumb: 'Separate complete sentences with a period, not just a comma.',
  },
  'breath-trap': {
    key: 'breath-trap',
    title: 'Needs a Breath',
    pillar: 'flow',
    ruleOfThumb: 'If you run out of breath reading it out loud, split it into two sentences.',
  },
  'bottom-heavy': {
    key: 'bottom-heavy',
    title: 'Main Point Buried at the End',
    pillar: 'flow',
    ruleOfThumb: 'Put the main point first, then give the extra details.',
  },
  'tense-drift': {
    key: 'tense-drift',
    title: 'Mixed Past & Present',
    pillar: 'grammar',
    ruleOfThumb: 'Stick to one time frame: don\'t jump between past and present mid-sentence.',
  },
  'subject-verb-split': {
    key: 'subject-verb-split',
    title: 'Action Separated from Actor',
    pillar: 'grammar',
    ruleOfThumb: 'Keep who is doing the action and the action itself close together.',
  },
  'literal-collocation': {
    key: 'literal-collocation',
    title: 'Stiff / Robotic Phrasing',
    pillar: 'context',
    ruleOfThumb: 'Say who did what directly instead of using stiff, formal phrases like "a decision was made by".',
  },
  'other': {
    key: 'other',
    title: 'Awkward Phrasing',
    pillar: 'flow',
    ruleOfThumb: 'Keep it simple and direct: Choose the cleanest way to express the idea.',
  },
};

export async function getUserMistakePatterns(userId) {
  try {
    const longitudinalContext = [];

    // 1. Fetch active recurring habits from styleProfile
    const styleRef = doc(db, 'users', userId, 'profile', 'styleProfile');
    const styleSnap = await getDoc(styleRef);
    if (styleSnap.exists()) {
      const habits = styleSnap.data().habits || {};
      const activeHabits = Object.values(habits)
        .filter(h => h.count > 0)
        .sort((a, b) => b.count - a.count);

      if (activeHabits.length > 0) {
        longitudinalContext.push(
          "Active Recurring Habits Under Coaching:\n" +
          activeHabits.map(h => `• [${h.title || h.key}] (${h.pillar}): Observed ${h.count}x (Status: ${h.status || 'needs_attention'})`).join('\n')
        );
      }
    }

    // 2. Fetch last 5 mistakes from mistake vault
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const q = query(mistakesRef, orderBy('timestamp', 'desc'), limit(5));
    const mistakeSnap = await getDocs(q);
    if (!mistakeSnap.empty) {
      const recentSlips = mistakeSnap.docs.map((d, i) => {
        const data = d.data();
        return `${i + 1}. Word "${data.word}": "${data.originalSentence}" -> Diagnosis: ${data.structuralDiagnosis || data.errorTags?.join(', ') || 'awkward phrasing'}`;
      });
      longitudinalContext.push("Recent Sentence Slips:\n" + recentSlips.join('\n'));
    }

    // 3. Fallback to tag counts if nothing in vault yet
    if (longitudinalContext.length === 0) {
      const profileRef = doc(db, 'users', userId, 'profile', 'mistakes');
      const snapshot = await getDoc(profileRef);
      if (snapshot.exists()) {
        const counts = snapshot.data();
        const sortedTags = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([tag]) => tag);
        if (sortedTags.length > 0) {
          longitudinalContext.push(`The user historically struggles with: ${sortedTags.join(", ")}.`);
        }
      }
    }

    return longitudinalContext.join('\n\n');
  } catch (error) {
    console.error("Error fetching mistake patterns:", error);
    return "";
  }
}

export function listenToStyleProfile(userId, callback) {
  const profileRef = doc(db, 'users', userId, 'profile', 'styleProfile');
  return onSnapshot(profileRef, (snap) => {
    callback(snap.exists() ? snap.data() : { habits: {} });
  }, (error) => {
    console.error("Error listening to style profile:", error);
    callback({ habits: {} });
  });
}

export async function getStyleProfile(userId) {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'styleProfile');
    const snap = await getDoc(profileRef);
    return snap.exists() ? snap.data() : { habits: {} };
  } catch (err) {
    console.error("Error getting style profile:", err);
    return { habits: {} };
  }
}

export async function recordDailyActivity(userId) {
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    const snap = await getDoc(statsRef);
    const data = snap.exists() ? snap.data() : {};

    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

    const lastDate = data.lastPracticedDate || null;
    let currentStreak = data.currentStreak || 0;

    if (lastDate === todayStr) {
      // Already recorded activity for today; ensure today is in activeDates
      await setDoc(statsRef, {
        activeDates: arrayUnion(todayStr),
      }, { merge: true });
      return;
    }

    if (lastDate === yesterdayStr) {
      currentStreak = (currentStreak || 0) + 1;
    } else {
      currentStreak = 1;
    }

    const highestStreak = Math.max(data.highestStreak || 0, currentStreak);

    await setDoc(statsRef, {
      lastPracticedDate: todayStr,
      currentStreak: currentStreak,
      highestStreak: highestStreak,
      activeDates: arrayUnion(todayStr),
    }, { merge: true });
  } catch (error) {
    console.error("Error recording daily activity:", error);
  }
}

export async function recordReviewResult(userId, isCorrect, currentLevel) {
  if (!userId) return;
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    const snap = await getDoc(statsRef);
    const stats = snap.exists() ? snap.data() : {};

    const prevReviews = Array.isArray(stats.recentReviews) ? stats.recentReviews : [];
    const newEntry = {
      isCorrect: !!isCorrect,
      level: Math.min(5, Math.max(1, parseInt(currentLevel, 10) || 1)),
      timestamp: Date.now()
    };

    // Maintain a rolling window of the last 20 review outcomes
    const updatedReviews = [...prevReviews.slice(-19), newEntry];

    // Check if auto-adjust is enabled
    const settings = await getUserSettings(userId);
    let newLevel = Math.min(5, Math.max(1, parseInt(settings.englishLevel, 10) || currentLevel || 1));

    if (settings.autoAdjustLevel !== false && updatedReviews.length >= 15) {
      // Calculate accuracy at the current level
      const currentLevelReviews = updatedReviews.filter(r => r.level === newLevel);
      if (currentLevelReviews.length >= 12) {
        const correctCount = currentLevelReviews.filter(r => r.isCorrect).length;
        const accuracy = correctCount / currentLevelReviews.length;

        // Hysteresis: >= 85% promote, < 55% demote
        if (accuracy >= 0.85 && newLevel < 5) {
          newLevel = newLevel + 1;
          await saveUserSettings(userId, { englishLevel: newLevel });
        } else if (accuracy < 0.55 && newLevel > 1) {
          newLevel = newLevel - 1;
          await saveUserSettings(userId, { englishLevel: newLevel });
        }
      }
    }

    await setDoc(statsRef, {
      recentReviews: updatedReviews,
      totalReviews: increment(1),
      correctReviews: isCorrect ? increment(1) : increment(0),
      lastReviewDate: new Date().toISOString()
    }, { merge: true });

    return newLevel;
  } catch (error) {
    console.error("Error recording review result:", error);
  }
}

export async function savePracticeResult(userId, isCorrect, errorTags, mistakeData = null) {
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    
    const now = new Date();
    const currentHour = now.getHours().toString();
    
    const updatePayload = {
      totalPracticed: increment(1),
      [`activityHours.${currentHour}`]: increment(1)
    };
    
    if (!isCorrect || (errorTags && errorTags.length > 0)) {
      updatePayload.totalErrors = increment(1);
    }

    await setDoc(statsRef, updatePayload, { merge: true });
    await recordDailyActivity(userId);

    // If mistakeData exists, log to mistakes collection tagged with source: 'practice'
    // but DO NOT increment profile/mistakes or mutate profile/styleProfile
    // so that Insights strictly derives its metrics from authentic Studio drills.
    if (mistakeData && (!isCorrect || (errorTags && errorTags.length > 0) || mistakeData.isRevisionSuccess)) {
      const mistakesRef = collection(db, 'users', userId, 'mistakes');
      await addDoc(mistakesRef, {
        word: mistakeData.word || '',
        originalSentence: mistakeData.originalSentence || '',
        reframedSentence: mistakeData.reframedSentence || '',
        structuralDiagnosis: mistakeData.structuralDiagnosis || '',
        habitAlert: mistakeData.habitAlert || '',
        ruleOfThumb: mistakeData.ruleOfThumb || '',
        coachHint: mistakeData.coachHint || '',
        habitKey: mistakeData.habitKey || (errorTags?.[0] || 'other'),
        errorTags: errorTags || [],
        isRevisionSuccess: !!mistakeData.isRevisionSuccess,
        source: 'practice',
        timestamp: new Date().getTime()
      });
    }
  } catch (error) {
    console.error("Error saving practice result:", error);
  }
}

export async function recordStudioSlip(userId, {
  pillar,
  tier = 1,
  word = '',
  originalSentence = '',
  reframedSentence = '',
  structuralDiagnosis = '',
  ruleOfThumb = '',
  habitKey = null,
  errorTags = null,
  exerciseSessionId = null,
}) {
  try {
    const validPillar = ['grammar', 'flow', 'context', 'punctuation'].includes(pillar) ? pillar : 'flow';

    // 1. Atomically increment the pillar error count in profile/mistakes
    const tagsRef = doc(db, 'users', userId, 'profile', 'mistakes');
    await setDoc(tagsRef, {
      [validPillar]: increment(1)
    }, { merge: true });

    // 2. Resolve canonical habit key
    const rawKey = habitKey || (
      validPillar === 'flow' ? 'clause-stacking' :
      validPillar === 'punctuation' ? 'comma-splice' :
      validPillar === 'grammar' ? 'tense-drift' :
      validPillar === 'context' ? 'literal-collocation' : 'other'
    );
    const canonicalKey = CANONICAL_HABITS[rawKey] ? rawKey : (
      validPillar === 'flow' ? 'clause-stacking' :
      validPillar === 'punctuation' ? 'comma-splice' :
      validPillar === 'grammar' ? 'tense-drift' :
      validPillar === 'context' ? 'literal-collocation' : 'other'
    );
    const habitDef = CANONICAL_HABITS[canonicalKey] || CANONICAL_HABITS['other'];

    // 3. Add to mistakes collection with source: 'studio'
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const newDoc = await addDoc(mistakesRef, {
      word: (word || '').toLowerCase(),
      originalSentence: originalSentence || '',
      reframedSentence: reframedSentence || '',
      structuralDiagnosis: structuralDiagnosis || '',
      ruleOfThumb: ruleOfThumb || habitDef.ruleOfThumb || '',
      habitKey: canonicalKey,
      errorTags: errorTags || [validPillar],
      pillar: validPillar,
      tier: Number(tier) || 1,
      isRedeemed: false,
      source: 'studio',
      exerciseSessionId: exerciseSessionId || null,
      timestamp: Date.now(),
    });

    // 4. Update profile/styleProfile habit counter
    const styleRef = doc(db, 'users', userId, 'profile', 'styleProfile');
    const styleSnap = await getDoc(styleRef);
    const currentStyle = styleSnap.exists() ? styleSnap.data() : { habits: {} };
    const existingHabit = currentStyle.habits?.[canonicalKey] || {
      key: canonicalKey,
      title: habitDef.title,
      pillar: habitDef.pillar || validPillar,
      count: 0,
      consecutiveSuccesses: 0,
      status: 'needs_attention',
      lastObserved: Date.now(),
      lastWord: word || '',
    };

    existingHabit.count = (existingHabit.count || 0) + 1;
    existingHabit.consecutiveSuccesses = 0;
    existingHabit.status = 'needs_attention';
    existingHabit.lastObserved = Date.now();
    existingHabit.lastWord = word || '';

    await setDoc(styleRef, {
      habits: {
        ...(currentStyle.habits || {}),
        [canonicalKey]: existingHabit,
      },
      updatedAt: Date.now()
    }, { merge: true });

    return newDoc.id;
  } catch (error) {
    console.error("Error recording studio slip:", error);
  }
}

export async function recordStudioHabitSuccess(userId, { pillar, habitKey = null }) {
  try {
    const validPillar = ['grammar', 'flow', 'context', 'punctuation'].includes(pillar) ? pillar : 'flow';
    const rawKey = habitKey || (
      validPillar === 'flow' ? 'clause-stacking' :
      validPillar === 'punctuation' ? 'comma-splice' :
      validPillar === 'grammar' ? 'tense-drift' :
      validPillar === 'context' ? 'literal-collocation' : 'other'
    );
    const canonicalKey = CANONICAL_HABITS[rawKey] ? rawKey : 'other';

    const styleRef = doc(db, 'users', userId, 'profile', 'styleProfile');
    const styleSnap = await getDoc(styleRef);
    if (!styleSnap.exists()) return;

    const currentStyle = styleSnap.data();
    const existingHabit = currentStyle.habits?.[canonicalKey];
    if (!existingHabit) return;

    const nextSuccesses = (existingHabit.consecutiveSuccesses || 0) + 1;
    const nextStatus = nextSuccesses >= 4 ? 'mastering' : nextSuccesses >= 2 ? 'under_coaching' : existingHabit.status;

    await setDoc(styleRef, {
      habits: {
        ...currentStyle.habits,
        [canonicalKey]: {
          ...existingHabit,
          consecutiveSuccesses: nextSuccesses,
          status: nextStatus,
          lastSuccessAt: Date.now(),
        }
      },
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating studio habit success:", error);
  }
}

export async function resetMistakeInsights(userId) {
  try {
    const profileMistakesRef = doc(db, 'users', userId, 'profile', 'mistakes');
    await setDoc(profileMistakesRef, { grammar: 0, flow: 0, context: 0, punctuation: 0 });

    const styleRef = doc(db, 'users', userId, 'profile', 'styleProfile');
    await setDoc(styleRef, { habits: {} });

    return { success: true };
  } catch (err) {
    console.error("Error resetting mistake insights:", err);
    throw err;
  }
}

export async function getMistakeVault(userId) {
  try {
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const q = query(mistakesRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return all.filter(m => m.source !== 'practice');
  } catch (error) {
    console.error("Error fetching mistake vault:", error);
    return [];
  }
}

export async function getUserStats(userId) {
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    const snap = await getDoc(statsRef);
    if (!snap.exists()) {
      return { currentStreak: 0, highestStreak: 0, totalPracticed: 0, totalErrors: 0 };
    }
    return snap.data();
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { currentStreak: 0, highestStreak: 0, totalPracticed: 0, totalErrors: 0 };
  }
}

export async function getRawMistakeCounts(userId) {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'mistakes');
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) return {};
    return snapshot.data();
  } catch (error) {
    console.error("Error fetching raw mistake counts:", error);
    return {};
  }
}

export function listenToMistakeVault(userId, callback) {
  const mistakesRef = collection(db, 'users', userId, 'mistakes');
  const q = query(mistakesRef, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(all.filter(m => m.source !== 'practice'));
  }, (error) => {
    console.error("Error listening to mistake vault:", error);
  });
}

export function listenToUserStats(userId, callback) {
  const statsRef = doc(db, 'users', userId, 'profile', 'stats');
  return onSnapshot(statsRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

      let streak = data.currentStreak || 0;
      // Streak is valid if practiced today or yesterday; resets only if a full day was skipped
      if (data.lastPracticedDate && data.lastPracticedDate !== todayStr && data.lastPracticedDate !== yesterdayStr) {
        streak = 0;
      }
      callback({
        ...data,
        currentStreak: streak,
        highestStreak: Math.max(data.highestStreak || 0, streak),
        activeDates: data.activeDates || (data.lastPracticedDate ? [data.lastPracticedDate] : []),
      });
    } else {
      callback({ currentStreak: 0, highestStreak: 0, totalPracticed: 0, totalErrors: 0, activeDates: [] });
    }
  }, (error) => {
    console.error("Error listening to user stats:", error);
  });
}

export function listenToMistakeCounts(userId, callback) {
  const profileRef = doc(db, 'users', userId, 'profile', 'mistakes');
  return onSnapshot(profileRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({});
    }
  }, (error) => {
    console.error("Error listening to mistake counts:", error);
  });
}

/* ── Writing Studio / Craft Stats ────────────────────────── */
const DEFAULT_CRAFT_STATS = {
  grammar:     { xp: 0, solved: 0, level: 1, tierCompletions: { 1: 0, 2: 0, 3: 0, 4: 0 } },
  flow:        { xp: 0, solved: 0, level: 1, tierCompletions: { 1: 0, 2: 0, 3: 0, 4: 0 } },
  context:     { xp: 0, solved: 0, level: 1, tierCompletions: { 1: 0, 2: 0, 3: 0, 4: 0 } },
  punctuation: { xp: 0, solved: 0, level: 1, tierCompletions: { 1: 0, 2: 0, 3: 0, 4: 0 } },
  craftedWords: [],
  weeklySessions: 0,
  lastSessionDate: null,
  redeemedMistakeIds: [],
};

export function calcCraftLevel(xp = 0, tierCompletions = {}) {
  const t1 = tierCompletions?.[1] || 0;
  const t2 = tierCompletions?.[2] || 0;
  const t3 = tierCompletions?.[3] || 0;
  const t4 = tierCompletions?.[4] || 0;

  // Level 5: Master (1000+ XP & 5+ Tier 4 drills)
  if (xp >= 1000 && t4 >= 5) {
    return {
      level: 5,
      rank: 'Master',
      nextThreshold: 1000,
      currentBase: 1000,
      isCapped: false,
      nextRequirement: 'Mastery achieved across all tiers!'
    };
  }

  // Level 4: Stylist (600+ XP & 3+ Tier 4 drills)
  if (xp >= 600) {
    if (t4 >= 3) {
      return {
        level: 4,
        rank: 'Stylist',
        nextThreshold: 1000,
        currentBase: 600,
        isCapped: false,
        nextRequirement: `${Math.max(0, 1000 - xp)} XP & ${Math.max(0, 5 - t4)} more Creative drills for Master`
      };
    }
    // Capped at Level 3 if Tier 4 drills not completed
    return {
      level: 3,
      rank: 'Wordsmith',
      nextThreshold: 600,
      currentBase: 300,
      isCapped: true,
      nextRequirement: `Need ${Math.max(0, 3 - t4)} more Creative drill${3 - t4 === 1 ? '' : 's'} to unlock Stylist (Level 4)`
    };
  }

  // Level 3: Wordsmith (300+ XP & 3+ Tier 3 drills)
  if (xp >= 300) {
    if (t3 >= 3) {
      return {
        level: 3,
        rank: 'Wordsmith',
        nextThreshold: 600,
        currentBase: 300,
        isCapped: false,
        nextRequirement: `${Math.max(0, 600 - xp)} XP & ${Math.max(0, 3 - t4)} Creative drills for Stylist`
      };
    }
    // Capped at Level 2 if Tier 3 drills not completed
    return {
      level: 2,
      rank: 'Craftsman',
      nextThreshold: 300,
      currentBase: 100,
      isCapped: true,
      nextRequirement: `Need ${Math.max(0, 3 - t3)} more Vault Rehab drill${3 - t3 === 1 ? '' : 's'} to unlock Wordsmith (Level 3)`
    };
  }

  // Level 2: Craftsman (100+ XP & 3+ Tier 2 drills)
  if (xp >= 100) {
    if (t2 >= 3) {
      return {
        level: 2,
        rank: 'Craftsman',
        nextThreshold: 300,
        currentBase: 100,
        isCapped: false,
        nextRequirement: `${Math.max(0, 300 - xp)} XP & ${Math.max(0, 3 - t3)} Vault drills for Wordsmith`
      };
    }
    // Capped at Level 1 if Tier 2 drills not completed
    return {
      level: 1,
      rank: 'Apprentice',
      nextThreshold: 100,
      currentBase: 0,
      isCapped: true,
      nextRequirement: `Need ${Math.max(0, 3 - t2)} more Polish drill${3 - t2 === 1 ? '' : 's'} to unlock Craftsman (Level 2)`
    };
  }

  // Level 1: Apprentice (0-99 XP)
  return {
    level: 1,
    rank: 'Apprentice',
    nextThreshold: 100,
    currentBase: 0,
    isCapped: false,
    nextRequirement: `${Math.max(0, 100 - xp)} XP & ${Math.max(0, 3 - t2)} Polish drills for Craftsman`
  };
}

export function listenToCraftStats(userId, callback) {
  const craftRef = doc(db, 'users', userId, 'profile', 'craft');
  return onSnapshot(craftRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      // Helper to merge both nested maps and legacy dot-separated keys
      const parsePillar = (pName) => {
        const nested = data[pName] || {};
        const xp = nested.xp !== undefined ? nested.xp : (data[`${pName}.xp`] ?? DEFAULT_CRAFT_STATS[pName].xp);
        const solved = nested.solved !== undefined ? nested.solved : (data[`${pName}.solved`] ?? DEFAULT_CRAFT_STATS[pName].solved);
        const tierCompletions = nested.tierCompletions || { 1: 0, 2: 0, 3: 0, 4: 0 };
        const calculated = calcCraftLevel(xp, tierCompletions);
        return {
          xp,
          solved,
          level: calculated.level,
          rank: calculated.rank,
          tierCompletions,
          nextRequirement: calculated.nextRequirement,
          isCapped: calculated.isCapped
        };
      };

      const merged = {
        ...DEFAULT_CRAFT_STATS,
        ...data,
        grammar:     parsePillar('grammar'),
        flow:        parsePillar('flow'),
        context:     parsePillar('context'),
        punctuation: parsePillar('punctuation'),
      };
      callback(merged);
    } else {
      callback(DEFAULT_CRAFT_STATS);
    }
  }, (error) => {
    console.error("Error listening to craft stats:", error);
    callback(DEFAULT_CRAFT_STATS);
  });
}

export async function recordCraftProgress(userId, { pillar, tier = 1, xpGained = 20, redeemedMistakeId = null, wordUsed = null }) {
  try {
    const craftRef = doc(db, 'users', userId, 'profile', 'craft');
    const snap = await getDoc(craftRef);
    const current = snap.exists() ? snap.data() : DEFAULT_CRAFT_STATS;
    
    // Support nested map or legacy flat dot-key (prefer nested if it exists)
    const existingPillar = current[pillar] || {};
    const currentXp = existingPillar.xp !== undefined ? existingPillar.xp : (current[`${pillar}.xp`] || 0);
    const currentSolved = existingPillar.solved !== undefined ? existingPillar.solved : (current[`${pillar}.solved`] || 0);
    const existingTiers = existingPillar.tierCompletions || { 1: 0, 2: 0, 3: 0, 4: 0 };

    const newXp = currentXp + xpGained;
    const newSolved = currentSolved + 1;
    const nextTiers = {
      ...existingTiers,
      [tier]: (existingTiers[tier] || 0) + 1,
    };
    const { level } = calcCraftLevel(newXp, nextTiers);

    const updatePayload = {
      [pillar]: {
        xp: newXp,
        solved: newSolved,
        level: level,
        tierCompletions: nextTiers,
      },
      lastSessionDate: new Date().toISOString().split('T')[0],
      weeklySessions: increment(1),
    };

    if (wordUsed) {
      updatePayload.craftedWords = arrayUnion(wordUsed.toLowerCase());
    }

    if (redeemedMistakeId) {
      updatePayload.redeemedMistakeIds = arrayUnion(redeemedMistakeId);
      try {
        const mistakeDocRef = doc(db, 'users', userId, 'mistakes', redeemedMistakeId);
        await setDoc(mistakeDocRef, { isRedeemed: true, redeemedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.warn("Could not mark mistake as redeemed:", e);
      }
    }

    await setDoc(craftRef, updatePayload, { merge: true });
    await recordDailyActivity(userId);
    return { previousXp: currentXp, newXp, xpGained };
  } catch (error) {
    console.error("Error recording craft progress:", error);
  }
}

export async function deductCraftXP(userId, { pillar, xpLost = 5 }) {
  try {
    const craftRef = doc(db, 'users', userId, 'profile', 'craft');
    const snap = await getDoc(craftRef);
    const current = snap.exists() ? snap.data() : DEFAULT_CRAFT_STATS;

    const existingPillar = current[pillar] || {};
    const currentXp = existingPillar.xp !== undefined ? existingPillar.xp : (current[`${pillar}.xp`] || 0);
    const currentSolved = existingPillar.solved !== undefined ? existingPillar.solved : (current[`${pillar}.solved`] || 0);
    const existingTiers = existingPillar.tierCompletions || { 1: 0, 2: 0, 3: 0, 4: 0 };

    const newXp = Math.max(0, currentXp - xpLost);
    const actualLost = currentXp - newXp;
    const { level } = calcCraftLevel(newXp, existingTiers);

    const updatePayload = {
      [pillar]: {
        xp: newXp,
        solved: currentSolved,
        level: level,
        tierCompletions: existingTiers,
      },
      lastSessionDate: new Date().toISOString().split('T')[0],
    };

    await setDoc(craftRef, updatePayload, { merge: true });
    return { previousXp: currentXp, newXp, xpLost: actualLost };
  } catch (error) {
    console.error("Error deducting craft XP:", error);
    return { previousXp: 0, newXp: 0, xpLost: 0 };
  }
}

export async function resetCraftStats(userId, target) {
  try {
    const craftRef = doc(db, 'users', userId, 'profile', 'craft');
    
    if (target === 'all') {
      await setDoc(craftRef, DEFAULT_CRAFT_STATS, { merge: false });
    } else {
      const snap = await getDoc(craftRef);
      if (snap.exists()) {
        const updatePayload = {
          [target]: DEFAULT_CRAFT_STATS[target]
        };
        await setDoc(craftRef, updatePayload, { merge: true });
      }
    }
  } catch (error) {
    console.error(`Error resetting craft stats for ${target}:`, error);
    throw error;
  }
}

/* ── Anthology: Save & Manage Standout Sentences ─────────── */
export async function saveToAnthology(userId, { sentence, word, pillar }) {
  try {
    const anthologyRef = collection(db, 'users', userId, 'anthology');
    const docRef = await addDoc(anthologyRef, {
      sentence,
      word,
      pillar,
      timestamp: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving to anthology:", error);
    throw error;
  }
}

export async function deleteFromAnthology(userId, itemId) {
  try {
    const itemRef = doc(db, 'users', userId, 'anthology', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error("Error deleting from anthology:", error);
    throw error;
  }
}

export function listenToAnthology(userId, callback) {
  const anthologyRef = collection(db, 'users', userId, 'anthology');
  const q = query(anthologyRef, orderBy('timestamp', 'desc'), limit(30));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Error listening to anthology:", error);
  });
}

/* ── Living Question Bank & Excel Export ─────────────────── */

export async function saveQuestionToBank(userId, q) {
  if (!userId || !q || !q.word) return null;
  try {
    const qBankRef = collection(db, 'users', userId, 'questionBank');
    const docData = {
      word: (q.word || '').toLowerCase().trim(),
      definition: q.definition || '',
      type: q.type || 'fill-in-the-blank',
      level: Math.min(5, Math.max(1, parseInt(q.level, 10) || 1)),
      domain: q.domain || 'general',
      domainName: q.domainName || 'General',
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      interval: q.interval || 1,
      result: q.result || null,
      // Rich Flashcard Polysemy & Recall Fields
      relatesTo: q.relatesTo || '',
      memoryTrigger: q.memoryTrigger || '',
      hasSecondaryMeaning: !!q.hasSecondaryMeaning,
      secondaryMeaning: q.secondaryMeaning || '',
      activeMeaning: q.activeMeaning || 'primary',
      meaningLabel: q.meaningLabel || '',
      createdAt: Date.now(),
      createdAtIso: new Date().toISOString()
    };
    const docRef = await addDoc(qBankRef, docData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving question to bank:", error);
    return null;
  }
}

export async function updateQuestionBankResult(userId, questionBankId, isCorrect) {
  if (!userId || !questionBankId) return;
  try {
    const qRef = doc(db, 'users', userId, 'questionBank', questionBankId);
    await setDoc(qRef, {
      result: isCorrect ? 'correct' : 'missed',
      answeredAt: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn("Could not update question bank result:", e);
  }
}

export async function getQuestionBank(userId, maxItems = 500) {
  if (!userId) return [];
  try {
    const qBankRef = collection(db, 'users', userId, 'questionBank');
    const q = query(qBankRef, orderBy('createdAt', 'desc'), limit(maxItems));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching question bank:", error);
    return [];
  }
}

export async function getWordBankQuestions(userId, word) {
  if (!userId || !word) return [];
  try {
    const qBankRef = collection(db, 'users', userId, 'questionBank');
    const q = query(qBankRef, where('word', '==', word.toLowerCase().trim()), limit(15));
    const snapshot = await getDocs(q);
    // Strictly filter out legacy question types (scramble, rewrite, true-false, multiple-choice)
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item && ['flashcard', 'fill-in-the-blank'].includes(item.type));
  } catch (error) {
    console.error("Error fetching word bank questions:", error);
    return [];
  }
}

export async function exportQuestionBankToExcel(userId, format = 'xls') {
  if (!userId) throw new Error("User not logged in");
  const questions = await getQuestionBank(userId, 1000);
  if (!questions || questions.length === 0) {
    throw new Error("No questions recorded in the bank yet. Complete some reviews first!");
  }

  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    // RFC 4180 CSV with UTF-8 BOM
    const headers = ['Date', 'Word', 'Definition', 'Type', 'Domain', 'Question', 'Relates To', 'Memory Trigger', 'Secondary Meaning', 'Options', 'Correct Answer', 'Explanation', 'SRS Interval', 'Result'];
    const rows = questions.map(q => [
      q.createdAtIso ? q.createdAtIso.split('T')[0] : '',
      `"${(q.word || '').replace(/"/g, '""')}"`,
      `"${(q.definition || '').replace(/"/g, '""')}"`,
      `"${(q.type || '').replace(/"/g, '""')}"`,
      `"${(q.domainName || q.domain || '').replace(/"/g, '""')}"`,
      `"${(q.question || '').replace(/"/g, '""')}"`,
      `"${(q.relatesTo || '').replace(/"/g, '""')}"`,
      `"${(q.memoryTrigger || '').replace(/"/g, '""')}"`,
      `"${(q.secondaryMeaning || '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(q.options) ? q.options.join('; ') : '').replace(/"/g, '""')}"`,
      `"${(q.correctAnswer || '').replace(/"/g, '""')}"`,
      `"${(q.explanation || '').replace(/"/g, '""')}"`,
      q.interval || 1,
      q.result || 'unanswered'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocapp_questions_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { count: questions.length, filename: `vocapp_questions_${dateStr}.csv` };
  }

  // Formatted HTML/XML Spreadsheet (.xls)
  const rowsHtml = questions.map((q, idx) => {
    const isAlt = idx % 2 === 1 ? ' class="alt"' : '';
    const dateVal = q.createdAtIso ? q.createdAtIso.split('T')[0] : '';
    const optsStr = Array.isArray(q.options) && q.options.length > 0 ? q.options.join('; ') : '—';
    const resultBadge = q.result === 'correct'
      ? '<span style="color:#16A34A;font-weight:bold;">Correct ✓</span>'
      : q.result === 'missed'
      ? '<span style="color:#DC2626;font-weight:bold;">Missed ✕</span>'
      : '<span style="color:#64748B;">Archived</span>';

    return `<tr${isAlt}>
      <td>${dateVal}</td>
      <td style="font-weight:bold;">${escapeHtml(q.word || '')}</td>
      <td>${escapeHtml(q.definition || '')}</td>
      <td>${escapeHtml(q.type || '')}</td>
      <td>${escapeHtml(q.domainName || q.domain || '')}</td>
      <td>${escapeHtml(q.question || '')}</td>
      <td>${escapeHtml(q.relatesTo || '—')}</td>
      <td>${escapeHtml(q.memoryTrigger || '—')}</td>
      <td>${escapeHtml(q.secondaryMeaning || '—')}</td>
      <td>${escapeHtml(optsStr)}</td>
      <td style="font-weight:600;color:#0F172A;">${escapeHtml(q.correctAnswer || '')}</td>
      <td style="color:#475569;">${escapeHtml(q.explanation || '')}</td>
      <td style="text-align:center;">${q.interval || 1}</td>
      <td>${resultBadge}</td>
    </tr>`;
  }).join('');

  const xlsContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Question Bank</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #0F172A; color: #FFFFFF; font-weight: 700; border: 1px solid #CBD5E1; padding: 10px 14px; text-align: left; }
        td { border: 1px solid #E2E8F0; padding: 8px 12px; vertical-align: top; mso-number-format:"\\@"; }
        .alt { background-color: #F8FAFC; }
      </style>
    </head>
    <body>
      <h2>Vocapp Spaced Repetition Question Bank</h2>
      <p style="color:#64748B;">Exported on ${new Date().toLocaleString()} · Total Questions: ${questions.length}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Word</th>
            <th>Definition</th>
            <th>Question Type</th>
            <th>Domain / Register</th>
            <th>Question Prompt / Sentence</th>
            <th>Relates To</th>
            <th>Memory Trigger</th>
            <th>Secondary Meaning</th>
            <th>Options</th>
            <th>Correct Answer</th>
            <th>Explanation</th>
            <th>SRS Interval</th>
            <th>Review Outcome</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocapp_questions_${dateStr}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { count: questions.length, filename: `vocapp_questions_${dateStr}.xls` };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function recordTodayProgress(userId, kind) {
  if (!userId) return;
  try {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    const snap = await getDoc(statsRef);
    const data = snap.exists() ? snap.data() : {};

    let today = data.today && data.today.date === todayStr ? { ...data.today } : {
      date: todayStr,
      reviewsDone: 0,
      drillsDone: 0,
      wordWritten: false
    };

    if (kind === 'review') {
      today.reviewsDone = (today.reviewsDone || 0) + 1;
    } else if (kind === 'drill') {
      today.drillsDone = (today.drillsDone || 0) + 1;
    } else if (kind === 'word') {
      today.wordWritten = true;
    }

    // Never write lastPracticedDate here: recordDailyActivity owns it, and
    // setting it first would make the streak update skip today.
    await setDoc(statsRef, {
      today,
      activeDates: arrayUnion(todayStr)
    }, { merge: true });
  } catch (error) {
    console.error("Error recording today progress:", error);
  }
}



