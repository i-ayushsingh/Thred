import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ToolCard } from './ToolCard';
import { useT } from '../../i18n/context';
import { playChimeSound } from '../../utils/audio';

const TIMEZONES = [
    { name: 'London', zone: 'Europe/London', code: 'GMT/BST' },
    { name: 'New York', zone: 'America/New_York', code: 'EST/EDT' },
    { name: 'Tokyo', zone: 'Asia/Tokyo', code: 'JST' },
    { name: 'Mumbai', zone: 'Asia/Kolkata', code: 'IST' },
    { name: 'Sydney', zone: 'Australia/Sydney', code: 'AEST/AEDT' }
];

const TimeTool: React.FC = () => {
    const {  toolWindows, minimizeToolWindow, closeToolWindow  } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, minimizeToolWindow: state.minimizeToolWindow, closeToolWindow: state.closeToolWindow })));
    const tw = toolWindows.find(t => t.id === 'time');
    if (!tw) return null;

    return <TimeInner
        minimized={tw.minimized}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'time')}
    />;
};

interface InnerProps {
    minimized: boolean;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    index: number;
}

const TimeInner: React.FC<InnerProps> = ({ minimized, minimizeToolWindow, closeToolWindow, index }) => {
    const t = useT();
    const [activeTab, setActiveTab] = useState<'clock' | 'stopwatch' | 'timer'>('clock');
    const {  preferences  } = useStore(useShallow(state => ({ preferences: state.preferences })));

    // --- Clock State ---
    const [currentTime, setCurrentTime] = useState(new Date());
    const [visibleCities, setVisibleCities] = useState<string[]>(['London', 'New York', 'Tokyo']);
    const [showAddCity, setShowAddCity] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getTimeString = (zone: string) => {
        try {
            return new Date().toLocaleTimeString([], {
                timeZone: zone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch {
            return '--:--:--';
        }
    };

    const getTZOffset = (zone: string) => {
        try {
            const date = new Date();
            const tzString = date.toLocaleString('en-US', { timeZone: zone });
            const localString = date.toLocaleString('en-US');
            const diffMs = Date.parse(tzString) - Date.parse(localString);
            const diffHours = Math.round(diffMs / 360000) / 10;
            const sign = diffHours >= 0 ? '+' : '';
            if (diffHours === 0) return 'Local';
            return `${sign}${diffHours}h`;
        } catch {
            return '';
        }
    };

    // --- Stopwatch State (anchor-timestamp pattern, drift-free) ---
    const [swTime, setSwTime] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const [laps, setLaps] = useState<{ lapTime: number; overallTime: number; delta: number }[]>([]);
    const swRafRef = useRef<number | null>(null);
    const swAccumulated = useRef<number>(0);
    const swStartedAt = useRef<number>(0);

    useEffect(() => {
        if (swRunning) {
            swStartedAt.current = performance.now();
            const tick = () => {
                const elapsed = swAccumulated.current + (performance.now() - swStartedAt.current);
                setSwTime(elapsed);
            };
            swRafRef.current = window.setInterval(tick, 10);
        } else {
            if (swRafRef.current !== null) {
                clearInterval(swRafRef.current);
                swRafRef.current = null;
            }
            if (swStartedAt.current > 0) {
                swAccumulated.current += performance.now() - swStartedAt.current;
                swStartedAt.current = 0;
            }
        }
        return () => {
            if (swRafRef.current !== null) clearInterval(swRafRef.current);
        };
    }, [swRunning]);

    const formatSw = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const millis = Math.floor((ms % 1000) / 10);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    };

    const formatDelta = (ms: number) => {
        if (ms === 0) return '0.00s';
        const sign = ms > 0 ? '+' : '';
        const secs = (ms / 1000).toFixed(2);
        return `${sign}${secs}s`;
    };

    const recordLap = () => {
        const totalMs = swRunning
            ? swAccumulated.current + (performance.now() - swStartedAt.current)
            : swAccumulated.current;
        const prevOverall = laps.length > 0 ? laps[0].overallTime : 0;
        const lapMs = totalMs - prevOverall;
        const prevLapTime = laps.length > 0 ? laps[0].lapTime : lapMs;
        const delta = lapMs - prevLapTime;
        setLaps(prev => [{ lapTime: lapMs, overallTime: totalMs, delta }, ...prev]);
    };

    const resetSw = () => {
        setSwRunning(false);
        swAccumulated.current = 0;
        swStartedAt.current = 0;
        setSwTime(0);
        setLaps([]);
    };

    // --- Timer State (anchor end-epoch pattern, drift-free) ---
    const [timerInput, setTimerInput] = useState('05:00');
    const [timerRemaining, setTimerRemaining] = useState(0);
    const [timerDuration, setTimerDuration] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const timerIntervalRef = useRef<number | null>(null);
    const timerEndsAt = useRef<number>(0);
    const timerPausedRemaining = useRef<number>(0);

    const playTimerFinishedTone = () => {
        playChimeSound();
    };

    useEffect(() => {
        if (timerRunning) {
            timerEndsAt.current = performance.now() + timerPausedRemaining.current;
            timerIntervalRef.current = window.setInterval(() => {
                const rem = timerEndsAt.current - performance.now();
                if (rem <= 0) {
                    if (timerIntervalRef.current) {
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;
                    }
                    timerPausedRemaining.current = 0;
                    setTimerRemaining(0);
                    setTimerRunning(false);
                    setTimerActive(false);
                    playTimerFinishedTone();
                } else {
                    timerPausedRemaining.current = rem;
                    setTimerRemaining(rem);
                }
            }, 30);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (timerEndsAt.current > 0 && timerPausedRemaining.current > 0) {
                const rem = Math.max(0, timerEndsAt.current - performance.now());
                timerPausedRemaining.current = rem;
                setTimerRemaining(rem);
                timerEndsAt.current = 0;
            }
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerRunning]);

    const startTimer = () => {
        if (timerActive && timerPausedRemaining.current > 0) {
            setTimerRunning(true);
        } else {
            const parts = timerInput.split(':');
            let ms = 0;
            if (parts.length === 2) {
                ms = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
            } else if (parts.length === 1) {
                ms = parseInt(parts[0]) * 60 * 1000;
            }
            if (ms > 0 && !isNaN(ms)) {
                timerPausedRemaining.current = ms;
                setTimerDuration(ms);
                setTimerRemaining(ms);
                setTimerActive(true);
                setTimerRunning(true);
            }
        }
    };

    const triggerPreset = (minutes: number) => {
        setTimerRunning(false);
        const ms = minutes * 60 * 1000;
        timerPausedRemaining.current = ms;
        timerEndsAt.current = 0;
        setTimerDuration(ms);
        setTimerRemaining(ms);
        setTimerActive(true);
        setTimeout(() => setTimerRunning(true), 0);
    };

    const formatTimer = (ms: number) => {
        const totalSecs = Math.ceil(ms / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;

    // Compact mode when timer is running
    const isTimerRunning = timerActive && timerRunning;

    return (
        <ToolCard
            toolId="time"
            title="Time"
            icon={<span className="material-symbols-outlined text-[17px] font-bold" style={{ color: 'var(--accent)' }}>schedule</span>}
            width={340}
            height={460}
            isMinimized={minimized}
            onClose={() => closeToolWindow('time')}
            onMinimize={() => minimizeToolWindow('time')}
            index={index}
        >
            <div className="flex flex-col flex-1 min-h-0 w-full h-full select-none bg-[#0c0c0e]/10">
                {/* Tabs */}
                <div className="flex px-4 py-3 gap-2 border-b border-white/5 bg-[#0c0c0e]/30 shrink-0 select-none items-center justify-between">
                    {([
                        { id: 'clock', label: 'World Clock' },
                        { id: 'stopwatch', label: 'Stopwatch' },
                        { id: 'timer', label: 'Timer' }
                    ] as const).map((tab) => {
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                                    isSelected
                                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                                        : 'border-transparent text-white/40 hover:text-white/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Frame */}
                <div className="flex-1 flex flex-col min-h-0 w-full">
                    {activeTab === 'clock' && (
                        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
                            {/* Local Time Banner */}
                            <div className="bg-[#111113]/40 border border-white/5 rounded-xl py-4 flex flex-col items-center justify-center shrink-0 shadow-lg">
                                <div className="text-[34px] font-bold text-white tracking-widest font-mono leading-none">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                </div>
                                <div className="text-[10px] text-white/35 font-semibold mt-1.5">
                                    {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • Local Time
                                </div>
                            </div>

                            {/* World Clock List */}
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                                <div className="text-[11px] font-bold text-white/35 px-1 tracking-wider uppercase">Other time zones</div>
                                {TIMEZONES.filter(tz => visibleCities.includes(tz.name)).map(tz => (
                                    <div
                                        key={tz.name}
                                        className="flex items-center justify-between px-3.5 py-3 bg-[#111113]/40 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/[0.01] transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="material-symbols-outlined text-[16px] text-[var(--accent)] shrink-0">schedule</span>
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-bold text-white/95 leading-tight">{tz.name}</div>
                                                <div className="text-[9.5px] text-white/35 font-mono mt-0.5">{tz.code} ({getTZOffset(tz.zone)})</div>
                                            </div>
                                        </div>
                                        <div className="text-[13.5px] font-bold text-[var(--accent)] font-mono shrink-0">
                                            {getTimeString(tz.zone)}
                                        </div>
                                    </div>
                                ))}

                                {showAddCity && (
                                    <div className="bg-[#18181b] border border-white/10 rounded-xl p-2.5 space-y-1 z-10 shrink-0">
                                        <div className="text-[9px] uppercase font-bold text-white/40 px-1 mb-1">Select City</div>
                                        {TIMEZONES.filter(tz => !visibleCities.includes(tz.name)).map(tz => (
                                            <button
                                                key={tz.name}
                                                onClick={() => {
                                                    setVisibleCities([...visibleCities, tz.name]);
                                                    setShowAddCity(false);
                                                }}
                                                className="w-full text-left px-2 py-1 text-[10px] text-white/80 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                                            >
                                                {tz.name} ({tz.code})
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setShowAddCity(false)}
                                            className="w-full text-center py-1 mt-1 text-[9px] text-white/30 hover:text-white font-bold border-t border-white/5 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Add City Button */}
                            {!showAddCity && TIMEZONES.filter(tz => !visibleCities.includes(tz.name)).length > 0 && (
                                <button
                                    onClick={() => setShowAddCity(true)}
                                    className="w-full bg-[#111113]/40 border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-3 flex items-center justify-between transition-all cursor-pointer text-white/40 hover:text-white/60 text-[11px] font-bold shrink-0"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                        Add city
                                    </span>
                                    <span className="material-symbols-outlined text-[15px]">public</span>
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'stopwatch' && (
                        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3.5">
                            {/* Stopwatch Display */}
                            <div className="bg-[#111113]/40 border border-white/5 rounded-xl py-6 flex items-center justify-center shrink-0 shadow-lg">
                                <div className="text-[38px] font-bold text-white tracking-widest font-mono leading-none">
                                    {formatSw(swTime)}
                                </div>
                            </div>

                            {/* Control Actions */}
                            <div className="flex gap-3 shrink-0">
                                <button
                                    onClick={swRunning ? recordLap : resetSw}
                                    disabled={!swRunning && swTime === 0}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[15px]">{swRunning ? 'flag' : 'restart_alt'}</span>
                                    {swRunning ? 'Lap' : 'Reset'}
                                </button>
                                <button
                                    onClick={() => setSwRunning(!swRunning)}
                                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        swRunning
                                            ? 'bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25'
                                            : 'bg-[var(--accent)] text-black hover:bg-[#E8954F]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">{swRunning ? 'pause' : 'play_arrow'}</span>
                                    {swRunning ? 'Pause' : 'Start'}
                                </button>
                            </div>

                            {/* Laps List Header */}
                            <div className="flex items-center justify-between text-[11px] font-bold text-white/45 px-1 shrink-0">
                                <span>Laps</span>
                                <span className="text-[10px] text-white/35 font-mono">{laps.length > 0 ? `${laps.length} laps` : 'No laps yet'}</span>
                            </div>

                            {/* Laps List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-[#111113]/25 px-3 py-2.5 space-y-1.5 min-h-[120px]">
                                {laps.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20 gap-1.5 text-[10px] py-8">
                                        <span className="material-symbols-outlined text-[20px] text-white/15">flag</span>
                                        Your laps will appear here
                                    </div>
                                ) : (
                                    laps.map((lap, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                                            <span className="font-bold text-white/40">Lap {laps.length - idx}</span>
                                            <span className="font-mono font-bold text-white/90">{formatSw(lap.lapTime)}</span>
                                            <span className={`font-mono text-[10px] font-semibold text-right ${
                                                lap.delta > 0
                                                    ? 'text-red-400'
                                                    : lap.delta < 0
                                                        ? 'text-emerald-400'
                                                        : 'text-white/30'
                                            }`}>
                                                {formatDelta(lap.delta)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'timer' && (
                        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3.5">
                            {/* Visual Display */}
                            <div className="relative py-6 bg-[#111113]/40 border border-white/5 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-lg overflow-hidden">
                                {timerActive && (
                                    <div
                                        className="absolute bottom-0 left-0 h-[2px] bg-[var(--accent)] transition-all duration-100 ease-linear shadow-[0_0_6px_var(--accent)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                )}
                                {(() => {
                                    const displayValue = timerActive ? formatTimer(timerRemaining) : timerInput;
                                    return (
                                        <div className="w-full px-6 flex flex-col items-center">
                                            <input
                                                type="text"
                                                value={displayValue}
                                                onChange={e => {
                                                    if (!timerActive) {
                                                        setTimerInput(e.target.value);
                                                    }
                                                }}
                                                readOnly={timerActive}
                                                placeholder="MM:SS"
                                                className="w-[160px] bg-transparent border-0 border-b border-white/10 hover:border-white/20 focus:border-[var(--accent)] outline-none text-center text-[38px] font-bold text-white font-mono p-0 ring-0 focus:ring-0 focus:outline-none transition-all"
                                            />
                                            <div className="flex items-center gap-0.5 text-[10px] text-white/35 font-bold mt-2 uppercase tracking-wide select-none">
                                                <span>Minutes & Seconds</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Core Controls */}
                            <div className="flex gap-3 shrink-0" style={{ gap: isTimerRunning ? '6px' : '12px' }}>
                                <button
                                    onClick={() => {
                                        setTimerRunning(false);
                                        setTimerActive(false);
                                        timerPausedRemaining.current = 0;
                                        timerEndsAt.current = 0;
                                        setTimerRemaining(0);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                    disabled={!timerActive}
                                >
                                    <span className="material-symbols-outlined text-[15px]">close</span> Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (timerActive) setTimerRunning(r => !r);
                                        else startTimer();
                                    }}
                                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        timerRunning
                                            ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400 hover:bg-amber-500/25'
                                            : 'bg-[var(--accent)] text-black hover:bg-[#E8954F]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">{timerRunning ? 'pause' : 'play_arrow'}</span>
                                    {timerRunning ? 'Pause' : (timerActive ? 'Resume' : 'Start')}
                                </button>
                            </div>

                            {/* Pomodoro & Quick Presets Section */}
                            <div className="flex flex-col shrink-0">
                                <div className="text-[11px] font-bold text-white/45 px-1 mb-2">Focus presets</div>
                                <div className="grid grid-cols-3 gap-2.5 shrink-0 select-none">
                                    <button
                                        onClick={() => triggerPreset(25)}
                                        className="py-3 px-1 rounded-xl bg-[#111113]/40 border border-white/5 hover:border-white/10 text-center transition-all flex flex-col items-center justify-center cursor-pointer group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-[var(--accent)] mb-1.5">track_changes</span>
                                        <span className="text-[10px] font-bold text-white/90 group-hover:text-white">Focus</span>
                                        <span className="text-[9px] text-[var(--accent)] font-semibold mt-0.5">25 min</span>
                                    </button>
                                    <button
                                        onClick={() => triggerPreset(5)}
                                        className="py-3 px-1 rounded-xl bg-[#111113]/40 border border-white/5 hover:border-white/10 text-center transition-all flex flex-col items-center justify-center cursor-pointer group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-sky-400 mb-1.5">local_cafe</span>
                                        <span className="text-[10px] font-bold text-white/90 group-hover:text-white">Short Break</span>
                                        <span className="text-[9px] text-sky-400 font-semibold mt-0.5">5 min</span>
                                    </button>
                                    <button
                                        onClick={() => triggerPreset(15)}
                                        className="py-3 px-1 rounded-xl bg-[#111113]/40 border border-white/5 hover:border-white/10 text-center transition-all flex flex-col items-center justify-center cursor-pointer group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-emerald-400 mb-1.5">energy_savings_leaf</span>
                                        <span className="text-[10px] font-bold text-white/90 group-hover:text-white">Long Break</span>
                                        <span className="text-[9px] text-emerald-400 font-semibold mt-0.5">15 min</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </ToolCard>
    );
};

export default TimeTool;
