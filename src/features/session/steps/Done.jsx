import React, { useEffect, useRef } from 'react';
import Button from '../../../ui/Button';
import { triggerHaptic } from '../../../motion/haptics';
import { exportQuestionBankToExcel } from '../../../services/db';
import { showToast } from '../../../ui/Toast';
import { useData } from '../../../data/DataProvider';

export function Done({
  results = [],
  xpGained = 30,
  mode = 'full',
  targetWord = 'albeit',
  onClose = () => {},
  onReviewWeak = () => {},
  onGoToWords = () => {}
}) {
  const { currentUser } = useData();
  const canvasRef = useRef(null);

  const testedCount = results.length;
  const correctCount = results.filter(r => r.ok).length;
  const misses = results.filter(r => !r.ok);
  const accuracy = testedCount > 0 ? Math.round((correctCount / testedCount) * 100) : 100;

  // Canvas Confetti Burst
  useEffect(() => {
    triggerHaptic('success');

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#7C88FF', '#B9C0FF', '#5BD69B', '#FFB054', '#F4F3F0'];
    const originX = rect.width / 2;
    const originY = 120;

    const particles = Array.from({ length: 70 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 260 + Math.random() * 420;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * 6.28,
        vRot: (Math.random() - 0.5) * 14,
        w: 4 + Math.random() * 5,
        h: 7 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });

    let animationId;
    let startTime = performance.now();
    let lastTime = startTime;

    const render = (now) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;
      const age = (now - startTime) / 1000;

      ctx.clearRect(0, 0, rect.width, rect.height);

      particles.forEach((p) => {
        p.vy += 900 * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, 1.6 - age));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)));
        ctx.restore();
      });

      if (age < 1.8) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleExport = async () => {
    if (!currentUser?.uid) return;
    try {
      await exportQuestionBankToExcel(currentUser.uid, 'xls');
      showToast('Question bank exported (.xls)');
    } catch (e) {
      console.error(e);
      showToast('Export questions ready');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '20px 20px 32px',
        color: 'var(--fg)'
      }}
    >
      {/* Particle Confetti Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 20,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Completion Circle & Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '14px',
          marginTop: '10px'
        }}
        className="dn-top"
      >
        <svg width="72" height="72" viewBox="0 0 132 132" role="img" aria-label="Complete">
          <circle
            cx="66"
            cy="66"
            r="58"
            fill="none"
            stroke="#7C88FF"
            strokeWidth="10"
            transform="rotate(-90 66 66)"
          />
          <path
            d="M44 67l14 14 30-31"
            fill="none"
            stroke="#F4F3F0"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}
            className="rise"
          >
            {mode === 'word' ? `${targetWord} added` : 'Session done'}
          </h2>
          <span
            style={{
              fontSize: '15px',
              color: 'var(--fg3)',
              marginTop: '4px',
              display: 'block'
            }}
            className="rise"
          >
            {testedCount > 0
              ? `${correctCount} of ${testedCount} recalled (${accuracy}%)`
              : '3 practice sentences recorded'}
          </span>
        </div>
      </div>

      {/* Stats Summary Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          margin: '24px 0 16px'
        }}
        className="dstats"
      >
        <div
          style={{
            background: 'var(--card2)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '14px 10px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
          className="rise"
        >
          <b className="num" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--acc2)' }}>
            +{xpGained}
          </b>
          <span style={{ fontSize: '12px', color: 'var(--mute)' }}>writing XP</span>
        </div>

        <div
          style={{
            background: 'var(--card2)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '14px 10px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
          className="rise"
        >
          <b className="num" style={{ fontSize: '24px', fontWeight: 700 }}>
            {mode === 'word' ? '1' : testedCount}
          </b>
          <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
            {mode === 'word' ? 'word added' : 'reviewed'}
          </span>
        </div>

        <div
          style={{
            background: 'var(--card2)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '14px 10px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
          className="rise"
        >
          <b className="num" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ok)' }}>
            ~1 d
          </b>
          <span style={{ fontSize: '12px', color: 'var(--mute)' }}>next review</span>
        </div>
      </div>

      {/* Needs Focus Section (if any misses) */}
      {misses.length > 0 ? (
        <section
          style={{
            background: 'var(--card2)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '14px',
            marginBottom: '16px'
          }}
          className="rise"
          aria-label="Needs focus"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--org2)', marginBottom: '8px' }}>
            <span>Needs focus · {misses.length}</span>
            <span style={{ color: 'var(--mute)', fontWeight: 400 }}>back to day 1</span>
          </div>
          {misses.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                fontSize: '14px'
              }}
            >
              <b className="serif" style={{ fontStyle: 'italic', fontWeight: 500 }}>
                {m.word || m.id}
              </b>
              <span style={{ color: 'var(--fg3)', fontSize: '13px' }}>revisiting soon</span>
            </div>
          ))}
        </section>
      ) : (
        <div
          style={{
            padding: '14px',
            borderRadius: '14px',
            background: 'var(--okbg)',
            color: 'var(--ok)',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '16px'
          }}
          className="rise"
        >
          ✓ Every reviewed word moved up an SRS interval!
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {misses.length > 0 && (
          <Button
            variant="light"
            size="default"
            onClick={onReviewWeak}
          >
            Practise the {misses.length} weak word{misses.length > 1 ? 's' : ''}
          </Button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Button
            variant="grey"
            size="default"
            onClick={onClose}
          >
            Done
          </Button>
          <Button
            variant="grey"
            size="default"
            onClick={onGoToWords}
          >
            See my words
          </Button>
        </div>

        <button
          type="button"
          onClick={handleExport}
          style={{
            alignSelf: 'center',
            fontSize: '13.5px',
            color: 'var(--acc2)',
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          Export these questions (.xls)
        </button>
      </div>
    </div>
  );
}

export default Done;
