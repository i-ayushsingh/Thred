import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { ToolCard } from './ToolCard';
import { Todo } from '../../store';
import { useT } from '../../i18n/context';

const TodoTool: React.FC = () => {
    const {  toolWindows,
        todos,
        loadTodos,
        addTodo,
        toggleTodo,
        deleteTodo,
        cleanupTodos,
        minimizeToolWindow,
        closeToolWindow,
        todoTab,
        setTodoTab} = useStore(useShallow(state => ({ toolWindows: state.toolWindows, todos: state.todos, loadTodos: state.loadTodos, addTodo: state.addTodo, toggleTodo: state.toggleTodo, deleteTodo: state.deleteTodo, cleanupTodos: state.cleanupTodos, minimizeToolWindow: state.minimizeToolWindow, closeToolWindow: state.closeToolWindow, todoTab: state.todoTab, setTodoTab: state.setTodoTab })));

    const tw = toolWindows.find(t => t.id === 'todos');
    if (!tw) return null;

    return <TodoInner
        minimized={tw.minimized}
        todos={todos}
        loadTodos={loadTodos}
        addTodo={addTodo}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
        cleanupTodos={cleanupTodos}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'todos')}
        todoTab={todoTab}
        setTodoTab={setTodoTab}
    />;
};

interface InnerProps {
    minimized: boolean;
    todos: { permanent: Todo[], temporary: Todo[] };
    loadTodos: () => Promise<void>;
    addTodo: (todo: { text: string; type: 'permanent' | 'temporary'; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => Promise<void>;
    toggleTodo: (id: string) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
    cleanupTodos: () => Promise<void>;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    index: number;
    todoTab: 'temporary' | 'permanent';
    setTodoTab: (tab: 'temporary' | 'permanent') => void;
}

const TodoInner: React.FC<InnerProps> = ({
    minimized,
    todos,
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    cleanupTodos,
    minimizeToolWindow,
    closeToolWindow,
    index,
    todoTab,
    setTodoTab
}) => {
    const t = useT();
    const activeTab = todoTab;
    const setActiveTab = setTodoTab;
    const [newTask, setNewTask] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

    useEffect(() => {
        loadTodos();
        cleanupTodos();
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        addTodo({ text: newTask.trim(), type: activeTab, priority });
        setNewTask('');
        setPriority('medium');
        setShowPriorityDropdown(false);
    };

    const todayString = new Date().toDateString();
    const currentTodos = activeTab === 'temporary'
        ? todos.temporary.filter(todo => {
            const isCreatedToday = new Date(todo.createdAt).toDateString() === todayString;
            const isCompletedToday = todo.completedAt && new Date(todo.completedAt).toDateString() === todayString;
            return !todo.completed || isCreatedToday || isCompletedToday;
          })
        : todos.permanent;
        
    const sortedTodos = [...currentTodos].sort((a, b) => {
        if (a.completed === b.completed) {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const weightA = priorityWeight[a.priority || 'medium'];
            const weightB = priorityWeight[b.priority || 'medium'];
            if (weightA !== weightB) return weightB - weightA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.completed ? 1 : -1;
    });

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <ToolCard
            toolId="todos"
            title="Todos"
            icon={<span className="material-symbols-outlined text-[17px] font-bold" style={{ color: 'var(--accent)' }}>check_circle</span>}
            width={340}
            height={460}
            isMinimized={minimized}
            onClose={() => closeToolWindow('todos')}
            onMinimize={() => minimizeToolWindow('todos')}
            index={index}
        >
            <div className="flex flex-col flex-1 min-h-0 w-full h-full">
                {/* Tabs */}
                <div className="flex border-b border-white/5 shrink-0 relative select-none">
                    <button
                        onClick={() => setActiveTab('temporary')}
                        className={`flex-1 pb-2 pt-2.5 text-[13px] font-bold text-center transition-all relative cursor-pointer ${
                            activeTab === 'temporary' ? 'text-white' : 'text-white/45 hover:text-white/70'
                        }`}
                    >
                        Today
                        {activeTab === 'temporary' && (
                            <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-[var(--accent)] rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('permanent')}
                        className={`flex-1 pb-2 pt-2.5 text-[13px] font-bold text-center transition-all relative cursor-pointer ${
                            activeTab === 'permanent' ? 'text-white' : 'text-white/45 hover:text-white/70'
                        }`}
                    >
                        Tasks
                        {activeTab === 'permanent' && (
                            <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-[var(--accent)] rounded-full" />
                        )}
                    </button>
                </div>

                {/* Sub-header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <span className="text-[12px] font-bold text-white/50">{activeTab === 'temporary' ? 'Today' : 'Tasks'}</span>
                    <span className="bg-white/5 border border-white/8 rounded-md px-2 py-0.5 text-[10px] text-white/50 font-mono font-bold select-none">
                        {sortedTodos.length} {sortedTodos.length === 1 ? 'task' : 'tasks'}
                    </span>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-2 space-y-2">
                    {sortedTodos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2 select-none">
                            <span className="material-symbols-outlined text-[24px]">task</span>
                            <span className="text-[10px]">{t('tools.todo.noTasks') || "No tasks yet"}</span>
                        </div>
                    ) : (
                        sortedTodos.map(todo => {
                            const priorityDot = {
                                low: 'bg-white/20',
                                medium: 'bg-amber-400',
                                high: 'bg-red-400'
                            }[todo.priority || 'medium'];
                            return (
                                <div
                                    key={todo.id}
                                    className={`bg-[#111113]/40 border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between group transition-all ${
                                        todo.completed ? 'opacity-40 border-transparent bg-transparent' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <button
                                            onClick={() => toggleTodo(todo.id)}
                                            className="w-4.5 h-4.5 rounded-full border border-white/20 flex items-center justify-center shrink-0 hover:border-[var(--accent)] hover:bg-white/2 transition-all cursor-pointer"
                                        >
                                            {todo.completed && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                                        </button>
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot}`} />
                                        <span className={`text-[12px] font-medium leading-normal truncate ${todo.completed ? 'line-through text-white/30' : 'text-white/90'}`}>
                                            {todo.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                        <span className="text-[10px] text-white/35 font-mono select-none">
                                            {formatTime(todo.createdAt)}
                                        </span>
                                        <div className="relative group/menu">
                                            <button
                                                className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">more_horiz</span>
                                            </button>
                                            {/* Dropdown Menu on Hover */}
                                            <div className="absolute right-0 top-5 bg-[#18181b] border border-white/10 rounded-lg shadow-xl py-1 w-20 hidden group-hover/menu:block hover:block z-10">
                                                <button
                                                    onClick={() => deleteTodo(todo.id)}
                                                    className="w-full text-left px-2.5 py-1 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">delete</span>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Input */}
                <form onSubmit={handleAdd} className="p-4 border-t border-white/5 shrink-0 bg-[#0c0c0e]/30">
                    <div className="flex items-center justify-between mb-2 px-0.5 select-none relative">
                        <span className="text-[10.5px] font-bold text-white/45">Quick Add</span>
                        
                        {/* Priority Selector dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                                className="text-[10.5px] font-bold flex items-center gap-1 cursor-pointer select-none text-white/45 hover:text-white/70"
                            >
                                Priority: <span className="text-[var(--accent)] font-extrabold capitalize">{priority}</span>
                                <span className="material-symbols-outlined text-[12px] leading-none">keyboard_arrow_down</span>
                            </button>
                            {showPriorityDropdown && (
                                <div className="absolute right-0 bottom-6 bg-[#18181b] border border-white/10 rounded-lg shadow-xl py-1 w-24 z-20">
                                    {(['low', 'medium', 'high'] as const).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => {
                                                setPriority(p);
                                                setShowPriorityDropdown(false);
                                            }}
                                            className={`w-full text-left px-2.5 py-1 text-[10px] transition-colors flex items-center gap-1.5 cursor-pointer font-semibold capitalize ${
                                                priority === p ? 'text-[var(--accent)] bg-white/5' : 'text-white/60 hover:bg-white/5'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                p === 'high' ? 'bg-red-400' : p === 'medium' ? 'bg-amber-400' : 'bg-gray-400'
                                            }`} />
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Box Card */}
                    <div className="relative bg-[#111113]/55 border border-white/8 focus-within:border-white/15 focus-within:bg-[#111113] rounded-xl px-3.5 py-2 flex items-center justify-between transition-all">
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder="Add a new task..."
                            className="w-full bg-transparent border-0 outline-none text-[12px] text-white placeholder:text-white/20 p-0 ring-0 focus:ring-0 leading-normal"
                        />
                        <button
                            type="submit"
                            disabled={!newTask.trim()}
                            className="w-6 h-6 flex items-center justify-center rounded text-[var(--accent)] hover:text-orange-300 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[17px] font-black">arrow_upward</span>
                        </button>
                    </div>
                </form>
            </div>
        </ToolCard>
    );
};

export default TodoTool;
