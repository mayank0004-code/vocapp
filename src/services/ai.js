import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app);

export const fetchWordBreakdown = async (word, contextSentence = '') => {
  try {
    const fetchBreakdown = httpsCallable(functions, 'fetchWordBreakdown', { timeout: 120000 });
    const result = await fetchBreakdown({ word, contextSentence });
    return result.data;
  } catch (error) {
    console.error("Error calling fetchWordBreakdown:", error);
    throw error;
  }
};

export const evaluateSentence = async (word, sentenceType, sentence, mistakePatterns = '') => {
  try {
    const evaluate = httpsCallable(functions, 'evaluateSentence', { timeout: 120000 });
    const result = await evaluate({ word, sentenceType, sentence, mistakePatterns });
    return result.data;
  } catch (error) {
    console.error("Error calling evaluateSentence:", error);
    throw error;
  }
};

export const evaluateQuizAnswer = async (targetWord, sentence, guess) => {
  try {
    const evaluateQuiz = httpsCallable(functions, 'evaluateQuizAnswer', { timeout: 120000 });
    const result = await evaluateQuiz({ targetWord, sentence, guess });
    return result.data;
  } catch (error) {
    console.error("Error calling evaluateQuizAnswer:", error);
    throw error;
  }
};

export const generateQuizQuestion = async (word, definition) => {
  try {
    const generateQuiz = httpsCallable(functions, 'generateQuizQuestion', { timeout: 120000 });
    const result = await generateQuiz({ word, definition });
    return result.data;
  } catch (error) {
    console.error("Error calling generateQuizQuestion:", error);
    throw error;
  }
};
