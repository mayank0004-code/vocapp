import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
      createdAt: new Date().getTime()
    });
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
