import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { AI_LIST } from '../shared/ai-list';
import { AIIcon } from './AIIcon';

type Stage = 'welcome' | 'name' | 'ais' | 'workspace' | 'finishing';

const OnboardingScreen: React.FC = () => {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [stage, setStage] = useState<Stage>('welcome');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      containerRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Auto-focus input when name stage appears, otherwise focus container for Enter key
  useEffect(() => {
    if (stage === 'name' && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
    if (stage !== 'name' && containerRef.current) {
      const t = setTimeout(() => containerRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const transition = (next: Stage, action?: () => void) => {
    setVisible(false);
    setTimeout(() => {
      setStage(next);
      action?.();
      setTimeout(() => setVisible(true), 50);
    }, 350);
  };

  const goToName = () => transition('name');
  const goToAIs = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    transition('ais');
  };
  const goToWorkspace = () => transition('workspace');
  const goFinishing = () => {
    transition('finishing');
    setTimeout(async () => {
      await completeOnboarding(name.trim());
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (stage === 'welcome') goToName();
      else if (stage === 'name' && name.trim()) goToAIs();
      else if (stage === 'ais') goToWorkspace();
      else if (stage === 'workspace') goFinishing();
    }
  };

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 32px',
    borderRadius: '12px',
    background: enabled ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
    color: enabled ? '#000' : 'rgba(255,255,255,0.2)',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    transition: 'all 0.25s ease',
    boxShadow: enabled ? '0 4px 16px rgba(244, 164, 96, 0.25), 0 1px 3px rgba(0,0,0,0.2)' : 'none',
  });

  const fadeStyle = (show: boolean): React.CSSProperties => ({
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(244, 164, 96, 0.06) 0%, transparent 60%), #0a0a0a',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Subtle animated gradient orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244, 164, 96, 0.04) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: 'onboardingFloat 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.03) 0%, transparent 70%)',
          bottom: '-15%',
          right: '-5%',
          animation: 'onboardingFloat 10s ease-in-out infinite reverse',
        }}
      />

      {/* — Welcome Stage — */}
      {stage === 'welcome' && (
        <div className="flex flex-col items-center gap-8 max-w-md px-8 text-center" style={fadeStyle(visible)}>
          {/* Logo */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <img
              src="./icons/hidden_trimmed.png"
              className="w-10 h-10 object-contain"
              alt="Thred"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(244, 164, 96, 0.3))' }}
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-3">
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Welcome to Thred
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
              Every AI. One workspace.
            </p>
          </div>

          {/* Version badge */}
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
            v1.0.0
          </div>

          {/* Get Started button */}
          <button
            onClick={goToName}
            style={btnStyle(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(244, 164, 96, 0.35), 0 2px 6px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(244, 164, 96, 0.25), 0 1px 3px rgba(0,0,0,0.2)';
            }}
          >
            Get Started
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        </div>
      )}

      {/* — Name Input Stage — */}
      {stage === 'name' && (
        <div className="flex flex-col items-center gap-8 max-w-md px-8 text-center" style={fadeStyle(visible)}>
          {/* Icon */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(244, 164, 96, 0.08)',
              border: '1px solid rgba(244, 164, 96, 0.12)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--accent)' }}>person</span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              What should we call you?
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              This will be used to personalize your experience.
            </p>
          </div>

          {/* Input */}
          <div className="w-full max-w-[300px]">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 500,
                textAlign: 'center',
                outline: 'none',
                transition: 'all 0.2s ease',
                caretColor: 'var(--accent)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244, 164, 96, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Continue */}
          <button
            onClick={goToAIs}
            disabled={!name.trim()}
            style={btnStyle(!!name.trim())}
            onMouseEnter={(e) => { if (name.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Continue
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>

          {/* Hint */}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
            You can change this anytime in Settings.
          </p>
        </div>
      )}

      {/* — AIs Stage — */}
      {stage === 'ais' && (
        <div className="flex flex-col items-center gap-8 max-w-lg px-8 text-center" style={fadeStyle(visible)}>
          {/* Icon */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(244, 164, 96, 0.08)',
              border: '1px solid rgba(244, 164, 96, 0.12)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--accent)' }}>smart_toy</span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Your AI lineup
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Switch between them with <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Alt+1</span> through <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Alt+9</span>, or click the sidebar.
            </p>
          </div>

          {/* AI Grid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[380px]">
            {AI_LIST.map((ai, i) => (
              <div
                key={ai.id}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
                  <AIIcon id={ai.id} className="w-[24px] h-[24px]" style={{ color: ai.color }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{ai.name}</span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'monospace',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Alt+{ai.shortcut}
                </span>
              </div>
            ))}
          </div>

          {/* Continue */}
          <button
            onClick={goToWorkspace}
            style={btnStyle(true)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Continue
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        </div>
      )}

      {/* — Workspace Stage — */}
      {stage === 'workspace' && (
        <div className="flex flex-col items-center gap-8 max-w-lg px-8 text-center" style={fadeStyle(visible)}>
          {/* Icon */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(244, 164, 96, 0.08)',
              border: '1px solid rgba(244, 164, 96, 0.12)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--accent)' }}>dashboard</span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Tools at your fingertips
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Everything you need, right where you need it.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="flex flex-col gap-3 w-full max-w-[380px]">
            {[
              {
                icon: 'widgets',
                title: 'Right Sidebar',
                desc: 'Notes, timers, whiteboard, calculator — one click away',
              },
              {
                icon: 'folder_special',
                title: 'Vault',
                desc: 'Save prompts, responses, code snippets, and screenshots',
              },
              {
                icon: 'keyboard_command_key',
                title: 'Command Palette',
                desc: 'Press Ctrl+K to search anything — AIs, actions, shortcuts',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-4 py-3.5 px-4 rounded-xl text-left"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(244, 164, 96, 0.08)',
                    border: '1px solid rgba(244, 164, 96, 0.12)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent)' }}>{card.icon}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{card.title}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{card.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Continue */}
          <button
            onClick={goFinishing}
            style={btnStyle(true)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Let's go
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        </div>
      )}

      {/* — Finishing Stage — */}
      {stage === 'finishing' && (
        <div
          className="flex flex-col items-center gap-6 max-w-md px-8 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Checkmark */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10B981' }}>check</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Welcome, {name.trim()}!
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Setting up your workspace...
            </p>
          </div>

          {/* Loading spinner */}
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255,255,255,0.08)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'onboardingSpin 0.7s linear infinite',
            }}
          />
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes onboardingFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -20px); }
        }
        @keyframes onboardingSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OnboardingScreen;
