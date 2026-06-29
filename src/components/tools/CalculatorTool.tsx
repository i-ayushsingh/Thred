import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { ToolCard } from './ToolCard';
import { useT } from '../../i18n/context';
import { VaultItem, CalculationItem } from '../../shared/vault-schema';

interface HistoryItem {
    expression: string;
    result: string;
    timestamp: string;
}

const STANDARD_BUTTONS = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '=']];

const SCIENTIFIC_BUTTONS = [
    ['sin', 'cos', 'tan', '^'],
    ['ln', 'log', '√', 'fact'],
    ['π', 'e', '(', ')'],
    ['abs', '1/x', 'ans', 'rand']];

const CalculatorTool: React.FC = () => {
    const {  toolWindows, minimizeToolWindow, closeToolWindow  } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, minimizeToolWindow: state.minimizeToolWindow, closeToolWindow: state.closeToolWindow })));
    const tw = toolWindows.find(t => t.id === 'calculator');
    if (!tw) return null;

    return <CalcInner
        minimized={tw.minimized}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'calculator')}
    />;
};

const CalcInner: React.FC<{
    minimized: boolean;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    index: number;
}> = ({ minimized, minimizeToolWindow, closeToolWindow, index }) => {
    const t = useT();
    const {  vaultItems, addVaultItem, deleteVaultItem  } = useStore(useShallow(state => ({ vaultItems: state.vaultItems, addVaultItem: state.addVaultItem, deleteVaultItem: state.deleteVaultItem })));
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [isScientific, setIsScientific] = useState(false);
    const [isDeg, setIsDeg] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [lastAnswer, setLastAnswer] = useState('0');

    // Load history from vault items
    useEffect(() => {
        const calcItems = vaultItems.filter((i): i is CalculationItem => i.kind === 'calculation');
        setHistory(calcItems.map((i) => ({
            expression: i.expression || '',
            result: i.result || '',
            timestamp: i.updatedAt || ''})));
        const ans = localStorage.getItem('thred_calc_ans');
        if (ans) setLastAnswer(ans);
    }, [vaultItems]);

    // Save history to vault
    const saveToHistory = async (expr: string, res: string) => {
        const newItem: HistoryItem = {
            expression: expr,
            result: res,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updated = [newItem, ...history].slice(0, 10);
        setHistory(updated);

        const vaultCalcItems = vaultItems.filter(i => i.kind === 'calculation');
        for (const item of vaultCalcItems) {
            await deleteVaultItem(item.id, 'Calculations');
        }
        for (const h of updated) {
            const vaultItem: VaultItem = {
                id: 'calc-' + Math.random().toString(36).substring(7),
                kind: 'calculation',
                category: 'Calculations',
                title: h.expression,
                expression: h.expression,
                result: h.result,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()};
            await addVaultItem(vaultItem);
        }

        setLastAnswer(res);
        localStorage.setItem('thred_calc_ans', res);
    };

    const clearHistory = async () => {
        setHistory([]);
        const vaultCalcItems = vaultItems.filter(i => i.kind === 'calculation');
        for (const item of vaultCalcItems) {
            await deleteVaultItem(item.id, 'Calculations');
        }
    };

    // Factorial helper
    const factorial = (n: number): number => {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let r = 1;
        for (let i = 2; i <= Math.min(n, 100); i++) r *= i;
        return r;
    };

    // Safe expression evaluator — tokenizer + shunting-yard (no eval / new Function).
    const evaluate = (expr: string): string => {
        try {
            const norm = expr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-')
                .replace(/√/g, 'sqrt')
                .replace(/\^/g, '**')
                .replace(/π/g, 'PI');

            const FUNCS: Record<string, (x: number) => number> = {
                sin: (x) => Math.sin(isDeg ? (x * Math.PI) / 180 : x),
                cos: (x) => Math.cos(isDeg ? (x * Math.PI) / 180 : x),
                tan: (x) => Math.tan(isDeg ? (x * Math.PI) / 180 : x),
                log: (x) => Math.log10(x),
                ln: (x) => Math.log(x),
                sqrt: (x) => Math.sqrt(x),
                fact: (x) => factorial(x),
                abs: (x) => Math.abs(x)};
            const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

            type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: 'paren'; v: '(' | ')' };
            const tokens: Tok[] = [];
            let i = 0;
            const s = norm;
            const isDigit = (c: string) => c >= '0' && c <= '9';
            while (i < s.length) {
                const c = s[i];
                if (c === ' ') { i++; continue; }
                // number (supports decimals and scientific notation: 1e3, 2.5e-2)
                if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
                    let j = i + 1;
                    while (j < s.length && (isDigit(s[j]) || s[j] === '.')) j++;
                    if (s[j] === 'e' || s[j] === 'E') {
                        let k = j + 1;
                        if (s[k] === '+' || s[k] === '-') k++;
                        if (isDigit(s[k])) { k++; while (k < s.length && isDigit(s[k])) k++; j = k; }
                    }
                    tokens.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
                    i = j;
                    continue;
                }
                // identifier (function or constant)
                if (/[a-zA-Z]/.test(c)) {
                    let j = i + 1;
                    while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
                    const name = s.slice(i, j);
                    if (FUNCS[name]) tokens.push({ t: 'fn', v: name });
                    else if (name.toLowerCase() in CONSTS) tokens.push({ t: 'num', v: CONSTS[name.toLowerCase()] });
                    else throw new Error('Unknown identifier: ' + name);
                    i = j;
                    continue;
                }
                // power operator **
                if (c === '*' && s[i + 1] === '*') { tokens.push({ t: 'op', v: '**' }); i += 2; continue; }
                if ('+-*/'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
                if (c === '(' || c === ')') { tokens.push({ t: 'paren', v: c }); i++; continue; }
                throw new Error('Unexpected char: ' + c);
            }

            // Shunting-yard to RPN, with unary minus handling.
            const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '**': 4, 'u-': 3 };
            const rightAssoc = (op: string) => op === '**' || op === 'u-';
            const output: Tok[] = [];
            const ops: Tok[] = [];
            let prev: Tok | null = null;
            for (const tok of tokens) {
                if (tok.t === 'num') output.push(tok);
                else if (tok.t === 'fn') ops.push(tok);
                else if (tok.t === 'op') {
                    let op = tok.v;
                    const unary = (op === '-' || op === '+') && (!prev || (prev.t === 'op') || (prev.t === 'paren' && prev.v === '('));
                    if (unary) { if (op === '+') { prev = tok; continue; } op = 'u-'; }
                    while (ops.length) {
                        const top = ops[ops.length - 1];
                        if (top.t === 'fn') { output.push(ops.pop()!); continue; }
                        if (top.t === 'op') {
                            const pTop = prec[top.v], pCur = prec[op];
                            if (pTop > pCur || (pTop === pCur && !rightAssoc(op))) { output.push(ops.pop()!); continue; }
                        }
                        break;
                    }
                    ops.push({ t: 'op', v: op });
                } else if (tok.v === '(') ops.push(tok);
                else {
                    while (ops.length && !(ops[ops.length - 1].t === 'paren' && (ops[ops.length - 1] as any).v === '(')) output.push(ops.pop()!);
                    if (!ops.length) throw new Error('Mismatched parens');
                    ops.pop();
                    if (ops.length && ops[ops.length - 1].t === 'fn') output.push(ops.pop()!);
                }
                prev = tok;
            }
            while (ops.length) {
                const top = ops.pop()!;
                if (top.t === 'paren') throw new Error('Mismatched parens');
                output.push(top);
            }

            // Evaluate RPN.
            const st: number[] = [];
            for (const tok of output) {
                if (tok.t === 'num') st.push(tok.v);
                else if (tok.t === 'fn') { const a = st.pop(); if (a === undefined) throw new Error('bad'); st.push(FUNCS[tok.v](a)); }
                else if (tok.t === 'op') {
                    if (tok.v === 'u-') { const a = st.pop(); if (a === undefined) throw new Error('bad'); st.push(-a); continue; }
                    const b = st.pop(), a = st.pop();
                    if (a === undefined || b === undefined) throw new Error('bad');
                    st.push(tok.v === '+' ? a + b : tok.v === '-' ? a - b : tok.v === '*' ? a * b : tok.v === '/' ? a / b : Math.pow(a, b));
                }
            }
            const result = st.length === 1 ? st[0] : NaN;

            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                return 'Error';
            }

            // Limit decimal precision nicely
            const formatted = parseFloat(result.toPrecision(10));
            return String(formatted);
        } catch (e) {
            return 'Error';
        }
    };

    // Handle standard calculator state machines (for pocket mode) vs expression building (for scientific)
    const [standardState, setStandardState] = useState<{
        prevValue: number | null;
        operator: string | null;
        waitingForOperand: boolean;
    }>({
        prevValue: null,
        operator: null,
        waitingForOperand: false
    });

    const handleStandardButton = (btn: string) => {
        if (btn === 'C') {
            setDisplay('0');
            setExpression('');
            setStandardState({ prevValue: null, operator: null, waitingForOperand: false });
            return;
        }

        if (btn === '⌫') {
            if (display.length > 1) {
                setDisplay(display.slice(0, -1));
            } else {
                setDisplay('0');
            }
            return;
        }

        if (btn === '±') {
            const val = parseFloat(display);
            setDisplay(String(val * -1));
            return;
        }

        if (btn === '%') {
            const val = parseFloat(display);
            setDisplay(String(val / 100));
            return;
        }

        if (btn >= '0' && btn <= '9') {
            if (standardState.waitingForOperand || display === '0') {
                setDisplay(btn);
                setStandardState(prev => ({ ...prev, waitingForOperand: false }));
            } else {
                setDisplay(display + btn);
            }
            return;
        }

        if (btn === '.') {
            if (standardState.waitingForOperand) {
                setDisplay('0.');
                setStandardState(prev => ({ ...prev, waitingForOperand: false }));
            } else if (!display.includes('.')) {
                setDisplay(display + '.');
            }
            return;
        }

        // Operators
        const current = parseFloat(display);
        const nextOp = btn;

        if (standardState.prevValue !== null && standardState.operator && !standardState.waitingForOperand) {
            let result = current;
            switch (standardState.operator) {
                case '+': result = standardState.prevValue + current; break;
                case '−': result = standardState.prevValue - current; break;
                case '×': result = standardState.prevValue * current; break;
                case '÷': result = current !== 0 ? standardState.prevValue / current : 0; break;
            }
            const formatted = parseFloat(result.toPrecision(10));
            setDisplay(String(formatted));
            
            if (nextOp === '=') {
                saveToHistory(`${standardState.prevValue} ${standardState.operator} ${current}`, String(formatted));
                setExpression('');
                setStandardState({ prevValue: null, operator: null, waitingForOperand: true });
            } else {
                setExpression(`${formatted} ${nextOp}`);
                setStandardState({ prevValue: formatted, operator: nextOp, waitingForOperand: true });
            }
        } else {
            if (nextOp !== '=') {
                setExpression(`${current} ${nextOp}`);
                setStandardState({ prevValue: current, operator: nextOp, waitingForOperand: true });
            }
        }
    };

    const handleScientificButton = (btn: string) => {
        if (btn === 'C') {
            setDisplay('0');
            return;
        }

        if (btn === '⌫') {
            if (display.length > 1) {
                setDisplay(display.slice(0, -1));
            } else {
                setDisplay('0');
            }
            return;
        }

        if (btn === '=') {
            if (display === '0') return;
            const res = evaluate(display);
            if (res !== 'Error') {
                saveToHistory(display, res);
            }
            setDisplay(res);
            return;
        }

        if (btn === '±') {
            if (display !== '0' && !display.startsWith('-')) {
                setDisplay('-' + display);
            } else if (display.startsWith('-')) {
                setDisplay(display.slice(1));
            }
            return;
        }

        if (btn === '%') {
            setDisplay(display + '/100');
            return;
        }

        // Handle specific scientific text inserts
        let toInsert = btn;
        if (['sin', 'cos', 'tan', 'log', 'ln', 'fact', 'abs'].includes(btn)) {
            toInsert = `${btn}(`;
        } else if (btn === '1/x') {
            toInsert = '1/(';
        } else if (btn === 'ans') {
            toInsert = lastAnswer;
        } else if (btn === 'rand') {
            toInsert = Math.random().toFixed(4);
        }

        // Clean initial '0' unless adding standard decimal/operator
        if (display === '0' && !['+', '−', '×', '÷', '^', '.', ')'].includes(btn)) {
            setDisplay(toInsert);
        } else {
            setDisplay(display + toInsert);
        }
    };

    const handleButton = (btn: string) => {
        if (isScientific) {
            handleScientificButton(btn);
        } else {
            handleStandardButton(btn);
        }
    };

    const getButtonStyle = (btn: string) => {
        if (btn === '=') return 'bg-[var(--accent)] text-black font-semibold shadow-[0_0_12px_rgba(var(--accent-rgb),0.3)] hover:opacity-90';
        if (['÷', '×', '−', '+', '^'].includes(btn)) return 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] text-[var(--accent)] font-semibold hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]';
        if (['C', '±', '%', '⌫'].includes(btn)) return 'bg-[var(--bg-active)] border border-[var(--border-primary)] text-white/75 hover:bg-[var(--bg-hover)] hover:text-white';
        if (['sin', 'cos', 'tan', 'ln', 'log', '√', 'fact', 'π', 'e', '(', ')', 'abs', '1/x', 'ans', 'rand'].includes(btn)) {
            return 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-white/80 text-[13px] font-medium hover:bg-[var(--bg-hover)] hover:text-white';
        }
        return 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-white hover:bg-[var(--bg-hover)]';
    };

    return (
        <ToolCard
            toolId="calculator"
            title={t('tools.calculator.title')}
            icon={<span className="material-symbols-outlined text-[18px] select-none" style={{ color: 'var(--accent)' }}>calculate</span>}
            width={isScientific ? 520 : 280}
            height={390}
            isMinimized={minimized}
            onClose={() => closeToolWindow('calculator')}
            onMinimize={() => minimizeToolWindow('calculator')}
            index={index}
        >
            <div className="flex flex-col flex-1 min-h-0 w-full h-full relative select-none">
                {/* Mode controls bar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[11px] shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsScientific(!isScientific)}
                            className={`px-2 py-0.5 rounded transition-all font-semibold ${isScientific ? 'bg-[var(--accent)] text-black' : 'text-white/60 hover:text-white bg-[var(--bg-active)] border border-[var(--border-primary)]'}`}
                        >
                            {t('tools.calculator.scientific')}
                        </button>
                        {isScientific && (
                            <button
                                onClick={() => setIsDeg(!isDeg)}
                                className="px-2 py-0.5 rounded bg-[var(--bg-active)] border border-[var(--border-primary)] text-white/70 hover:text-white font-semibold transition-all"
                            >
                                {isDeg ? 'DEG' : 'RAD'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-all ${showHistory ? 'text-[var(--accent)]' : 'text-white/60'}`}
                        title={t('tools.calculator.history')}
                    >
                        <span className="material-symbols-outlined text-[16px] block">history</span>
                    </button>
                </div>

                {/* Display */}
                <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] shrink-0">
                    <div className="text-[11px] text-white/30 text-right h-4 mb-1 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                        {!isScientific ? expression : t('tools.calculator.expressionBuilder')}
                    </div>
                    <div className="text-[28px] font-light text-white text-right font-mono leading-none overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none py-1">
                        {display}
                    </div>
                </div>

                {/* Main keypad grid */}
                <div className="flex-1 p-2 flex gap-2 min-h-0 bg-[var(--bg-primary)]">
                    {/* Scientific Keys Column Block */}
                    {isScientific && (
                        <div className="w-[220px] grid grid-cols-4 gap-1.5 shrink-0">
                            {SCIENTIFIC_BUTTONS.flat().map(btn => (
                                <button
                                    key={btn}
                                    onClick={() => handleButton(btn)}
                                    className={`rounded-lg text-[13px] font-medium transition-all active:scale-95 flex items-center justify-center ${getButtonStyle(btn)}`}
                                >
                                    {btn}
                                </button>
                            ))}
                            {/* Empty/placeholder slots in bottom row if any */}
                            <div className="rounded-lg text-[11px] text-white/20 border border-dashed border-[var(--border-primary)] flex items-center justify-center select-none font-mono">
                                rad
                            </div>
                            <div className="rounded-lg text-[11px] text-white/20 border border-dashed border-[var(--border-primary)] flex items-center justify-center select-none font-mono">
                                deg
                            </div>
                            <div className="rounded-lg text-[11px] text-white/20 border border-dashed border-[var(--border-primary)] flex items-center justify-center select-none font-mono">
                                ans
                            </div>
                            <div className="rounded-lg text-[11px] text-white/20 border border-dashed border-[var(--border-primary)] flex items-center justify-center select-none font-mono">
                                rand
                            </div>
                        </div>
                    )}

                    {/* Standard Keys Column Block */}
                    <div className="flex-1 grid grid-rows-5 gap-1.5">
                        {STANDARD_BUTTONS.map((row, ri) => (
                            <div key={ri} className="grid grid-cols-4 gap-1.5">
                                {row.map(btn => (
                                    <button
                                        key={btn}
                                        onClick={() => handleButton(btn)}
                                        className={`rounded-lg text-[15px] font-medium transition-all active:scale-95 flex items-center justify-center h-full ${getButtonStyle(btn)}`}
                                    >
                                        {btn}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Slide-out History Drawer */}
                {showHistory && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-30 flex flex-col transition-all duration-300">
                        <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                            <span className="text-xs font-semibold text-white/90">{t('tools.calculator.historyLog')}</span>
                            <div className="flex items-center gap-2">
                                {history.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded hover:bg-red-500/10 transition-all"
                                    >
                                        {t('tools.calculator.clearAll')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="p-1 rounded text-white/60 hover:text-white hover:bg-[var(--bg-hover)] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px] block">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs">
                                    <span className="material-symbols-outlined text-[24px] mb-1">history</span>
                                    {t('tools.calculator.noCalculations')}
                                </div>
                            ) : (
                                history.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setDisplay(item.result);
                                            setShowHistory(false);
                                        }}
                                        className="w-full text-left p-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] transition-all group active:scale-[0.99]"
                                    >
                                        <div className="text-[10px] text-white/40 flex justify-between">
                                            <span className="font-mono text-ellipsis overflow-hidden whitespace-nowrap max-w-[80%]">{item.expression}</span>
                                            <span>{item.timestamp}</span>
                                        </div>
                                        <div className="text-sm font-semibold text-[var(--accent)] mt-0.5 font-mono text-right">
                                            {item.result}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ToolCard>
    );
};

export default CalculatorTool;
