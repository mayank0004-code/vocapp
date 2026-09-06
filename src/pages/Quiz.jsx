import React, { useEffect, useState } from 'react';
import { getDueWords, updateWordSRS } from '../services/db';
import { evaluateQuizAnswer, generateQuizQuestion } from '../services/ai';

import { CheckCircle, XCircle, Loader2 } from '../components/Icons';

export default function Quiz({ currentUser }) {
  const [dueWords, setDueWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  
  const [guess, setGuess] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function fetchWords() {
      if (!currentUser) return;
      try {
        const words = await getDueWords(currentUser.uid);
        const shuffled = words.sort(() => 0.5 - Math.random());
        setDueWords(shuffled);
      } catch (error) {
        console.error('Failed to load due words', error);
      } finally {
        setLoading(false);
      }
    }
    fetchWords();
  }, [currentUser]);

  const currentWord = dueWords[currentIndex];

  useEffect(() => {
    if (currentWord) {
      loadQuestion(currentWord);
    }
  }, [currentIndex, currentWord]);

  const loadQuestion = async (wordObj) => {
    setQuestionLoading(true);
    setGuess('');
    setFeedback(null);
    try {
      const q = await generateQuizQuestion(wordObj.word, wordObj.definition);
      setCurrentQuestion(q);
    } catch (error) {
      console.error(error);
      // Fallback question if AI fails
      setCurrentQuestion({
        type: 'fill-in-the-blank',
        question: wordObj.personalSentence ? wordObj.personalSentence.replace(new RegExp(wordObj.word, 'gi'), '________') : `This is a fallback sentence for ________.`,
        correctAnswer: wordObj.word,
        explanation: 'Fallback question loaded.'
      });
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleGuessSubmit = async (submittedGuess) => {
    const finalGuess = submittedGuess ?? guess;
    if (!finalGuess.trim() || !currentWord || !currentQuestion) return;
    setEvaluating(true);
    setFeedback(null);

    try {
      let isCorrect = false;
      let message = currentQuestion.explanation;

      if (currentQuestion.type === 'fill-in-the-blank') {
        const evaluation = await evaluateQuizAnswer(
          currentWord.word, 
          currentQuestion.question, 
          finalGuess.trim()
        );
        isCorrect = evaluation.isCorrect;
        message = evaluation.feedback + " - " + message;
      } else {
        isCorrect = finalGuess.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
        message = isCorrect ? "Correct! " + message : "Incorrect. The correct answer was: " + currentQuestion.correctAnswer + ". " + message;
      }
      
      if (isCorrect) {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
      } else {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }

      setFeedback({ isCorrect, message });
      await updateWordSRS(currentUser.uid, currentWord.id, isCorrect, currentWord.interval);
      
      if (isCorrect) {
        setTimeout(() => {
          handleNext();
        }, 2000);
      }
    } catch (error) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setFeedback({ isCorrect: false, message: "Failed to evaluate answer. Please try again." });
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  if (dueWords.length === 0 || currentIndex >= dueWords.length) {
    return (
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <CheckCircle size={64} style={{ color: 'var(--success-color)', margin: '0 auto 16px' }} />
        <h1 className="text-title">All Caught Up!</h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
          You have reviewed all your scheduled words for today.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '24px' }}>
        <h1 className="text-title" style={{ margin: 0 }}>Daily Quiz</h1>
        <span className="text-caption" style={{ fontWeight: 600, color: 'var(--accent-color)', backgroundColor: 'rgba(0,113,227,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
          {currentIndex + 1} / {dueWords.length}
        </span>
      </div>
      
      <div className="glass-panel" style={{ padding: '32px' }}>
        {questionLoading || !currentQuestion ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Generating a fresh challenge for you...</p>
          </div>
        ) : (
          <>
            <p className="text-subheading" style={{ marginBottom: '24px', fontStyle: 'italic', lineHeight: 1.6 }}>
              {currentQuestion.question}
            </p>

            {currentQuestion.type === 'multiple-choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {currentQuestion.options?.map((opt, idx) => (
                  <button 
                    key={idx} 
                    className="btn btn-outline" 
                    style={{ textAlign: 'left', width: '100%', justifyContent: 'flex-start' }}
                    disabled={evaluating || feedback?.isCorrect}
                    onClick={() => {
                      setGuess(opt);
                      handleGuessSubmit(opt);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'true-false' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  disabled={evaluating || feedback?.isCorrect}
                  onClick={() => {
                    setGuess("true");
                    handleGuessSubmit("true");
                  }}
                >
                  True
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  disabled={evaluating || feedback?.isCorrect}
                  onClick={() => {
                    setGuess("false");
                    handleGuessSubmit("false");
                  }}
                >
                  False
                </button>
              </div>
            )}

            {currentQuestion.type === 'fill-in-the-blank' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Fill in the blank..." 
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={feedback?.isCorrect}
                  onKeyDown={(e) => e.key === 'Enter' && !feedback?.isCorrect && handleGuessSubmit(guess)}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleGuessSubmit(guess)} 
                  disabled={evaluating || !guess.trim() || feedback?.isCorrect}
                >
                  {evaluating ? <Loader2 className="animate-spin" /> : "Check"}
                </button>
              </div>
            )}

            {feedback && (
              <div style={{ 
                padding: '16px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: feedback.isCorrect ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: feedback.isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                  <div style={{ marginTop: '2px' }}>
                    {feedback.isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </div>
                  <span className="text-body" style={{ fontWeight: 500, lineHeight: 1.5 }}>{feedback.message}</span>
                </div>
                
                {!feedback.isCorrect && (
                  <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px', alignSelf: 'center', marginLeft: '12px', flexShrink: 0 }} onClick={handleNext}>
                    Next Word
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
