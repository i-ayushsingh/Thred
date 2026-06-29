import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { ToolCard } from './ToolCard';
import { useT } from '../../i18n/context';
import { VaultItem, CalendarEventItem } from '../../shared/vault-schema';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Common standard holiday dates (MM-DD)
const HOLIDAYS: Record<string, string> = {
    '00-01': "New Year's Day",
    '01-14': "MLK Day / Pongal",
    '01-26': "Republic Day",
    '04-22': "Earth Day",
    '06-19': "Juneteenth",
    '07-04': "Independence Day",
    '09-07': "Labor Day",
    '10-31': "Halloween",
    '11-26': "Thanksgiving",
    '12-25': "Christmas Day",
    '12-31': "New Year's Eve"
};

interface CalendarEvent {
    id: string;
    dateKey: string; // YYYY-MM-DD
    text: string;
    completed: boolean;
}

const CalendarTool: React.FC = () => {
    const {  toolWindows, minimizeToolWindow, closeToolWindow  } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, minimizeToolWindow: state.minimizeToolWindow, closeToolWindow: state.closeToolWindow })));
    const tw = toolWindows.find(t => t.id === 'calendar');
    if (!tw) return null;

    return <CalendarInner
        minimized={tw.minimized}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'calendar')}
    />;
};

