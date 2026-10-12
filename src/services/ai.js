import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app);

export const fetchWordBreakdown = async (word, contextSentence = '') => {
  try {
    const fetchBreakdown = httpsCallable(functions, 'fetchWordBreakdown', { timeout: 30000 });
    const result = await fetchBreakdown({ word, contextSentence });
    return result.data;
  } catch (error) {
    console.error("Error calling fetchWordBreakdown:", error);
    throw error;
  }
};

export const evaluateSentence = async (word, sentenceType, sentence, mistakePatterns = '', isRevision = false, diagnosedHabit = '') => {
  try {
    const evaluate = httpsCallable(functions, 'evaluateSentence', { timeout: 45000 });
    const result = await evaluate({ word, sentenceType, sentence, mistakePatterns, isRevision, diagnosedHabit });
    return result.data;
  } catch (error) {
    console.error("Error calling evaluateSentence:", error);
    throw error;
  }
};

export const evaluateQuizAnswer = async (targetWord, sentence, guess, userLevel = 1) => {
  try {
    const evaluateQuiz = httpsCallable(functions, 'evaluateQuizAnswer', { timeout: 30000 });
    const result = await evaluateQuiz({ targetWord, sentence, guess, userLevel });
    return result.data;
  } catch (error) {
    console.error("Error calling evaluateQuizAnswer:", error);
    throw error;
  }
};

export const generateQuizQuestion = async (word, definition, dictionaryWords = [], interval = 1, recentTypes = [], preferredDomain = '', userLevel = 1, activeHabits = []) => {
  try {
    const generateQuiz = httpsCallable(functions, 'generateQuizQuestion', { timeout: 28000 });
    const result = await generateQuiz({ word, definition, dictionaryWords, interval, recentTypes, preferredDomain, userLevel, activeHabits });
    return result.data;
  } catch (error) {
    console.error("Error calling generateQuizQuestion:", error);
    throw error;
  }
};

export const generateCraftExercise = async (pillar, tier, word, definition = '', vaultMistake = null, mistakePatterns = '', dictionaryWords = [], userLevel = 1) => {
  try {
    const fn = httpsCallable(functions, 'generateCraftExercise', { timeout: 28000 });
    const result = await fn({ pillar, tier, word, definition, vaultMistake, mistakePatterns, dictionaryWords, userLevel });
    return result.data;
  } catch (error) {
    console.error("Error calling generateCraftExercise:", error);
    throw error;
  }
};

export const evaluateCraftSubmission = async (pillar, tier, word, challengePrompt, submission, attemptNumber = 1, userLevel = 1) => {
  try {
    const fn = httpsCallable(functions, 'evaluateCraftSubmission', { timeout: 45000 });
    const result = await fn({ pillar, tier, word, challengePrompt, submission, attemptNumber, userLevel });
    return result.data;
  } catch (error) {
    console.error("Error calling evaluateCraftSubmission:", error);
    throw error;
  }
};

