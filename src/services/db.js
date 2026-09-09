import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc, increment, addDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
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
    return snapshot.exists() ? snapshot.data() : { notificationsEnabled: false, timingMode: 'smart', customTime: '18:00' };
  } catch (error) {
    console.error("Error getting user settings:", error);
    return { notificationsEnabled: false, timingMode: 'smart', customTime: '18:00' };
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
    const now = new Date().getTime();
    const vocabRef = collection(db, 'users', userId, 'vocabulary');
    const q = query(vocabRef, where('nextReviewDate', '<=', now));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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


export async function getAllWords(userId) {
  try {
    const vocabRef = collection(db, 'users', userId, 'vocabulary');
    const querySnapshot = await getDocs(vocabRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching all words:", error);
    throw error;
  }
}

export async function updateWordSRS(userId, wordId, isCorrect, currentInterval) {
  try {
    const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
    
    let newInterval = 1;
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


export async function getUserMistakePatterns(userId) {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'mistakes');
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) return "";
    
    const counts = snapshot.data();
    // Sort tags by frequency (descending)
    const sortedTags = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3) // Top 3
      .map(([tag]) => tag);
      
    if (sortedTags.length === 0) return "";
    
    return `The user historically struggles with: ${sortedTags.join(", ")}.`;
  } catch (error) {
    console.error("Error fetching mistake patterns:", error);
    return "";
  }
}

export async function savePracticeResult(userId, isCorrect, errorTags, mistakeData = null) {
  try {
    const statsRef = doc(db, 'users', userId, 'profile', 'stats');
    
    const now = new Date();
    const currentHour = now.getHours().toString();
    const todayLocal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    // First, handle the stats (streak & counts & behavior tracking)
    const updatePayload = {
      totalPracticed: increment(1),
      lastPracticedDate: todayLocal,
      [`activityHours.${currentHour}`]: increment(1)
    };
    
    if (isCorrect && (!errorTags || errorTags.length === 0)) {
      updatePayload.currentStreak = increment(1);
    } else {
      updatePayload.currentStreak = 0;
      updatePayload.totalErrors = increment(1);
    }

    await setDoc(statsRef, updatePayload, { merge: true });

    // Handle high score logic separately since increment() can't do Math.max natively easily without a read,
    // but for simplicity we'll just read it once.
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      if ((data.currentStreak || 0) > (data.highestStreak || 0)) {
        await setDoc(statsRef, { highestStreak: data.currentStreak }, { merge: true });
      }
    }

    // Now, handle logging the exact mistake to the Mistake Vault
    if (mistakeData && errorTags && errorTags.length > 0) {
      const mistakesRef = collection(db, 'users', userId, 'mistakes');
      await addDoc(mistakesRef, {
        word: mistakeData.word,
        originalSentence: mistakeData.originalSentence,
        reframedSentence: mistakeData.reframedSentence || '',
        errorTags: errorTags,
        timestamp: new Date().getTime()
      });
      
      // Also increment the tags atomically in the profile for the Donut chart
      const tagsRef = doc(db, 'users', userId, 'profile', 'mistakes');
      const tagUpdate = {};
      errorTags.forEach(t => {
        tagUpdate[t] = increment(1);
      });
      await setDoc(tagsRef, tagUpdate, { merge: true });
    }
    
  } catch (error) {
    console.error("Error saving practice result:", error);
  }
}

export async function getMistakeVault(userId) {
  try {
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const q = query(mistakesRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Error listening to mistake vault:", error);
  });
}

export function listenToUserStats(userId, callback) {
  const statsRef = doc(db, 'users', userId, 'profile', 'stats');
  return onSnapshot(statsRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({ currentStreak: 0, highestStreak: 0, totalPracticed: 0, totalErrors: 0 });
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
