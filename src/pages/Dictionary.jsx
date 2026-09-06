import React, { useEffect, useState } from 'react';
import { getAllWords, deleteLearnedWord } from '../services/db';

import { Trash, ChevronDown, ChevronUp, Loader2 } from '../components/Icons';

export default function Dictionary({ currentUser }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchWords() {
      if (!currentUser) return;
      try {
        const fetchedWords = await getAllWords(currentUser.uid);
        fetchedWords.sort((a, b) => a.word.localeCompare(b.word));
        setWords(fetchedWords);
      } catch (error) {
        console.error('Failed to load dictionary', error);
      } finally {
        setLoading(false);
      }
    }
    fetchWords();
  }, [currentUser]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async (wordId) => {
    if (!window.confirm('Are you sure you want to delete this word from your dictionary?')) return;
    try {
      await deleteLearnedWord(currentUser.uid, wordId);
      setWords(words.filter(w => w.id !== wordId));
      setError(null);
    } catch (err) {
      setError("Failed to delete word. Please try again.");
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '24px' }}>
        <h1 className="text-title" style={{ margin: 0 }}>Dictionary</h1>
        <span className="text-caption" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {words.length} words
        </span>
      </div>

      {error && (
        <div style={{ color: 'var(--error-color)', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {words.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            Your dictionary is empty. Start learning some new words!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {words.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                <button 
                  onClick={() => toggleExpand(item.id)}
                  style={{ 
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-family)', color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="text-heading" style={{ fontSize: '19px', textTransform: 'capitalize' }}>
                      {item.word}
                    </span>
                    <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                      Next review: {formatDate(item.nextReviewDate)}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Definition</span>
                      <p className="text-body">{item.definition}</p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Vibe</span>
                      <p className="text-body">{item.vibeCheck}</p>
                    </div>

                    {item.contextMeaning && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em' }}>Context Meaning</span>
                        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{item.contextMeaning}</p>
                      </div>
                    )}

                    {item.commonMistakes && item.commonMistakes.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--error-color)', letterSpacing: '0.05em' }}>How NOT to use it 🚫</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {item.commonMistakes.map((mistake, idx) => (
                            <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255, 59, 48, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--error-color)' }}>
                              <p className="text-body" style={{ fontSize: '14px', margin: 0 }}>{mistake}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Your Sentences</span>
                      <div style={{ background: 'var(--surface-color)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p className="text-body"><span style={{ fontWeight: 600 }}>Factual:</span> {item.factualSentence}</p>
                        <p className="text-body"><span style={{ fontWeight: 600 }}>Personal:</span> {item.personalSentence}</p>
                        <p className="text-body"><span style={{ fontWeight: 600 }}>Question:</span> {item.questionSentence}</p>
                      </div>
                    </div>
                    <button className="btn btn-outline" style={{ marginTop: '8px', color: 'var(--error-color)', borderColor: 'rgba(255,59,48,0.2)', width: '100%' }} onClick={() => handleDelete(item.id)}>
                      <Trash size={16} style={{ marginRight: '6px' }} /> Delete Word
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
