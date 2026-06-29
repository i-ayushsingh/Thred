import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { useT } from '../../i18n/context';
import { useDraggable } from '../../utils/shared-hooks';
import { useConfirm } from '../ConfirmDialog';
interface FocusRecord {
  id: string;
  taskName: string;
  project?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  duration: number; // planned minutes
  focusTime: number; // actual minutes
  breakTime: number; // minutes
  completed: boolean;
  notes?: string;
  timestamp: number; // ms
}

type Step = 'first-time' | 'setup' | 'focus' | 'break' | 'summary';
type Tab = 'timer' | 'stats';

export const PomodoroTool: React.FC = () => {
  const {  toolWindows,
    closeToolWindow,
    addVaultItem  } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, closeToolWindow: state.closeToolWindow, addVaultItem: state.addVaultItem})));
  const { confirm } = useConfirm();

  const tw = toolWindows.find(t => t.id === 'pomodoro');
  const isOpen = !!tw && !tw.minimized;
  const t = useT();

  // Position & Size state persisted in localStorage
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('thred_pomodoro_pos');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return { x: window.innerWidth - 360, y: 150 };
  });

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('thred_pomodoro_size');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return { width: 320, height: 490 };
  });

  // Save layout settings on changes
  useEffect(() => {
    localStorage.setItem('thred_pomodoro_pos', JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    localStorage.setItem('thred_pomodoro_size', JSON.stringify(size));
  }, [size]);

  // Window drag/resize states
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Tab: timer or statistics
  const [activeTab, setActiveTab] = useState<Tab>('timer');

  // Compact mode for focus session
  const [compactMode, setCompactMode] = useState(false);

  // Focus Steps
  const [step, setStep] = useState<Step>(() => {
    const everStarted = localStorage.getItem('thred_focus_ever_started');
    return everStarted ? 'setup' : 'first-time';
  });

  // Form states
  const [focusMode, setFocusMode] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [duration, setDuration] = useState(25); // planned minutes
  const [customMinutesInput, setCustomMinutesInput] = useState('');

  // Active Timer state
  const [timeLeft, setTimeLeft] = useState(0); // remaining seconds
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0); // initial target seconds

  // Break states
  const [breakLeft, setBreakLeft] = useState(0);
  const [breakTotal, setBreakTotal] = useState(0);
  const [isBreakRunning, setIsBreakRunning] = useState(false);
  const [breakSelected, setBreakSelected] = useState(false);

  // Summary note fields
  const [notesCompleted, setNotesCompleted] = useState('');
  const [notesProgress, setNotesProgress] = useState('');
  const [notesNextSteps, setNotesNextSteps] = useState('');
  const [saveToVaultCheck, setSaveToVaultCheck] = useState(true);

  // Streak & History Stats State loaded from localStorage
  const [records, setRecords] = useState<FocusRecord[]>(() => {
    try {
      const saved = localStorage.getItem('thred_focus_records');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  // Save history to localStorage
  const saveRecords = (newRecords: FocusRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('thred_focus_records', JSON.stringify(newRecords));
  };

  // Draggable logic
  const { handleMouseDown } = useDraggable({
    position: pos,
    setPosition: setPos,
    bounds: { left: -size.width + 50, right: window.innerWidth - 50, top: 0, bottom: window.innerHeight - 50 }
  });

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(300, Math.min(600, e.clientX - pos.x));
        const newHeight = Math.max(420, Math.min(650, e.clientY - pos.y));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, pos, size]);

  // Main Timer ticks effect — anchored to wall-clock end time to avoid drift.
  // Refs hold the latest completion handlers so the tick effect doesn't need them
  // as deps (they are defined later and would otherwise be stale closures).
  const focusCompleteRef = useRef<() => void>(() => { /* no-op */ });
  const breakCompleteRef = useRef<() => void>(() => { /* no-op */ });

  useEffect(() => {
    if (step !== 'focus' || !isRunning) return;
    if (timeLeft <= 0) {
      setIsRunning(false);
      focusCompleteRef.current();
      return;
    }
    // Anchor the end instant from the remaining time captured when (re)started.
    const endAt = Date.now() + timeLeft * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsRunning(false);
        focusCompleteRef.current();
      }
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
    // Intentionally NOT depending on timeLeft: the anchor is set once per run/resume.
  }, [step, isRunning]);

  // Break Timer ticks effect — same anchor-epoch pattern.
  useEffect(() => {
    if (step !== 'break' || !isBreakRunning) return;
    if (breakLeft <= 0) {
      setIsBreakRunning(false);
      breakCompleteRef.current();
      return;
    }
    const endAt = Date.now() + breakLeft * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setBreakLeft(remaining);
      if (remaining <= 0) {
        setIsBreakRunning(false);
        breakCompleteRef.current();
      }
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [step, isBreakRunning]);

  // Start focus session
  const startSession = (plannedMinutes: number) => {
    const task = taskName.trim() || 'General Work';
    setDuration(plannedMinutes);
    setTimeLeft(plannedMinutes * 60);
    setTotalSeconds(plannedMinutes * 60);
    setIsRunning(true);
    setStep('focus');
    setActiveTab('timer');

    localStorage.setItem('thred_focus_ever_started', 'true');


  };

  // End active focus session early
  const endSessionEarly = async () => {
    const ok = await confirm({
      title: 'End Focus Session?',
      message: 'Are you sure you want to end this focus session early? Your progress will be saved.',
      confirmLabel: 'End Session',
      cancelLabel: 'Keep Going',
      variant: 'warning'});
    if (!ok) return;
    setIsRunning(false);

    // Save partial record
    const minutesFocused = Math.round((totalSeconds - timeLeft) / 60);
    const newRecord: FocusRecord = {
      id: 'focus-' + Math.random().toString(36).substring(7),
      taskName: taskName.trim() || 'General Work',
      project: project.trim() || undefined,
      category: category.trim() || undefined,
      priority: priority,
      duration: duration,
      focusTime: minutesFocused,
      breakTime: 0,
      completed: false,
      timestamp: Date.now()
    };
    saveRecords([newRecord, ...records]);



    setNotesCompleted('');
    setNotesProgress(`Interrupted early at ${minutesFocused} minutes.`);
    setNotesNextSteps('');
    setBreakSelected(false);
    setStep('summary');
  };

  // Focus session completes naturally
  const handleFocusSessionComplete = () => {
    undefined;



    // Check for goal achievement (e.g. 4 focus sessions completed today)
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const sessionsToday = records.filter(r => r.timestamp >= todayStart && r.completed).length + 1;
    if (sessionsToday === 4) {
      undefined;

    }

    setStep('break');
    setBreakSelected(false);
    setIsBreakRunning(false);
    setBreakLeft(0);
    setBreakTotal(0);
  };

  // Start the break timer
  const startBreak = (minutes: number) => {
    setBreakTotal(minutes * 60);
    setBreakLeft(minutes * 60);
    setBreakSelected(true);
    setIsBreakRunning(true);


  };

  // Skip or finish break
  const skipBreak = () => {
    setIsBreakRunning(false);
    setBreakSelected(false);

    // Add completed focus record
    const actualBreakSecs = breakTotal > 0 ? (breakTotal - breakLeft) : 0;
    const newRecord: FocusRecord = {
      id: 'focus-' + Math.random().toString(36).substring(7),
      taskName: taskName.trim() || 'General Work',
      project: project.trim() || undefined,
      category: category.trim() || undefined,
      priority: priority,
      duration: duration,
      focusTime: duration,
      breakTime: Math.round(actualBreakSecs / 60),
      completed: true,
      timestamp: Date.now()
    };
    saveRecords([newRecord, ...records]);

    setNotesCompleted('Completed the planned focus session.');
    setNotesProgress('');
    setNotesNextSteps('');
    setStep('summary');
  };

  const handleBreakComplete = () => {
    undefined;


    const newRecord: FocusRecord = {
      id: 'focus-' + Math.random().toString(36).substring(7),
      taskName: taskName.trim() || 'General Work',
      project: project.trim() || undefined,
      category: category.trim() || undefined,
      priority: priority,
      duration: duration,
      focusTime: duration,
      breakTime: Math.round(breakTotal / 60),
      completed: true,
      timestamp: Date.now()
    };
    saveRecords([newRecord, ...records]);

    setNotesCompleted('Completed the planned focus session.');
    setNotesProgress('');
    setNotesNextSteps('');
    setStep('summary');
  };

  // Keep the timer-effect refs pointing at the latest handler closures.
  focusCompleteRef.current = handleFocusSessionComplete;
  breakCompleteRef.current = handleBreakComplete;

  // Save notes to vault note
  const handleSaveSummary = async () => {
    const actualFocus = step === 'summary' ? (records[0]?.focusTime || duration) : duration;
    const actualBreak = step === 'summary' ? (records[0]?.breakTime || 0) : 0;
    const isCompleted = step === 'summary' ? (records[0]?.completed || false) : true;

    if (saveToVaultCheck) {
      const formattedText = `### Focus Session Summary
- **Task:** ${taskName.trim() || 'General Work'}
- **Project:** ${project.trim() || 'None'}
- **Category:** ${category.trim() || 'General'}
- **Priority:** ${priority.toUpperCase()}
- **Focus Time:** ${actualFocus} Minutes
- **Break Time:** ${actualBreak} Minutes
- **Completed:** ${isCompleted ? 'Yes' : 'No'}
- **Notes & Achievements:**
  - Completed: ${notesCompleted || 'No notes added'}
  - Progress Made: ${notesProgress || 'No notes added'}
  - Next Steps: ${notesNextSteps || 'No notes added'}

*Focus notes saved automatically from Focus Sessions.*`;

      const vaultItem = {
        id: 'focus-notes-' + Math.random().toString(36).substring(7),
        kind: 'note' as const,
        category: 'Notebooks',
        notebookSubtab: 'focus' as const,
        title: `Focus Summary: ${taskName.trim() || 'General Work'}`,
        fullText: formattedText,
        desc: notesCompleted ? notesCompleted.slice(0, 100) : `Focus session completed in ${actualFocus} mins.`,
        icon: 'hourglass_empty',
        color: '#F4A460',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isPinned: false};

      try {
        await addVaultItem(vaultItem);
        undefined;
      } catch {
        undefined;
      }
    }

    setBreakSelected(false);
    setStep('setup');
    setTaskName('');
    setProject('');
    setCategory('');
    setPriority('medium');
  };

  // Stats derivations
  const stats = useMemo(() => {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000; // 7 days including today

    const todayRecords = records.filter(r => r.timestamp >= todayStart);
    const weekRecords = records.filter(r => r.timestamp >= weekStart);

    // Streaks calculation (Consecutive focus days)
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayHasSession = records.some(r => r.timestamp >= dayStart && r.timestamp < dayEnd && r.completed);

      if (dayHasSession) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If checkDate is today and has no sessions, check if yesterday had one to preserve current streak
        if (checkDate.getTime() === new Date().setHours(0, 0, 0, 0)) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStart = checkDate.getTime();
          const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;
          const yesterdayHasSession = records.some(r => r.timestamp >= yesterdayStart && r.timestamp < yesterdayEnd && r.completed);
          if (yesterdayHasSession) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    // Weekly consistency: count of days in the last 7 days (including today) that have at least one session, divided by 7
    let daysWithSessionsInLastWeek = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (let i = 0; i < 7; i++) {
      const dStart = todayStart - i * oneDayMs;
      const dEnd = dStart + oneDayMs;
      const hasSession = records.some(r => r.timestamp >= dStart && r.timestamp < dEnd && r.completed);
      if (hasSession) {
        daysWithSessionsInLastWeek++;
      }
    }
    const weeklyConsistency = Math.round((daysWithSessionsInLastWeek / 7) * 100);

    // Most active day calculation
    const dayCounts: Record<string, number> = {};
    records.forEach(r => {
      if (!r.completed) return;
      const dayStr = new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[dayStr] = (dayCounts[dayStr] || 0) + r.focusTime;
    });
    let mostActiveDay = '—';
    let maxMins = 0;
    Object.entries(dayCounts).forEach(([day, mins]) => {
      if (mins > maxMins) {
        maxMins = mins;
        mostActiveDay = day;
      }
    });

    return {
      todaySessions: todayRecords.filter(r => r.completed).length,
      todayFocusMins: todayRecords.reduce((acc, r) => acc + r.focusTime, 0),
      todayBreakMins: todayRecords.reduce((acc, r) => acc + r.breakTime, 0),

      weekSessions: weekRecords.filter(r => r.completed).length,
      weekFocusHours: Math.round((weekRecords.reduce((acc, r) => acc + r.focusTime, 0) / 60) * 10) / 10,
      weekAvgMins: weekRecords.filter(r => r.completed).length > 0
        ? Math.round(weekRecords.filter(r => r.completed).reduce((acc, r) => acc + r.focusTime, 0) / weekRecords.filter(r => r.completed).length)
        : 0,

      allTimeSessions: records.filter(r => r.completed).length,
      allTimeFocusHours: Math.round((records.reduce((acc, r) => acc + r.focusTime, 0) / 60) * 10) / 10,
      mostActiveDay,
      streak,
      weeklyConsistency
    };
  }, [records]);

  // Keyboard Shortcuts Bindings (only when floating window is active)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if typing in form inputs (except specific Enter/S commands)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);

      if (e.key === 'Escape') {
        e.preventDefault();
        closeToolWindow('pomodoro'); // Minimize
      }

      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        if (step === 'focus') {
          setIsRunning(prev => !prev);
        } else if (step === 'break' && breakSelected) {
          setIsBreakRunning(prev => !prev);
        }
      }

      if (e.key === 'Enter' && step === 'setup') {
        // Start focus
        e.preventDefault();
        startSession(duration);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's' && step === 'summary') {
        e.preventDefault();
        handleSaveSummary();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, duration, taskName, project, category, priority, saveToVaultCheck, notesCompleted, notesProgress, notesNextSteps, records, breakSelected]);

  if (!isOpen) return null;

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Planned values for SVG calculation
  const progressRatio = step === 'focus'
    ? (totalSeconds > 0 ? timeLeft / totalSeconds : 0)
    : (breakTotal > 0 ? breakLeft / breakTotal : 0);

  const strokeDashoffset = 2 * Math.PI * 62 * (1 - progressRatio);

  const container = document.getElementById('main-view-container') || document.body;

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const completedTodayCount = records.filter(r => r.timestamp >= todayStart && r.completed).length;

  return createPortal(
    <div
      ref={windowRef}
      className="fixed z-[300] flex flex-col bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.8)] animate-pop-center"
      style={{
        left: pos.x,
        top: pos.y,
        width: step === 'focus' && compactMode ? 240 : size.width,
        height: step === 'focus' && compactMode ? 300 : size.height}}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Drag Handle - Hidden in compact mode */}
      {!(step === 'focus' && compactMode) && (
      <div className="drag-handle flex items-center justify-between px-3.5 py-3 border-b border-white/5 cursor-move shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">hourglass_top</span>
          <span className="text-[12.5px] font-bold text-white/90">{t('tools.pomodoro.title')}</span>
          {step === 'focus' && isRunning && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => closeToolWindow('pomodoro')}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title={t('tools.pomodoro.minimize')}
          >
            <span className="material-symbols-outlined text-[15px]">remove</span>
          </button>
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 custom-scrollbar select-none">

        {/* Compact Mode - Show only timer when focus session is active */}
        {step === 'focus' && compactMode && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {/* Timer Display */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-white/[0.04]"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-[var(--accent)] transition-all duration-1000 ease-linear"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-[32px] font-bold text-white font-mono leading-none tracking-tight">{formatTime(timeLeft)}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-1.5">{isRunning ? 'Focusing' : 'Paused'}</span>
              </div>
            </div>

            {/* Keyboard Shortcuts Guide */}
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <kbd className="bg-white/5 px-2 py-1 rounded-lg text-white/60 text-[9px] font-mono border border-white/10">Space</kbd>
                <span className="text-white/40 text-[10px]">to Pause/Resume</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <kbd className="bg-white/5 px-2 py-1 rounded-lg text-white/60 text-[9px] font-mono border border-white/10">Esc</kbd>
                <span className="text-white/40 text-[10px]">to Minimize</span>
              </div>
            </div>
          </div>
        )}

        {/* Normal Mode - Full UI */}
        {!(step === 'focus' && compactMode) && (
        <>
        {activeTab === 'timer' ? (
          <>
            {/* ================= STEP 1: FIRST TIME USER EXPERIENCE ================= */}
            {step === 'first-time' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-[var(--accent)] animate-pulse">explore</span>
                </div>
                <div className="space-y-1.5 max-w-[240px]">
                  <h3 className="text-white font-bold text-[14.5px]">{t('tools.pomodoro.focusSessions')}</h3>
                  <p className="text-white/50 text-[11px] leading-relaxed">
                    {t('tools.pomodoro.focusDesc')}
                  </p>
                  <p className="text-white/40 text-[11px] leading-relaxed">
                    {t('tools.pomodoro.focusDesc2')}
                  </p>
                  <p className="text-white/20 text-[10px] leading-relaxed pt-1.5">
                    {t('tools.pomodoro.focusDesc3')}
                  </p>
                </div>
                <button
                  onClick={() => setStep('setup')}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black text-[12px] font-bold transition-all cursor-pointer shadow-md shadow-[var(--accent)]/5 mt-2"
                >
                  {t('tools.pomodoro.startFocusSession')}
                </button>
              </div>
            )}

            {/* ================= STEP 2: SESSION SETUP ================= */}
            {step === 'setup' && (
              <div className="flex-grow space-y-4">
                {/* Quick Start (No Setup Required) */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">{t('tools.pomodoro.quickStart')}</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        setTaskName('Quick Focus');
                        setProject('');
                        setCategory('');
                        setPriority('medium');
                        startSession(25);
                      }}
                      className="no-drag py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-white transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-[10px] font-bold text-white/80">{t('tools.pomodoro.quickFocus')}</span>
                      <span className="text-[9px] text-[var(--accent)] font-semibold">25 Min</span>
                    </button>
                    <button
                      onClick={() => {
                        setTaskName('Deep Work');
                        setProject('');
                        setCategory('');
                        setPriority('high');
                        startSession(50);
                      }}
                      className="no-drag py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-white transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-[10px] font-bold text-white/80">{t('tools.pomodoro.deepWork')}</span>
                      <span className="text-[9px] text-[var(--accent)] font-semibold">50 Min</span>
                    </button>
                    <button
                      onClick={() => {
                        setTaskName('Extended Focus');
                        setProject('');
                        setCategory('');
                        setPriority('high');
                        startSession(90);
                      }}
                      className="no-drag py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-white transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-[10px] font-bold text-white/80">{t('tools.pomodoro.extendedWork')}</span>
                      <span className="text-[9px] text-[var(--accent)] font-semibold">90 Min</span>
                    </button>
                  </div>
                </div>

                <div className="w-full h-px bg-white/5 my-1" />

                {/* Custom Focus Setup */}
                <div className="space-y-3.5">
                  {/* Ask prompt */}
                  <div className="space-y-1 text-left">
                    <h3 className="text-white/80 font-bold text-[12px] uppercase tracking-wider">{t('tools.pomodoro.whatFocusOn')}</h3>
                    <input
                      value={taskName}
                      onChange={e => setTaskName(e.target.value)}
                      placeholder={t('tools.pomodoro.focusPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/40 transition-colors mt-1"
                    />

                    {/* Suggested Tasks */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {[
                        'Build Landing Page',
                        'Fix Authentication Bug',
                        'Learn React',
                        'Write Documentation'
                      ].map(sugg => (
                        <button
                          key={sugg}
                          type="button"
                          onClick={() => setTaskName(sugg)}
                          className={`no-drag text-[9px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${taskName === sugg ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] font-medium' : 'bg-white/[0.02] border-white/[0.06] text-white/45 hover:text-white/70 hover:bg-white/[0.05]'}`}
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional parameters */}
                  <div className="grid grid-cols-2 gap-2 bg-white/[0.01] p-2.5 border border-white/[0.04] rounded-xl text-left">
                    <div>
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1 block">{t('tools.pomodoro.project')}</label>
                      <input value={project} onChange={e => setProject(e.target.value)} placeholder="None" className="w-full px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1 block">{t('tools.pomodoro.category')}</label>
                      <input value={category} onChange={e => setCategory(e.target.value)} placeholder="None" className="w-full px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/30" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1 block">{t('tools.pomodoro.priority')}</label>
                      <div className="flex bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06]">
                        {['low', 'medium', 'high'].map(p => (
                          <button key={p} type="button" onClick={() => setPriority(p as any)} className={`no-drag flex-1 py-1 rounded text-[10px] capitalize font-medium transition-all cursor-pointer ${priority === p ? 'bg-white/[0.08] text-white font-semibold' : 'text-white/40 hover:text-white/60'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preset list & Custom Duration */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">{t('tools.pomodoro.duration')}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Quick Focus', mins: 25 },
                        { name: 'Deep Work', mins: 50 },
                        { name: 'Extended Focus', mins: 90 }
                      ].map(preset => (
                        <button
                          key={preset.mins}
                          type="button"
                          onClick={() => { setDuration(preset.mins); setCustomMinutesInput(''); }}
                          className={`no-drag py-2 px-2.5 rounded-xl border text-[11px] transition-all text-left flex flex-col justify-center cursor-pointer ${duration === preset.mins && !customMinutesInput ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] font-semibold' : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04]'}`}
                        >
                          <span className="text-[10px] text-white/80">{preset.name}</span>
                          <span className="text-[9px] text-white/40 mt-0.5">{preset.mins} Min</span>
                        </button>
                      ))}

                      <div className={`flex items-center gap-1.5 px-2.5 rounded-xl border text-[11px] bg-white/[0.02] transition-colors ${customMinutesInput ? 'border-[var(--accent)]/40' : 'border-white/[0.08]'}`}>
                        <span className="text-[9.5px] font-bold text-white/40">{t('tools.pomodoro.custom')}</span>
                        <input
                          type="number"
                          value={customMinutesInput}
                          onChange={e => {
                            const val = e.target.value;
                            setCustomMinutesInput(val);
                            const mins = Math.max(1, Number(val));
                            setDuration(mins);
                          }}
                          placeholder={t('tools.pomodoro.mins')}
                          className="w-full bg-transparent border-none text-[11.5px] text-white text-right focus:outline-none placeholder-white/20 px-0 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Focus Mode & Launch options */}
                  <div className="flex items-center justify-between py-2 bg-white/[0.02] px-3 border border-white/[0.04] rounded-xl text-left">
                    <div className="flex flex-col flex-1 pr-2">
                      <span className="text-[11px] font-medium text-white/80">{t('tools.pomodoro.focusMode')}</span>
                      <span className="text-[8.5px] text-white/30 leading-snug">
                        {t('tools.pomodoro.focusModeDesc')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={focusMode}
                      onChange={e => setFocusMode(e.target.checked)}
                      className="accent-[var(--accent)] cursor-pointer h-4 w-4 shrink-0"
                    />
                  </div>

                  {/* Launch button */}
                  <button
                    onClick={() => startSession(duration)}
                    className="no-drag w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black text-[12px] font-bold transition-all cursor-pointer shadow-md"
                  >
                    {t('tools.pomodoro.startFocusEnter')}
                  </button>
                </div>

                {/* Subtle keyboard shortcuts hint */}
                <div className="text-[9.5px] text-white/25 text-center pt-2 select-none border-t border-white/[0.02]">
                  {t('tools.pomodoro.shortcuts')} <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Esc</kbd> {t('tools.pomodoro.minimizeMin')} • <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Enter</kbd> {t('tools.pomodoro.startFocus')}
                </div>
              </div>
            )}

            {/* ================= STEP 3: ACTIVE FOCUS SESSION ================= */}
            {step === 'focus' && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-2">
                {/* SVG Progress Circle */}
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      className="stroke-white/[0.04]"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      className="stroke-[var(--accent)] transition-all duration-1000 ease-linear"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>

                  {/* Digital Clock */}
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[32px] font-bold text-white font-mono leading-none tracking-tight">{formatTime(timeLeft)}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 mt-1.5">{isRunning ? t('tools.pomodoro.focusing') : t('tools.pomodoro.paused')}</span>
                  </div>
                </div>

                {/* Task metadata details */}
                <div className="text-center space-y-1.5 max-w-[260px]">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider bg-[var(--accent)]/10 px-2.5 py-0.5 rounded-full">
                    {project ? `${project} • ` : ''}{category || t('tools.pomodoro.focusing')}
                  </span>
                  <h4 className="text-[13px] font-bold text-white/95 truncate block">{taskName || 'General Work'}</h4>
                  {focusMode && (
                    <div className="flex items-center justify-center gap-1 text-[8.5px] text-white/30">
                      <span className="material-symbols-outlined text-[10px]">do_not_disturb_on</span>
                      <span>{t('tools.pomodoro.focusModeEnabled')}</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 w-full max-w-[200px]">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className="no-drag flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[11px] font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isRunning ? t('tools.pomodoro.pause') : t('tools.pomodoro.resume')}
                  >
                    <span className="material-symbols-outlined text-[14px]">{isRunning ? 'pause' : 'play_arrow'}</span>
                    {isRunning ? t('tools.pomodoro.pause') : t('tools.pomodoro.resume')}
                  </button>

                  <button
                    onClick={endSessionEarly}
                    className="no-drag w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                    title={t('tools.pomodoro.stopSession')}
                  >
                    <span className="material-symbols-outlined text-[15px]">stop</span>
                  </button>
                </div>

                <div className="text-[9.5px] text-white/20 text-center pt-2 select-none">
                  {t('tools.pomodoro.shortcuts')} <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Space</kbd> {t('tools.pomodoro.pause')}/{t('tools.pomodoro.resume')} • <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Esc</kbd> {t('tools.pomodoro.minimizeMin')}
                </div>
              </div>
            )}

            {/* ================= STEP 4: BREAK SESSION ================= */}
            {step === 'break' && !breakSelected && (
              <div className="flex-grow flex flex-col justify-center items-center text-center space-y-5 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-emerald-400">coffee</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-[14.5px]">{t('tools.pomodoro.greatWork')}</h3>
                  <p className="text-white/40 text-[11px]">{t('tools.pomodoro.timeForBreak')}</p>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button
                    onClick={() => startBreak(5)}
                    className="no-drag w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white text-[12px] font-semibold transition-all cursor-pointer"
                  >
                    5 {t('tools.pomodoro.minuteBreak')}
                  </button>
                  <button
                    onClick={() => startBreak(10)}
                    className="no-drag w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white text-[12px] font-semibold transition-all cursor-pointer"
                  >
                    10 {t('tools.pomodoro.minuteBreak')}
                  </button>

                  {/* Suggest a longer break after 3+ sessions today */}
                  {completedTodayCount >= 3 && (
                    <button
                      onClick={() => startBreak(15)}
                      className="no-drag w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20 text-emerald-400 text-[12px] font-bold transition-all cursor-pointer"
                    >
                      15 {t('tools.pomodoro.suggestedBreak')}
                    </button>
                  )}

                  <button
                    onClick={skipBreak}
                    className="no-drag w-full py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] text-white/50 text-[12px] font-medium transition-all cursor-pointer"
                  >
                    {t('tools.pomodoro.skipBreak')}
                  </button>
                </div>
              </div>
            )}

            {step === 'break' && breakSelected && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-2">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      className="stroke-white/[0.04]"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      className="stroke-emerald-400 transition-all duration-1000 ease-linear"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[32px] font-bold text-emerald-400 font-mono leading-none tracking-tight">{formatTime(breakLeft)}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/50 mt-1.5">Break</span>
                  </div>
                </div>

                <div className="text-center space-y-1 max-w-[260px]">
                  <h4 className="text-white font-bold text-[13.5px]">{t('tools.pomodoro.breakSession')}</h4>
                  <p className="text-white/40 text-[11px] leading-relaxed">{t('tools.pomodoro.rechargeRest')}</p>
                </div>

                <div className="flex items-center gap-2.5 w-full max-w-[200px]">
                  <button
                    onClick={() => setIsBreakRunning(!isBreakRunning)}
                    className="no-drag flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">{isBreakRunning ? 'pause' : 'play_arrow'}</span>
                    {isBreakRunning ? t('tools.pomodoro.pause') : t('tools.pomodoro.resume')}
                  </button>
                  <button
                    onClick={skipBreak}
                    className="no-drag flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    {t('tools.pomodoro.skipBreak')}
                  </button>
                </div>

                <div className="text-[9.5px] text-white/20 text-center pt-2 select-none">
                  {t('tools.pomodoro.shortcuts')} <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Space</kbd> {t('tools.pomodoro.pause')}/{t('tools.pomodoro.resume')} • <kbd className="bg-white/5 px-1 rounded text-white/40 font-mono">Esc</kbd> {t('tools.pomodoro.minimizeMin')}
                </div>
              </div>
            )}

            {/* ================= STEP 5: SESSION COMPLETION SUMMARY ================= */}
            {step === 'summary' && (
              <div className="flex-grow space-y-4">
                <div className="text-center space-y-1">
                  <span className="material-symbols-outlined text-[32px] text-[var(--accent)]">emoji_events</span>
                  <h3 className="text-white font-bold text-[13.5px]">{t('tools.pomodoro.sessionComplete')}</h3>
                  <p className="text-white/40 text-[11px]">{t('tools.pomodoro.greatJob')}</p>
                </div>

                {/* Metrics Table */}
                <div className="grid grid-cols-2 gap-2 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-[11.5px] font-medium text-white/80 text-left">
                  <div className="text-white/40">{t('tools.pomodoro.task')}</div>
                  <div className="text-right truncate font-bold text-white">{taskName || 'General Work'}</div>
                  <div className="text-white/40">{t('tools.pomodoro.focusTime')}</div>
                  <div className="text-right text-[var(--accent)] font-bold">{records[0]?.focusTime || duration} {t('tools.pomodoro.minutes')}</div>
                  <div className="text-white/40">{t('tools.pomodoro.breakTaken')}</div>
                  <div className="text-right text-emerald-400 font-bold">{records[0]?.breakTime || 0} {t('tools.pomodoro.minutes')}</div>
                  <div className="text-white/40">{t('tools.pomodoro.completion')}</div>
                  <div className="text-right font-bold text-white">{records[0]?.completed ? t('tools.pomodoro.finished') : t('tools.pomodoro.incomplete')}</div>
                </div>

                {/* Optional Notes */}
                <div className="space-y-2 text-left">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">{t('tools.pomodoro.sessionNotes')}</span>
                  <input value={notesCompleted} onChange={e => setNotesCompleted(e.target.value)} placeholder={t('tools.pomodoro.whatCompleted')} className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11.5px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/30" />
                  <input value={notesProgress} onChange={e => setNotesProgress(e.target.value)} placeholder={t('tools.pomodoro.progressMade')} className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11.5px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/30" />
                  <input value={notesNextSteps} onChange={e => setNotesNextSteps(e.target.value)} placeholder={t('tools.pomodoro.nextSteps')} className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11.5px] text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/30" />
                </div>

                {/* Save to Vault Checkbox */}
                <div className="flex items-center justify-between py-1 bg-white/[0.02] px-3 border border-white/[0.04] rounded-xl text-left">
                  <span className="text-[11px] text-white/70">{t('tools.pomodoro.saveFocusNotes')}</span>
                  <input type="checkbox" checked={saveToVaultCheck} onChange={e => setSaveToVaultCheck(e.target.checked)} className="accent-[var(--accent)] cursor-pointer h-4 w-4" />
                </div>

                <button
                  onClick={handleSaveSummary}
                  className="no-drag w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black text-[12px] font-bold transition-all cursor-pointer shadow-md"
                >
                  {t('tools.pomodoro.saveNotesFinish')}
                </button>
              </div>
            )}
          </>
        ) : (
          /* ================= STATISTICS PANEL ================= */
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
            {/* Streak & Consistency */}
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] space-y-2.5 shrink-0 text-left">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-orange-400 animate-pulse">local_fire_department</span>
                <div>
                  <span className="text-[12.5px] font-bold text-white">{stats.streak} {t('tools.pomodoro.dayFocusStreak')}</span>
                  <p className="text-[9px] text-white/30 mt-0.5">{t('tools.pomodoro.keepStreak')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[10.5px]">
                <div className="flex flex-col">
                  <span className="text-white/40 text-[9px] uppercase font-bold tracking-wider">{t('tools.pomodoro.weeklyConsistency')}</span>
                  <span className="text-white font-bold font-mono mt-0.5">{stats.weeklyConsistency}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/40 text-[9px] uppercase font-bold tracking-wider">{t('tools.pomodoro.totalCompleted')}</span>
                  <span className="text-white font-bold font-mono mt-0.5">{stats.allTimeSessions} {t('tools.pomodoro.sessions')}</span>
                </div>
              </div>
            </div>

            {/* Today Stats */}
            <div className="space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block px-1">{t('tools.pomodoro.todayLabel')}</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-white font-mono">{stats.todaySessions}</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">{t('tools.pomodoro.focusSessionsLabel')}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-[var(--accent)] font-mono">{stats.todayFocusMins}m</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">{t('tools.pomodoro.focusTimeLabel')}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-emerald-400 font-mono">{stats.todayBreakMins}m</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">{t('tools.pomodoro.breakTimeLabel')}</span>
                </div>
              </div>
            </div>

            {/* This Week Stats */}
            <div className="space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block px-1">{t('tools.pomodoro.thisWeek')}</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-white font-mono">{stats.weekSessions}</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">{t('tools.pomodoro.totalSessions')}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-[var(--accent)] font-mono">{stats.weekFocusHours}h</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">{t('tools.pomodoro.totalHours')}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-white font-mono">{stats.weekAvgMins}m</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">Avg Length</span>
                </div>
              </div>
            </div>

            {/* All-time Stats */}
            <div className="space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block px-1">All Time</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-white font-mono">{stats.allTimeSessions}</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">Sessions Completed</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[15px] font-bold text-[var(--accent)] font-mono">{stats.allTimeFocusHours}h</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">Hours Focused</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 text-center">
                  <span className="text-[12px] font-bold text-white truncate block mt-0.5" title={stats.mostActiveDay}>{stats.mostActiveDay}</span>
                  <span className="text-[8px] text-white/30 block mt-1 uppercase font-semibold">Most Active Day</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Footer Switch Tabs - Hidden in compact mode */}
      {!(step === 'focus' && compactMode) && (
      <div className="border-t border-white/5 bg-white/[0.01] flex p-1 shrink-0 select-none">
        <button
          onClick={() => setActiveTab('timer')}
          className={`no-drag flex-1 py-1.5 text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all ${activeTab === 'timer' ? 'bg-white/[0.06] text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          <span className="material-symbols-outlined text-[13px]">timer</span>
          Timer
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`no-drag flex-1 py-1.5 text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all ${activeTab === 'stats' ? 'bg-white/[0.06] text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          <span className="material-symbols-outlined text-[13px]">insights</span>
          Statistics
        </button>
      </div>
      )}
      
      {/* Compact Mode Toggle Button - Show only during focus */}
      {step === 'focus' && (
      <div className="border-t border-white/5 bg-white/[0.01] p-2 shrink-0">
        <button
          onClick={() => setCompactMode(!compactMode)}
          className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all flex items-center justify-center gap-1 text-[10px] font-bold"
        >
          <span className="material-symbols-outlined text-[12px]">
            {compactMode ? 'unfold_more' : 'unfold_less'}
          </span>
          {compactMode ? 'Expand' : 'Compact Mode'}
        </button>
      </div>
      )}

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize flex items-end justify-end p-0.5 group z-[350]"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="w-1.5 h-1.5 border-r border-b border-white/25 group-hover:border-white/50 transition-colors" />
      </div>
    </div>,
    container
  );
};

export default PomodoroTool;