const CalendarInner: React.FC<{
    minimized: boolean;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    index: number;
}> = ({ minimized, minimizeToolWindow, closeToolWindow, index }) => {
    const t = useT();
    const {  vaultItems, addVaultItem, deleteVaultItem  } = useStore(useShallow(state => ({ vaultItems: state.vaultItems, addVaultItem: state.addVaultItem, deleteVaultItem: state.deleteVaultItem })));
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<number>(today.getDate());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [newEventText, setNewEventText] = useState('');

    // Load events from vault items
    useEffect(() => {
        const calItems = vaultItems.filter((i): i is CalendarEventItem => i.kind === 'calendar');
        setEvents(calItems.map((i) => ({
            id: i.id,
            dateKey: i.dateKey || '',
            text: i.title,
            completed: !!i.completed})));
    }, [vaultItems]);

    const saveEvents = async (newEvents: CalendarEvent[]) => {
        setEvents(newEvents);
        const existingIds = new Set(newEvents.map(e => e.id));
        const vaultCalItems = vaultItems.filter(i => i.kind === 'calendar');
        for (const item of vaultCalItems) {
            if (!existingIds.has(item.id)) {
                await deleteVaultItem(item.id, 'Calendar');
            }
        }
        for (const evt of newEvents) {
            const vaultItem: VaultItem = {
                id: evt.id,
                kind: 'calendar',
                category: 'Calendar',
                title: evt.text,
                dateKey: evt.dateKey,
                completed: evt.completed,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()};
            await addVaultItem(vaultItem);
        }
    };

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const isToday = (day: number) =>
        day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
        setSelectedDate(1);
    };
    
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
        setSelectedDate(1);
    };
    
    const goToday = () => {
        setViewMonth(today.getMonth());
        setViewYear(today.getFullYear());
        setSelectedDate(today.getDate());
    };

    // Build grid cells
    const cells: { day: number; current: boolean; monthOffset: number }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: daysInPrev - i, current: false, monthOffset: -1 });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({ day: i, current: true, monthOffset: 0 });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, current: false, monthOffset: 1 });
    }

    const getDateKey = (day: number, offset = 0) => {
        let m = viewMonth + offset;
        let y = viewYear;
        if (m < 0) { m = 11; y -= 1; }
        else if (m > 11) { m = 0; y += 1; }
        const mm = (m + 1).toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const getHolidayName = (day: number, offset = 0) => {
        let m = viewMonth + offset;
        if (m < 0) m = 11;
        else if (m > 11) m = 0;
        const mm = m.toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');
        return HOLIDAYS[`${mm}-${dd}`] || null;
    };

    const activeDateKey = getDateKey(selectedDate);
    const dayEvents = events.filter(e => e.dateKey === activeDateKey);

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventText.trim()) return;
        const newEvent: CalendarEvent = {
            id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dateKey: activeDateKey,
            text: newEventText.trim(),
            completed: false
        };
        saveEvents([...events, newEvent]);
        setNewEventText('');
    };

    const toggleEvent = (id: string) => {
        saveEvents(events.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
    };

    const deleteEvent = (id: string) => {
        saveEvents(events.filter(e => e.id !== id));
    };

    return (
        <ToolCard
            toolId="calendar"
            title={t('tools.calendar.title')}
            icon={<span className="material-symbols-outlined text-[18px]" style={{ color: '#8B5CF6' }}>calendar_month</span>}
            width={320}
            height={490}
            isMinimized={minimized}
            onClose={() => closeToolWindow('calendar')}
            onMinimize={() => minimizeToolWindow('calendar')}
            index={index}
            headerActions={
                <button
                    onClick={goToday}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                    title={t('tools.calendar.goToToday')}
                >
                    <span className="material-symbols-outlined text-[16px]">today</span>
                </button>
            }
        >
            <div className="flex flex-col flex-1 min-h-0 w-full h-full">
                {/* Month/Year Nav */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)] shrink-0 bg-white/[0.01]">
                    <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <span className="text-[12.5px] font-bold text-white tracking-wide">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                    <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                </div>

                {/* Grid Container */}
                <div className="p-3 shrink-0">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1 text-center text-[9.5px] text-white/25 uppercase font-bold tracking-wider">
                        {DAY_NAMES.map(d => <div key={d} className="py-1">{d}</div>)}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {cells.map((cell, i) => {
                            const isTodayCell = cell.current && isToday(cell.day);
                            const isSelected = cell.current && cell.day === selectedDate;
                            const key = getDateKey(cell.day, cell.monthOffset);
                            const cellEvents = events.filter(e => e.dateKey === key);
                            const holidayName = getHolidayName(cell.day, cell.monthOffset);

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (cell.current) {
                                            setSelectedDate(cell.day);
                                        } else {
                                            // Jump to that month
                                            if (cell.monthOffset === -1) prevMonth();
                                            else nextMonth();
                                            setSelectedDate(cell.day);
                                        }
                                    }}
                                    className={`
                                        flex flex-col items-center justify-between p-1 rounded-lg h-9.5 relative transition-all border cursor-pointer
                                        ${!cell.current ? 'text-white/15 border-transparent hover:text-white/30 hover:bg-white/[0.01]' : 'border-transparent hover:bg-[var(--bg-hover)]'}
                                        ${isSelected ? 'bg-white/[0.04] border-white/[0.08] text-white font-bold' : ''}
                                        ${isTodayCell ? 'bg-[var(--accent)] text-black font-extrabold shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_30%,transparent)] border-[var(--accent)] hover:bg-[var(--accent)]' : ''}
                                        ${cell.current && !isTodayCell && !isSelected ? 'text-white/75' : ''}
                                    `}
                                >
                                    <span className="text-[10.5px] leading-none pt-0.5">{cell.day}</span>
                                    {/* Indicators at the bottom */}
                                    <div className="flex gap-0.5 justify-center mb-0.5 h-1 w-full shrink-0">
                                        {holidayName && (
                                            <div className={`w-1 h-1 rounded-full ${isTodayCell ? 'bg-black/60' : 'bg-red-400'}`} title={`Holiday: ${holidayName}`} />
                                        )}
                                        {cellEvents.length > 0 && (
                                            <div className={`w-1 h-1 rounded-full ${isTodayCell ? 'bg-black/80' : 'bg-[var(--accent)]'}`} title={`${cellEvents.length} events`} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected date events section */}
                <div className="flex-1 flex flex-col border-t border-[var(--border-primary)] min-h-0 bg-white/[0.01]">
                    {/* Header */}
                    <div className="px-3.5 py-2 flex items-center justify-between border-b border-[var(--border-primary)] shrink-0">
                        <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider font-mono">
                            {new Date(viewYear, viewMonth, selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} Agenda
                        </div>
                        {getHolidayName(selectedDate) && (
                            <span className="text-[9px] text-red-400 font-semibold bg-red-400/10 px-1.5 py-0.5 rounded">
                                🏮 {getHolidayName(selectedDate)}
                            </span>
                        )}
                    </div>

                    {/* Events List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 min-h-0 select-none">
                        {dayEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/20 gap-1.5 py-4">
                                <span className="material-symbols-outlined text-[20px] opacity-60">event_note</span>
                                <span className="text-[9.5px]">{t('tools.calendar.noEvents')}</span>
                            </div>
                        ) : (
                            dayEvents.map(ev => (
                                <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-white/[0.08] transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <button
                                            onClick={() => toggleEvent(ev.id)}
                                            className="w-3.5 h-3.5 rounded border border-white/20 hover:border-[var(--accent)] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                        >
                                            {ev.completed && <span className="material-symbols-outlined text-[10px] text-[var(--accent)] font-bold">check</span>}
                                        </button>
                                        <span className={`text-[10.5px] truncate flex-1 leading-none ${ev.completed ? 'line-through text-white/30' : 'text-white/80'}`}>
                                            {ev.text}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteEvent(ev.id)}
                                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-red-400 transition-opacity cursor-pointer shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[13px]">close</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Event Input */}
                    <form onSubmit={handleAddEvent} className="p-2 border-t border-[var(--border-primary)] shrink-0 bg-[var(--bg-primary)]">
                        <div className="relative">
                            <input
                                type="text"
                                value={newEventText}
                                onChange={e => setNewEventText(e.target.value)}
                                placeholder={t('tools.calendar.addReminder')}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg pl-3 pr-8 py-1.5 text-[10.5px] text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!newEventText.trim()}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent)] hover:text-black transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[13px]">add</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ToolCard>
    );
};

export default CalendarTool;
