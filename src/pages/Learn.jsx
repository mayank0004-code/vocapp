import React, { useState } from 'react';
import { fetchWordBreakdown, evaluateSentence } from '../services/ai';
import { checkWordExists, saveLearnedWord } from '../services/db';

import { Volume2, CheckCircle, Loader2 } from '../components/Icons';
export default function Learn({ currentUser }) {
  const [wordInput, setWordInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchMsg, setSearchMsg] = useState(null);
  
  const [wordData, setWordData] = useState(null);
  
  const [step, setStep] = useState(0); 
  const [sentenceInput, setSentenceInput] = useState('');
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [savedSentences, setSavedSentences] = useState({
    factualSentence: '',
    personalSentence: '',
    questionSentence: ''
  });

  const handleSearch = async () => {
    if (!wordInput.trim()) return;
    setLoading(true);
    setWordData(null);
    setStep(0);
    setFeedback(null);
    setSearchMsg(null);
    try {
      const inputWord = wordInput.trim();
      
      const exists = await checkWordExists(currentUser.uid, inputWord);
      if (exists) {
        setSearchMsg({ type: 'error', text: `"${inputWord}" is already in your Dictionary! Head over to the Dictionary tab to review it.` });
        setLoading(false);
        return;
      }

      const data = await fetchWordBreakdown(inputWord, contextInput.trim());
      
      if (!data.isValid) {
        setSearchMsg({ type: 'error', text: `"${inputWord}" doesn't seem to be a valid English word. Please try again.` });
        setLoading(false);
        return;
      }
      
      if (data.word.toLowerCase() !== inputWord.toLowerCase()) {
        const correctedExists = await checkWordExists(currentUser.uid, data.word);
        if (correctedExists) {
          setSearchMsg({ type: 'error', text: `We corrected your spelling to "${data.word}", which is already in your Dictionary!` });
          setLoading(false);
          return;
        }
        setSearchMsg({ type: 'info', text: `Note: We corrected your spelling to "${data.word}".` });
      }

      setWordInput(data.word);
      setWordData({ ...data });
      setStep(1); 
    } catch (error) {
      console.error(error);
      setSearchMsg({ type: 'error', text: "Error: " + (error.message || "Failed to load word breakdown.") });
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!wordData) return;
    const utterance = new SpeechSynthesisUtterance(wordData.word);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSentenceSubmit = async () => {
    if (!sentenceInput.trim()) return;
    
    setGrading(true);
    setFeedback(null);
    
    let currentType = '';
    if (step === 1) currentType = 'Factual';
    if (step === 2) currentType = 'Personal';
    if (step === 3) currentType = 'Question';

    try {
      const evaluation = await evaluateSentence(wordData.word, currentType, sentenceInput.trim());
      
      if (evaluation.isCorrect) {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        setFeedback({ type: 'success', message: evaluation.feedback });
        
        const updatedSentences = { ...savedSentences };
        if (step === 1) updatedSentences.factualSentence = sentenceInput.trim();
        if (step === 2) updatedSentences.personalSentence = sentenceInput.trim();
        if (step === 3) updatedSentences.questionSentence = sentenceInput.trim();
        
        setSavedSentences(updatedSentences);
        setSentenceInput('');
        
        if (step < 3) {
           setTimeout(() => {
             setStep(step + 1);
             setFeedback(null);
           }, 800);
        } else {
           await saveLearnedWord(currentUser.uid, {
             ...wordData,
             ...updatedSentences
           });
           setTimeout(() => {
             setStep(4);
             setFeedback(null);
           }, 800);
        }
      } else {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setFeedback({ type: 'error', message: evaluation.feedback });
      }
    } catch (error) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setFeedback({ type: 'error', message: "Failed to evaluate sentence." });
    } finally {
      setGrading(false);
    }
  };

  const getStepTitle = () => {
    if (step === 1) return "1. Write a Factual Sentence";
    if (step === 2) return "2. Write a Personal Sentence";
    if (step === 3) return "3. Ask a Question";
    return "";
  };

  const getStepPlaceholder = () => {
    if (step === 1) return wordData?.practiceHints?.factual || `Use "${wordData?.word}" to state a fact...`;
    if (step === 2) return wordData?.practiceHints?.personal || `Relate "${wordData?.word}" to your own life...`;
    if (step === 3) return wordData?.practiceHints?.question || `Ask a question containing "${wordData?.word}"...`;
    return "";
  };

  return (
    <div>
      <h1 className="text-title" style={{ marginTop: '16px' }}>Learn</h1>
      <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Discover new words and master them with active recall.
      </p>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 className="text-heading" style={{ marginBottom: '16px' }}>Search a Word</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g., Ubiquitous" 
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSearch} 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Learn"}
            </button>
          </div>
          <input 
            type="text" 
            className="input" 
            style={{ fontSize: '14px' }}
            placeholder="Optional: Paste the sentence where you found this word for better context..." 
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchMsg && (
            <div style={{ 
              color: searchMsg.type === 'error' ? 'var(--error-color)' : 'var(--accent-color)', 
              fontSize: '14px', 
              animation: 'fadeIn 0.2s',
              padding: '8px',
              background: searchMsg.type === 'error' ? 'rgba(255, 59, 48, 0.05)' : 'rgba(0, 113, 227, 0.05)',
              borderRadius: '8px'
            }}>
              {searchMsg.text}
            </div>
          )}
        </div>
      </div>

      {wordData && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', animation: 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 className="text-title" style={{ margin: 0 }}>{wordData.word}</h2>
            </div>
            <button className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%' }} onClick={playAudio}>
              <Volume2 size={20} />
            </button>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Definition</span>
            <p className="text-body">{wordData.definition}</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vibe Check</span>
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{wordData.vibeCheck}</p>
          </div>

          {wordData.contextMeaning && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0, 113, 227, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--accent-color)' }}>Context Meaning</span>
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{wordData.contextMeaning}</p>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Collocations</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {wordData.collocations?.map((col, idx) => (
                <span key={idx} style={{ background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent-color)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: wordData.commonMistakes?.length ? '16px' : 0 }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Example</span>
            <p className="text-body" style={{ fontStyle: 'italic', borderLeft: '3px solid var(--accent-color)', paddingLeft: '12px' }}>"{wordData.example}"</p>
          </div>

          {wordData.commonMistakes && wordData.commonMistakes.length > 0 && (
            <div>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--error-color)' }}>How NOT to use it 🚫</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wordData.commonMistakes.map((mistake, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255, 59, 48, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--error-color)' }}>
                    <p className="text-body" style={{ fontSize: '14px', margin: 0 }}>{mistake}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step > 0 && step < 4 && (
        <div key={step} className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '2px solid var(--accent-color)', animation: 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 className="text-heading">{getStepTitle()}</h2>
            <span className="text-caption" style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Step {step} of 3</span>
          </div>
          
          <textarea 
            className="input" 
            style={{ minHeight: '100px', resize: 'vertical', marginBottom: '12px' }}
            placeholder={getStepPlaceholder()}
            value={sentenceInput}
            onChange={(e) => setSentenceInput(e.target.value)}
          />

          {feedback && (
            <div style={{ 
              padding: '12px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '16px',
              backgroundColor: feedback.type === 'error' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
              color: feedback.type === 'error' ? 'var(--error-color)' : 'var(--success-color)'
            }}>
              <p className="text-body" style={{ fontWeight: 500 }}>{feedback.message}</p>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }} 
            onClick={handleSentenceSubmit}
            disabled={grading || !sentenceInput.trim()}
          >
            {grading ? <Loader2 className="animate-spin" /> : "Submit to AI Tutor"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', backgroundColor: 'rgba(52, 199, 89, 0.05)' }}>
          <CheckCircle size={64} style={{ color: 'var(--success-color)', margin: '0 auto 16px' }} />
          <h2 className="text-heading" style={{ marginBottom: '8px' }}>Word Mastered!</h2>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            "{wordData?.word}" has been added to your dictionary and scheduled for your daily quizzes.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px' }}
            onClick={() => { setWordInput(''); setWordData(null); setStep(0); }}
          >
            Learn Another Word
          </button>
        </div>
      )}

    </div>
  );
}
